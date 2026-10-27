import type { InvoiceStatus } from "@/types";

import { type DecimalLike, toDecimal } from "@/features/shared/domain/numeric";

/**
 * Deriva `Invoice.status` a partir dos valores actuais — nunca gravado directamente por
 * uma Server Action, sempre recalculado depois de qualquer mudança num `Payment`. Ver
 * design.md.
 *
 * Ordem de precedência (a mesma do design.md): `CANCELLED` primeiro (só por acção
 * explícita, nunca derivado de valores); depois `PAID`; depois `PARTIAL` — ter pago algo
 * já é um estado distinto de não ter pago nada, mesmo que o prazo já tenha passado;
 * `OVERDUE` só se aplica a quem ainda não pagou nada e já passou o prazo; `PENDING` é o
 * resto.
 */
export function deriveInvoiceStatus(
  total: DecimalLike,
  paidAmount: DecimalLike,
  dueDate: Date,
  now: Date,
  cancelledAt: Date | null,
): InvoiceStatus {
  if (cancelledAt !== null) return "CANCELLED";

  const totalDecimal = toDecimal(total);
  const paidDecimal = toDecimal(paidAmount);

  if (paidDecimal.greaterThanOrEqualTo(totalDecimal)) return "PAID";
  if (paidDecimal.greaterThan(0)) return "PARTIAL";
  if (dueDate.getTime() < now.getTime()) return "OVERDUE";

  return "PENDING";
}
