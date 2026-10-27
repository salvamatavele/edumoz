import type { PaymentStatus } from "@/types";

import { canTransition } from "./payment-state";

export interface GatewayStatusResult {
  readonly status: PaymentStatus;
  readonly providerReference: string | null;
  readonly failureReason: string | null;
  readonly rawPayload: unknown;
  readonly confirmedAt?: Date | null;
}

export interface PaymentTransitionUpdate {
  readonly status: PaymentStatus;
  readonly providerReference: string | null;
  readonly failureReason: string | null;
  readonly rawPayload: unknown;
  readonly confirmedAt: Date | null;
}

/**
 * O que gravar num `Payment` a partir de uma resposta do operador (imediata em
 * `initiate`, ou de uma consulta a `getStatus`) — ou `null` se a transição não é válida,
 * o que inclui o próprio operador responder o MESMO estado outra vez (`canTransition`
 * recusa permanecer no mesmo estado). Um `null` é sempre um não-operação segura, nunca um
 * erro: é o que torna confirmar duas vezes a mesma referência idempotente. Pura de
 * propósito — quem chama decide o que fazer com o resultado (gravar, e só depois
 * recalcular a factura se `status` for `CONFIRMED`).
 */
export function resolvePaymentTransition(
  currentStatus: PaymentStatus,
  result: GatewayStatusResult,
  now: Date,
): PaymentTransitionUpdate | null {
  if (!canTransition(currentStatus, result.status)) return null;

  return {
    status: result.status,
    providerReference: result.providerReference,
    failureReason: result.failureReason,
    rawPayload: result.rawPayload,
    confirmedAt: result.status === "CONFIRMED" ? (result.confirmedAt ?? now) : null,
  };
}
