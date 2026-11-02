"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { FinancialMutationError, withInvoiceTransaction, refreshInvoiceBalance } from "@/features/finance/data/payment-transactions";
import { paymentIntentKey } from "@/features/finance/data/financial-keys";
import { toDecimal } from "@/features/shared/domain/numeric";
import {
  recordManualPaymentSchema,
  type RecordManualPaymentInput,
} from "@/features/finance/domain/payment-schema";
import {
  hasPermission,
  toSessionContext,
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

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "create")) {
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

  const idempotencyKey = paymentIntentKey(schoolId, "manual", data.idempotencyKey);
  try {
    await withInvoiceTransaction(schoolId, data.invoiceId, async (tx, invoice) => {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.invoiceId !== invoice.id || existing.method !== data.method || !toDecimal(existing.amount).equals(data.amount)) throw new FinancialMutationError("intentConflict");
        return;
      }
      if (invoice.status === "CANCELLED" || invoice.cancelledAt) throw new FinancialMutationError("invoiceCancelled");
      const now = new Date();
      const payment = await tx.payment.create({ data: { schoolId, invoiceId: invoice.id, amount: data.amount, currency: invoice.currency, method: data.method, status: "CONFIRMED", idempotencyKey, confirmedAt: now, initiatedById: session.user.id } });
      await refreshInvoiceBalance(tx, invoice, now);
      await tx.auditLog.create({ data: { schoolId, actorUserId: session.user.id, action: "payment.recordManual", entity: "Payment", entityId: payment.id, after: JSON.parse(JSON.stringify({ status: payment.status, amount: payment.amount.toString(), currency: payment.currency, method: payment.method, confirmedAt: payment.confirmedAt })) } });
    });
  } catch (error) {
    if (error instanceof FinancialMutationError) return { status: "error", message: t(`finance.payments.errors.${error.code}`) };
    // A key reused across two invoices can race outside their separate row locks.
    const existing = await db.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return { status: "error", message: t("finance.payments.errors.intentConflict") };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
