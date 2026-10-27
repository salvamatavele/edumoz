"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { recalculateInvoiceBalance } from "@/features/finance/domain/invoice-balance";
import {
  reversePaymentSchema,
  type ReversePaymentInput,
} from "@/features/finance/domain/payment-schema";
import { canTransition } from "@/features/finance/domain/payment-state";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Reverte um `Payment` `CONFIRMED` — exige motivo, nunca apaga o registo. O motivo fica
 * só no `AuditLog` (o schema não tem uma coluna própria para isto no `Payment` — ver
 * design.md).
 */
export async function reversePayment(
  values: ReversePaymentInput,
): Promise<FormActionResult<ReversePaymentInput>> {
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

  const parsed = reversePaymentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ReversePaymentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof ReversePaymentInput;
      fieldErrors[field] = t(`finance.payments.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const payment = await db.payment.findUnique({
    where: { id: data.paymentId },
    select: {
      id: true,
      status: true,
      invoice: { select: { id: true, total: true, dueDate: true, cancelledAt: true } },
    },
  });

  if (!payment) {
    return { status: "error", message: t("finance.payments.errors.paymentNotFound") };
  }

  if (!canTransition(payment.status, "REVERSED")) {
    return { status: "error", message: t("finance.payments.errors.cannotReverse") };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    const reversed = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "REVERSED", reversedAt: now },
    });

    const confirmedPayments = await tx.payment.findMany({
      where: { invoiceId: payment.invoice.id, status: "CONFIRMED" },
      select: { amount: true },
    });

    const balance = recalculateInvoiceBalance(
      payment.invoice.total,
      confirmedPayments.map((p) => p.amount),
      payment.invoice.dueDate,
      now,
      payment.invoice.cancelledAt,
    );

    await tx.invoice.update({ where: { id: payment.invoice.id }, data: balance });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "payment.reverse",
        entity: "Payment",
        entityId: payment.id,
        after: JSON.parse(JSON.stringify({ ...reversed, reason: data.reason })),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
