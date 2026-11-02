import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { getTenantDb, type TenantDb } from "@/lib/db/tenant";
import { recalculateInvoiceBalance } from "../domain/invoice-balance";
import { resolvePaymentTransition, type GatewayStatusResult } from "../domain/payment-transition";
import type { PaymentStatus, InvoiceStatus } from "@/types";

export class FinancialMutationError extends Error {
  constructor(readonly code: "invoiceNotFound" | "invoiceCancelled" | "paymentNotFound" | "cannotReverse" | "intentConflict" | "paymentInProgress" | "nothingOwed" | "unsupportedCurrency" | "providerMismatch") { super(code); this.name = "FinancialMutationError"; }
}
export type FinancialTx = Pick<TenantDb, "invoice" | "payment" | "auditLog">;
export interface LockedInvoice {
  readonly id: string; readonly reference: string; readonly total: { toString(): string }; readonly paidAmount: { toString(): string };
  readonly dueDate: Date; readonly cancelledAt: Date | null; readonly status: InvoiceStatus; readonly currency: string;
}
export async function withInvoiceTransaction<T>(schoolId: string, invoiceId: string, operation: (tx: FinancialTx, invoice: LockedInvoice) => Promise<T>): Promise<T> {
  const db = getTenantDb(schoolId);
  // Every application writer acquires this row before touching a payment or balance.
  return withTransactionRetry(() => db.$transaction(async (tx) => {
    const claimed = await tx.invoice.updateMany({ where: { id: invoiceId }, data: { revision: { increment: 1 } } });
    if (claimed.count !== 1) throw new FinancialMutationError("invoiceNotFound");
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { id: true, reference: true, total: true, paidAmount: true, dueDate: true, cancelledAt: true, status: true, currency: true } });
    return operation(tx, invoice);
  }, { isolationLevel: "RepeatableRead" }));
}
export async function refreshInvoiceBalance(tx: FinancialTx, invoice: LockedInvoice, now: Date): Promise<void> {
  const payments = await tx.payment.findMany({ where: { invoiceId: invoice.id, status: "CONFIRMED" }, select: { amount: true } });
  const balance = recalculateInvoiceBalance(invoice.total.toString(), payments.map(payment => payment.amount), invoice.dueDate, now, invoice.cancelledAt);
  await tx.invoice.update({ where: { id: invoice.id }, data: balance });
}
export async function applyGatewayResult(schoolId: string, invoiceId: string, paymentId: string, result: GatewayStatusResult, actorUserId: string, action: "payment.confirm" | "payment.initiateMobileMoney"): Promise<PaymentStatus> {
  return withInvoiceTransaction(schoolId, invoiceId, async (tx, invoice) => {
    const current = await tx.payment.findFirst({ where: { id: paymentId, invoiceId }, select: { status: true, providerReference: true, amount: true } });
    if (!current) throw new FinancialMutationError("paymentNotFound");
    const now = new Date();
    // Resolve from persisted state after the lock, never from a stale gateway request.
    const transition = resolvePaymentTransition(current.status, result, now);
    if (!transition) return current.status;
    if (current.providerReference && current.providerReference !== result.providerReference) throw new FinancialMutationError("providerMismatch");
    await tx.payment.update({ where: { id: paymentId }, data: { ...transition, rawPayload: JSON.parse(JSON.stringify(transition.rawPayload ?? null)) } });
    if (transition.status === "CONFIRMED") await refreshInvoiceBalance(tx, invoice, now);
    await tx.auditLog.create({ data: {
      schoolId, actorUserId, action, entity: "Payment", entityId: paymentId,
      before: { status: current.status },
      after: JSON.parse(JSON.stringify({ status: transition.status, providerReference: transition.providerReference, confirmedAt: transition.confirmedAt, amount: current.amount.toString() })),
    } });
    return transition.status;
  });
}
