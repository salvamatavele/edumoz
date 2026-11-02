"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { SimulatedGateway } from "@/features/finance/data/gateways/simulated-gateway";
import { FinancialMutationError, withInvoiceTransaction, applyGatewayResult } from "@/features/finance/data/payment-transactions";
import { paymentIntentKey } from "@/features/finance/data/financial-keys";
import { MobileMoneyGatewayError } from "@/features/finance/domain/ports/mobile-money-gateway";
import {
  initiateMobileMoneyPaymentSchema,
  type InitiateMobileMoneyPaymentInput,
} from "@/features/finance/domain/payment-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { toDecimal } from "@/features/shared/domain/numeric";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Inicia um pagamento por dinheiro móvel pela dívida total da factura. Grava o `Payment`
 * em `INITIATED`, com uma `idempotencyKey` própria, ANTES de contactar o operador — se o
 * pedido falhar ou nunca voltar, o registo da tentativa já existe. Ver design.md.
 */
export async function initiateMobileMoneyPayment(
  values: InitiateMobileMoneyPaymentInput,
): Promise<FormActionResult<InitiateMobileMoneyPaymentInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = initiateMobileMoneyPaymentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof InitiateMobileMoneyPaymentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof InitiateMobileMoneyPaymentInput;
      fieldErrors[field] = t(`finance.payments.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const idempotencyKey = paymentIntentKey(schoolId, "mobile", data.idempotencyKey);
  try {
    const attempt = await withInvoiceTransaction(schoolId, data.invoiceId, async (tx, invoice) => {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
      if (existing && (existing.invoiceId !== invoice.id || existing.provider !== data.provider || existing.payerPhone !== data.payerPhone)) throw new FinancialMutationError("intentConflict");
      if (existing && (existing.status !== "INITIATED" || existing.providerReference)) return { payment: existing, invoice, resume: false };
      if (invoice.status === "CANCELLED" || invoice.cancelledAt) throw new FinancialMutationError("invoiceCancelled");
      if (invoice.currency !== "MZN") throw new FinancialMutationError("unsupportedCurrency");
      if (existing) return { payment: existing, invoice, resume: true };
      const pending = await tx.payment.findFirst({ where: { invoiceId: invoice.id, method: "MOBILE_MONEY", status: { in: ["INITIATED", "PENDING"] } }, select: { id: true } });
      if (pending) throw new FinancialMutationError("paymentInProgress");
      const outstanding = toDecimal(invoice.total.toString()).minus(toDecimal(invoice.paidAmount.toString()));
      if (outstanding.lessThanOrEqualTo(0)) throw new FinancialMutationError("nothingOwed");
      const payment = await tx.payment.create({ data: { schoolId, invoiceId: invoice.id, amount: outstanding.toFixed(2), currency: invoice.currency, method: "MOBILE_MONEY", provider: data.provider, payerPhone: data.payerPhone, status: "INITIATED", idempotencyKey, initiatedById: session.user.id } });
      await tx.auditLog.create({ data: { schoolId, actorUserId: session.user.id, action: "payment.mobileAttempt", entity: "Payment", entityId: payment.id, after: { status: "INITIATED", amount: payment.amount.toString(), currency: payment.currency, provider: payment.provider } } });
      return { payment, invoice, resume: true };
    });
    if (attempt.resume) {
      // This is outside the transaction. Replays use the original amount and intent key.
      const gateway = new SimulatedGateway(data.provider);
      const initiation = await gateway.initiate({ idempotencyKey: attempt.payment.idempotencyKey, amount: toDecimal(attempt.payment.amount), currency: "MZN", payerPhone: data.payerPhone, reference: attempt.invoice.reference, description: t("finance.payments.mobileMoneyDescription", { reference: attempt.invoice.reference }) });
      await applyGatewayResult(schoolId, attempt.invoice.id, attempt.payment.id, initiation, session.user.id, "payment.initiateMobileMoney");
    }
  } catch (error) {
    if (error instanceof FinancialMutationError) return { status: "error", message: t(`finance.payments.errors.${error.code}`) };
    if (error instanceof MobileMoneyGatewayError) return { status: "error", message: t("finance.payments.errors.gatewayFailure") };
    const existing = await db.payment.findUnique({ where: { idempotencyKey } });
    if (existing && (existing.invoiceId !== data.invoiceId || existing.provider !== data.provider || existing.payerPhone !== data.payerPhone)) return { status: "error", message: t("finance.payments.errors.intentConflict") };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
