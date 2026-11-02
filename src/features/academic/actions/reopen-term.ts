"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { reopenTermSchema, type ReopenTermInput, type CloseTermActionResult } from "@/features/academic/domain/term-closing-schema";
import { requireTermState, TermMutationError } from "@/features/academic/data/term-mutations";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function reopenTerm(values: ReopenTermInput): Promise<CloseTermActionResult> {
  const t = await getTranslations();
  const session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "term-closing", "edit")) return { status: "error", message: t("common.forbidden") };
  const parsed = reopenTermSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: t("termClosing.errors.reason") };
  const schoolId = session.schoolId;
  const db = getTenantDb(schoolId);
  let resultCount = 0;
  try {
    await db.$transaction(async (tx) => {
      await requireTermState(tx, parsed.data.termId, "CLOSED");
      const term = await tx.term.findUniqueOrThrow({ where: { id: parsed.data.termId }, select: { closedAt: true, closedById: true, revision: true } });
      const results = await tx.termResult.findMany({ where: { termId: parsed.data.termId } });
      resultCount = results.length;
      // One bounded audit row per result preserves previous formula/value snapshots.
      for (let offset = 0; offset < results.length; offset += 500) {
        await tx.auditLog.createMany({ data: results.slice(offset, offset + 500).map(result => ({
          schoolId, actorUserId: session.user.id, action: "term.reopen.resultSnapshot", entity: "TermResult", entityId: result.id,
          before: JSON.parse(JSON.stringify(result)), after: { termRevision: term.revision },
        })) });
      }
      await tx.term.update({ where: { id: parsed.data.termId }, data: { status: "OPEN", closedAt: null, closedById: null } });
      await tx.auditLog.create({ data: {
        schoolId, actorUserId: session.user.id, action: "term.reopen", entity: "Term", entityId: parsed.data.termId,
        before: JSON.parse(JSON.stringify({ status: "CLOSED", ...term })), after: { status: "OPEN", reason: parsed.data.reason, resultCount },
      } });
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof TermMutationError) return { status: "error", message: t(error.code === "already-open" ? "termClosing.errors.alreadyOpen" : "termClosing.errors.notFound") };
    throw error;
  }
  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/assessment" }));
    revalidatePath(getPathname({ locale, href: "/report-cards" }));
    revalidatePath(getPathname({ locale, href: "/grades" }));
    revalidatePath(getPathname({ locale, href: "/portal" }));
  }
  return { status: "success", resultCount };
}
