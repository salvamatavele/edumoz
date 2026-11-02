"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createFeeScheduleSchema,
  type CreateFeeScheduleInput,
} from "@/features/finance/domain/fee-schedule-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/** Cria uma tabela de propinas, associada ao ano lectivo activo. */
export async function createFeeSchedule(
  values: CreateFeeScheduleInput,
): Promise<FormActionResult<CreateFeeScheduleInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createFeeScheduleSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateFeeScheduleInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateFeeScheduleInput;
      fieldErrors[field] = t(`finance.feeSchedules.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) {
    return { status: "error", message: t("finance.feeSchedules.errors.noActiveYear") };
  }

  await db.$transaction(async (tx) => {
    const created = await tx.feeSchedule.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: data.name,
        gradeLevelId: data.gradeLevelId && data.gradeLevelId !== "none" ? data.gradeLevelId : null,
        studyPathId: data.studyPathId && data.studyPathId !== "none" ? data.studyPathId : null,
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "feeSchedule.create",
        entity: "FeeSchedule",
        entityId: created.id,
        after: JSON.parse(JSON.stringify(created)),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
