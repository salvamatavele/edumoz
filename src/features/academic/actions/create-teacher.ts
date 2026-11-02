"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createTeacherSchema,
  type CreateTeacherInput,
} from "@/features/academic/domain/teaching-staff-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Create a teacher profile without account access. The identity administration flow
 * verifies and links an existing account separately; userId is never accepted here.
 */
export async function createTeacher(
  values: CreateTeacherInput,
): Promise<FormActionResult<CreateTeacherInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "teaching-staff", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createTeacherSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateTeacherInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateTeacherInput;
      fieldErrors[field] = t(`teachingStaff.teachers.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.teacher.create({
        data: {
          schoolId,
          code: parsed.data.code,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          qualification: parsed.data.qualification || null,
          maxWeeklyHours: parsed.data.maxWeeklyHours ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "teacher.create",
          entity: "Teacher",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/teachers" }));
    }

    return { status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return {
        status: "error",
        fieldErrors: { code: t("teachingStaff.teachers.errors.duplicateCode") },
      };
    }

    throw error;
  }
}
