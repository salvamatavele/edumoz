"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createTimeSlotSchema,
  type CreateTimeSlotInput,
} from "@/features/academic/domain/academic-structure-schema";
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
 * Cria um tempo lectivo, associado ao ano lectivo activo — nunca escolhido pelo cliente,
 * mesmo tratamento que `createClassGroup` já dá a `academicYearId`.
 */
export async function createTimeSlot(
  values: CreateTimeSlotInput,
): Promise<FormActionResult<CreateTimeSlotInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createTimeSlotSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateTimeSlotInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateTimeSlotInput;
      fieldErrors[field] = t(`academic.timeSlots.errors.${field}`);
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
    return { status: "error", message: t("academic.timeSlots.errors.noActiveYear") };
  }

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.timeSlot.create({
        data: { schoolId, academicYearId: academicYear.id, ...parsed.data },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "timeSlot.create",
          entity: "TimeSlot",
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
        fieldErrors: { startTime: t("academic.timeSlots.errors.duplicate") },
      };
    }

    throw error;
  }
}
