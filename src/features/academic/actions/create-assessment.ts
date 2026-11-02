"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
import { resolveTeachingGroupScheme } from "@/features/academic/data/grades";
import {
  createAssessmentSchema,
  type CreateAssessmentInput,
} from "@/features/academic/domain/assessment-entry-schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { requireTermState, TermMutationError } from "@/features/academic/data/term-mutations";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Cria uma avaliação concreta (um teste, um trabalho) dentro de um componente do esquema
 * aplicável ao agrupamento. Autorização por posse do `TeachingGroup`, como
 * `submit-attendance.ts` — não `isSchoolAdministrator`: criar uma avaliação é acto de sala
 * de aula.
 */
export async function createAssessment(
  values: CreateAssessmentInput,
): Promise<FormActionResult<CreateAssessmentInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const { schoolId } = session;
  const teacher = await findTeacherByUserId(schoolId, session.user.id);

  if (!teacher) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createAssessmentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateAssessmentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateAssessmentInput;
      fieldErrors[field] = t(`gradeEntry.create.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const db = getTenantDb(schoolId);

  const teachingGroup = await db.teachingGroup.findUnique({
    where: { id: parsed.data.teachingGroupId },
    select: { teacherId: true },
  });

  if (!teachingGroup || teachingGroup.teacherId !== teacher.id) {
    return { status: "error", message: t("common.forbidden") };
  }

  // O `componentId` tem de pertencer ao esquema resolvido para este agrupamento — nunca
  // confiar num componente de outro esquema vindo do cliente.
  const scheme = await resolveTeachingGroupScheme(schoolId, parsed.data.teachingGroupId);
  const componentExists = scheme?.components.some((component) => component.id === parsed.data.componentId);

  if (!scheme || !componentExists) {
    return {
      status: "error",
      fieldErrors: { componentId: t("gradeEntry.create.errors.componentId") },
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await requireTermState(tx, parsed.data.termId, "OPEN");
      const [currentGroup, currentTerm] = await Promise.all([
        tx.teachingGroup.findUnique({ where: { id: parsed.data.teachingGroupId }, select: { teacherId: true, academicYearId: true } }),
        tx.term.findUnique({ where: { id: parsed.data.termId }, select: { academicYearId: true } }),
      ]);
      if (!currentGroup || currentGroup.teacherId !== teacher.id) throw new TermMutationError("forbidden");
      if (!currentTerm || currentTerm.academicYearId !== currentGroup.academicYearId) throw new TermMutationError("invalid");
      const created = await tx.assessment.create({
        data: {
          schoolId,
          teachingGroupId: parsed.data.teachingGroupId,
          termId: parsed.data.termId,
          componentId: parsed.data.componentId,
          name: parsed.data.name,
          maxScore: parsed.data.maxScore,
          weight: parsed.data.weight,
          date: parsed.data.date,
          createdById: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "assessment.create",
          entity: "Assessment",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof TermMutationError) return { status: "error", message: t(error.code === "forbidden" ? "common.forbidden" : error.code === "closed" ? "gradeEntry.errors.termClosed" : "gradeEntry.errors.invalid") };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/grades" }));
  }

  return { status: "success" };
}
