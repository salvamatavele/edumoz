"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { recalculateInvoiceBalance } from "@/features/finance/domain/invoice-balance";
import {
  recordManualPaymentSchema,
  type RecordManualPaymentInput,
} from "@/features/finance/domain/payment-schema";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Regista um pagamento manual (numerário, depósito ou transferência bancária) já
 * `CONFIRMED` — o dinheiro móvel nunca passa por aqui, sempre por
 * `initiate-mobile-money-payment.ts` (ver design.md, "Reverter exige...").
 */
export async function recordManualPayment(
  values: RecordManualPaymentInput,
): Promise<FormActionResult<RecordManualPaymentInput>> {
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

  const parsed = recordManualPaymentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof RecordManualPaymentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof RecordManualPaymentInput;
      fieldErrors[field] = t(`finance.payments.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const invoice = await db.invoice.findUnique({
    where: { id: data.invoiceId },
    select: { id: true, total: true, dueDate: true, cancelledAt: true, status: true },
  });

  if (!invoice) {
    return { status: "error", message: t("finance.payments.errors.invoiceNotFound") };
  }

  if (invoice.status === "CANCELLED") {
    return { status: "error", message: t("finance.payments.errors.invoiceCancelled") };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        amount: data.amount,
        method: data.method,
        status: "CONFIRMED",
        idempotencyKey: randomUUID(),
        confirmedAt: now,
        initiatedById: session.user.id,
      },
    });

    const confirmedPayments = await tx.payment.findMany({
      where: { invoiceId: invoice.id, status: "CONFIRMED" },
      select: { amount: true },
    });

    const balance = recalculateInvoiceBalance(
      invoice.total,
      confirmedPayments.map((p) => p.amount),
      invoice.dueDate,
      now,
      invoice.cancelledAt,
    );

    await tx.invoice.update({ where: { id: invoice.id }, data: balance });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "payment.recordManual",
        entity: "Payment",
        entityId: payment.id,
        after: JSON.parse(JSON.stringify(payment)),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
