"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { FinancialMutationError, withInvoiceTransaction, refreshInvoiceBalance } from "@/features/finance/data/payment-transactions";
import {
  reversePaymentSchema,
  type ReversePaymentInput,
} from "@/features/finance/domain/payment-schema";
import { canTransition } from "@/features/finance/domain/payment-state";
import {
  hasPermission,
  toSessionContext,
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

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "edit")) {
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

  try {
    await withInvoiceTransaction(schoolId, payment.invoice.id, async (tx, invoice) => {
      const current = await tx.payment.findFirst({ where: { id: payment.id, invoiceId: invoice.id }, select: { status: true, amount: true } });
      if (!current) throw new FinancialMutationError("paymentNotFound");
      if (!canTransition(current.status, "REVERSED")) throw new FinancialMutationError("cannotReverse");
      const now = new Date();
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REVERSED", reversedAt: now } });
      await refreshInvoiceBalance(tx, invoice, now);
      await tx.auditLog.create({ data: { schoolId, actorUserId: session.user.id, action: "payment.reverse", entity: "Payment", entityId: payment.id, before: { status: current.status }, after: JSON.parse(JSON.stringify({ status: "REVERSED", amount: current.amount.toString(), reversedAt: now, reason: data.reason })) } });
    });
  } catch (error) {
    if (error instanceof FinancialMutationError) return { status: "error", message: t(`finance.payments.errors.${error.code}`) };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
