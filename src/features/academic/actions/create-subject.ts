"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createSubjectSchema,
  type CreateSubjectInput,
} from "@/features/academic/domain/academic-structure-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/** Cria uma disciplina. Sem dependências de outras entidades. */
export async function createSubject(
  values: CreateSubjectInput,
): Promise<FormActionResult<CreateSubjectInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "academic-structure", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createSubjectSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateSubjectInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateSubjectInput;
      fieldErrors[field] = t(`academic.subjects.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.subject.create({
        data: {
          schoolId,
          code: parsed.data.code,
          name: parsed.data.name,
          shortName: parsed.data.shortName || null,
          area: parsed.data.area || null,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "subject.create",
          entity: "Subject",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/academic" }));
    }

    return { status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return {
        status: "error",
        fieldErrors: { code: t("academic.subjects.errors.duplicateCode") },
      };
    }

    throw error;
  }
}
