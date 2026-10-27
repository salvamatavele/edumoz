import type { PaymentStatus } from "@/types";

/**
 * Máquina de estados de `Payment`. Pura de propósito: qualquer Server Action que mude o
 * estado de um pagamento (`confirm-payment.ts`, `initiate-mobile-money-payment.ts`,
 * `reverse-payment.ts`) chama `canTransition` antes de gravar — nunca grava um estado sem
 * primeiro perguntar se a transição é válida. Ver design.md.
 *
 * `INITIATED`/`PENDING` → `CONFIRMED` ou `FAILED` (o operador de dinheiro móvel pode
 * responder de imediato ou só depois de uma consulta); `INITIATED` → `PENDING` (o operador
 * aceitou o pedido mas ainda não confirmou); `CONFIRMED` → `REVERSED`, a única transição
 * que sai de `CONFIRMED`. Qualquer outra combinação — incluindo permanecer no mesmo
 * estado, ou sair de `FAILED`/`REVERSED` — é inválida.
 */
const VALID_TRANSITIONS: Readonly<Record<PaymentStatus, ReadonlySet<PaymentStatus>>> = {
  INITIATED: new Set(["PENDING", "CONFIRMED", "FAILED"]),
  PENDING: new Set(["CONFIRMED", "FAILED"]),
  CONFIRMED: new Set(["REVERSED"]),
  FAILED: new Set(),
  REVERSED: new Set(),
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return VALID_TRANSITIONS[from].has(to);
}
