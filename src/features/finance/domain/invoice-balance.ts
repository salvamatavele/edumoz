import type { InvoiceStatus } from "@/types";

import { type DecimalLike, sum } from "@/features/shared/domain/numeric";

import { deriveInvoiceStatus } from "./invoice-status";

export interface RecalculatedInvoiceBalance {
  /** Pronto para gravar directamente numa coluna `Decimal` — string com 2 casas fixas. */
  readonly paidAmount: string;
  readonly status: InvoiceStatus;
}

/**
 * Recalcula `paidAmount`/`status` de uma factura a partir da soma dos `Payment`s
 * `CONFIRMED`, nunca por incremento — chamado depois de QUALQUER mudança de estado de um
 * `Payment` (registo manual, confirmação de dinheiro móvel, reversão), sempre na mesma
 * transacção que gravou essa mudança. Ver design.md, "`Invoice.paidAmount`/`status`
 * recalculam-se sempre por agregação".
 */
export function recalculateInvoiceBalance(
  total: DecimalLike,
  confirmedPaymentAmounts: readonly DecimalLike[],
  dueDate: Date,
  now: Date,
  cancelledAt: Date | null,
): RecalculatedInvoiceBalance {
  const paidAmount = sum(confirmedPaymentAmounts);
  const status = deriveInvoiceStatus(total, paidAmount, dueDate, now, cancelledAt);

  return { paidAmount: paidAmount.toFixed(2), status };
}
