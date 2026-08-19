"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createStudentSchema,
  type CreateStudentInput,
} from "@/features/academic/domain/student-schema";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Cria um aluno. Molde dos módulos seguintes — ver docs/specs/pending-fixes.md §3.2.
 *
 * A ordem importa: autorização, depois validação, depois escrita. Validar antes de
 * autorizar deixaria alguém sem permissão descobrir, pelas mensagens de erro, que campos
 * o esquema exige.
 */
export async function createStudent(
  values: CreateStudentInput,
): Promise<FormActionResult<CreateStudentInput>> {
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

  const parsed = createStudentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateStudentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateStudentInput;
      fieldErrors[field] = t(`students.form.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: { schoolId, ...parsed.data, phone: parsed.data.phone || null },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "student.create",
          entity: "Student",
          entityId: created.id,
          // `Json` não aceita `Date` directamente — os campos de data do aluno criado
          // precisam de passar primeiro por uma volta a string.
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/students" }));
    }

    return { status: "success" };
  } catch (error) {
    // "já existe um aluno com este número" só se sabe consultando a base de dados — é isto
    // que justifica o canal `fieldErrors` em vez de uma mensagem geral no topo.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return {
        status: "error",
        fieldErrors: { code: t("students.form.errors.duplicateCode") },
      };
    }

    throw error;
  }
}
