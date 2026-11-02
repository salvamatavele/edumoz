"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createCurriculumSubjectSchema,
  type CreateCurriculumSubjectInput,
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

/** Associa uma disciplina a um percurso. Depende de `StudyPath` + `Subject`. */
export async function createCurriculumSubject(
  values: CreateCurriculumSubjectInput,
): Promise<FormActionResult<CreateCurriculumSubjectInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "academic-structure", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createCurriculumSubjectSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateCurriculumSubjectInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateCurriculumSubjectInput;
      fieldErrors[field] = t(`academic.curriculumSubjects.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.curriculumSubject.create({
        data: {
          schoolId,
          studyPathId: parsed.data.studyPathId,
          subjectId: parsed.data.subjectId,
          scope: parsed.data.scope,
          weeklyHours: parsed.data.weeklyHours,
          coefficient: parsed.data.coefficient,
          isExamSubject: parsed.data.isExamSubject,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "curriculumSubject.create",
          entity: "CurriculumSubject",
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
    // O índice único é `(studyPathId, subjectId)` — a disciplina já está associada a este
    // percurso. O erro fica no campo da disciplina, tal como a spec pede, não numa
    // mensagem genérica solta no topo.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return {
        status: "error",
        fieldErrors: {
          subjectId: t("academic.curriculumSubjects.errors.duplicate"),
        },
      };
    }

    throw error;
  }
}
