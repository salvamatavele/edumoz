"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createStudyPathSchema,
  type CreateStudyPathInput,
} from "@/features/academic/domain/academic-structure-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Cria um percurso (classe + secção, num ano lectivo). `code` nunca vem do cliente —
 * gera-se aqui a partir dos códigos de `GradeLevel`/`Section`, tal como o comentário em
 * `schema.prisma` descreve, porque é este código que garante a unicidade real (o
 * `sectionId` nulável não é fiável num índice único em MySQL).
 */
export async function createStudyPath(
  values: CreateStudyPathInput,
): Promise<FormActionResult<CreateStudyPathInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "academic-structure", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createStudyPathSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateStudyPathInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateStudyPathInput;
      fieldErrors[field] = t(`academic.studyPaths.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) {
    return { status: "error", message: t("academic.studyPaths.errors.noActiveYear") };
  }

  const sectionId = parsed.data.sectionId && parsed.data.sectionId !== "none" ? parsed.data.sectionId : null;

  const [gradeLevel, section] = await Promise.all([
    db.gradeLevel.findUnique({ where: { id: parsed.data.gradeLevelId }, select: { code: true } }),
    sectionId
      ? db.section.findUnique({ where: { id: sectionId }, select: { code: true } })
      : Promise.resolve(null),
  ]);

  if (!gradeLevel) {
    return {
      status: "error",
      fieldErrors: { gradeLevelId: t("academic.studyPaths.errors.gradeLevelId") },
    };
  }

  const code = section ? `${gradeLevel.code}-${section.code}` : gradeLevel.code;

  const existing = await db.studyPath.findFirst({
    where: { academicYearId: academicYear.id, code },
    select: { id: true },
  });

  if (existing) {
    return { status: "error", message: t("academic.studyPaths.errors.duplicate") };
  }

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.studyPath.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          gradeLevelId: parsed.data.gradeLevelId,
          sectionId,
          code,
          name: parsed.data.name,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "studyPath.create",
          entity: "StudyPath",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/academic" }));
    }

    return { status: "success" };
  } catch {
    return { status: "error", message: t("academic.studyPaths.errors.duplicate") };
  }
}
