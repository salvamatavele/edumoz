"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  enrollStudentSchema,
  type EnrollStudentInput,
} from "@/features/academic/domain/enrollment-schema";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION, uniqueConstraintTarget } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Matricula um aluno já existente no ano lectivo activo. Segue o molde de
 * `create-student.ts` — ver openspec/changes/enrollment-screen/design.md.
 *
 * `academicYearId` nunca vem do cliente: resolve-se aqui, contra o ano activo da escola,
 * pela mesma razão que `create-student` resolve `schoolId` a partir da sessão em vez do
 * formulário — um ano fechado entre o modal abrir e submeter não deve poder ser escolhido.
 */
export async function enrollStudent(
  values: EnrollStudentInput,
): Promise<FormActionResult<EnrollStudentInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("students.form.errors.forbidden") };
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    return { status: "error", message: t("students.form.errors.forbidden") };
  }

  const parsed = enrollStudentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EnrollStudentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof EnrollStudentInput;
      fieldErrors[field] = t(`students.enroll.errors.${field}`);
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
    return { status: "error", message: t("students.enroll.errors.noActiveYear") };
  }

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.enrollment.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          studentId: parsed.data.studentId,
          classGroupId: parsed.data.classGroupId,
          studyPathId: parsed.data.studyPathId,
          number: parsed.data.number,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "enrollment.create",
          entity: "Enrollment",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/students" }));
    }

    return { status: "success" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
      // O nome do índice diz qual das duas restrições falhou: número repetido no ano, ou
      // este aluno já matriculado no mesmo ano. Só a primeira é culpa de um campo do
      // formulário — a segunda é sobre a acção em si, não sobre o que foi escrito nela.
      const target = uniqueConstraintTarget(error);

      if (target.includes("number")) {
        return {
          status: "error",
          fieldErrors: { number: t("students.enroll.errors.duplicateNumber") },
        };
      }

      return { status: "error", message: t("students.enroll.errors.alreadyEnrolled") };
    }

    throw error;
  }
}
