"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  generateInvoicesSchema,
  type GenerateInvoicesInput,
  type GenerateInvoicesResult,
} from "@/features/finance/domain/invoice-schema";
import { suggestInvoiceReference } from "@/features/finance/domain/invoice-reference";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { sum } from "@/features/shared/domain/numeric";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

const DEFAULT_DUE_DAY = 10;

/**
 * Gera facturas em lote para uma tabela de propinas, num período. Idempotente por
 * `(enrollmentId, feeScheduleId, período)` — uma matrícula que já tenha factura para
 * este período é saltada, nunca duplicada; correr esta acção duas vezes dá o mesmo
 * resultado que correr uma vez. Ver design.md.
 */
export async function generateInvoices(
  values: GenerateInvoicesInput,
): Promise<GenerateInvoicesResult> {
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

  const parsed = generateInvoicesSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("finance.invoicing.errors.invalid") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;
  const periodMonth = data.periodMonth ?? null;

  const feeSchedule = await db.feeSchedule.findUnique({
    where: { id: data.feeScheduleId },
    select: { id: true, academicYearId: true, gradeLevelId: true, studyPathId: true },
  });

  if (!feeSchedule) {
    return { status: "error", message: t("finance.invoicing.errors.invalid") };
  }

  const items = await db.feeItem.findMany({
    where: {
      feeScheduleId: feeSchedule.id,
      recurrence: periodMonth ? "MONTHLY" : { in: ["TERM", "ANNUAL", "ONE_OFF"] },
    },
    select: { id: true, name: true, amount: true, dueDayOfMonth: true },
  });

  if (items.length === 0) {
    return { status: "error", message: t("finance.invoicing.errors.noItemsForPeriod") };
  }

  // Matrículas abrangidas: por percurso, por classe (via o percurso), ou toda a escola
  // no ano lectivo da tabela — só as activas, nunca uma matrícula encerrada.
  const enrollments = await db.enrollment.findMany({
    where: {
      academicYearId: feeSchedule.academicYearId,
      status: "ACTIVE",
      ...(feeSchedule.studyPathId
        ? { studyPathId: feeSchedule.studyPathId }
        : feeSchedule.gradeLevelId
          ? { studyPath: { gradeLevelId: feeSchedule.gradeLevelId } }
          : {}),
    },
    select: { id: true },
  });

  if (enrollments.length === 0) {
    return { status: "error", message: t("finance.invoicing.errors.noEnrollments") };
  }

  const dueDay = Math.min(...items.map((item) => item.dueDayOfMonth ?? DEFAULT_DUE_DAY));
  const dueDate = new Date(Date.UTC(data.periodYear, (periodMonth ?? 1) - 1, dueDay));

  let existingCount = await db.invoice.count({
    where: { schoolId, periodYear: data.periodYear, periodMonth },
  });

  let created = 0;
  let skipped = 0;

  for (const enrollment of enrollments) {
    const alreadyInvoiced = await db.invoice.findFirst({
      where: {
        enrollmentId: enrollment.id,
        periodYear: data.periodYear,
        periodMonth,
        lines: { some: { feeItem: { feeScheduleId: feeSchedule.id } } },
      },
      select: { id: true },
    });

    if (alreadyInvoiced) {
      skipped += 1;
      continue;
    }

    // Soma exacta (decimal.js), nunca `number` — ver shared/domain/numeric.ts.
    const totalAmount = sum(items.map((item) => item.amount));

    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          schoolId,
          enrollmentId: enrollment.id,
          reference: suggestInvoiceReference(data.periodYear, periodMonth, existingCount),
          periodYear: data.periodYear,
          periodMonth,
          dueDate,
          subtotal: totalAmount.toFixed(2),
          total: totalAmount.toFixed(2),
          lines: {
            create: items.map((item) => ({
              feeItemId: item.id,
              description: item.name,
              quantity: 1,
              unitAmount: item.amount,
              amount: item.amount,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "invoice.generate",
          entity: "Invoice",
          entityId: invoice.id,
          after: JSON.parse(JSON.stringify(invoice)),
        },
      });
    });

    existingCount += 1;
    created += 1;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success", created, skipped };
}
