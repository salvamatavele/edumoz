"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createTeachingGroupSchema,
  type CreateTeachingGroupInput,
} from "@/features/academic/domain/teaching-staff-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Atribui um professor a uma disciplina (e, consoante o âmbito, a uma turma). Depende de
 * `Subject` + `Teacher` + ano lectivo activo. A atribuição fica válida mesmo que o
 * `Teacher` não tenha `userId` — só a marcação de presenças por esse professor específico
 * fica bloqueada até haver login (ver docs/specs/attendance.md).
 */
export async function createTeachingGroup(
  values: CreateTeachingGroupInput,
): Promise<FormActionResult<CreateTeachingGroupInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "teaching-staff", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createTeachingGroupSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateTeachingGroupInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateTeachingGroupInput;
      fieldErrors[field] = t(`teachingStaff.teachingGroups.errors.${field}`);
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
    return {
      status: "error",
      message: t("teachingStaff.teachingGroups.errors.noActiveYear"),
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.teachingGroup.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          name: parsed.data.name,
          subjectId: parsed.data.subjectId,
          teacherId: parsed.data.teacherId,
          classGroupId:
            parsed.data.classGroupId && parsed.data.classGroupId !== "none"
              ? parsed.data.classGroupId
              : null,
          scope: parsed.data.scope,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "teachingGroup.create",
          entity: "TeachingGroup",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/teachers" }));
    }

    return { status: "success" };
  } catch {
    return {
      status: "error",
      message: t("teachingStaff.teachingGroups.errors.generic"),
    };
  }
}
