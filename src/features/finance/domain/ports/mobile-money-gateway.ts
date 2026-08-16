import type { PaymentProvider, PaymentStatus } from "@/types";

import type { Money } from "@/features/shared/domain/numeric";

/**
 * Porta para os operadores de dinheiro móvel moçambicanos (m-Pesa, e-Mola, mKesh).
 *
 * O domínio conhece esta interface; não conhece nenhum dos operadores. Os adaptadores
 * reais e o simulado implementam-na em `features/finance/data/gateways/`.
 *
 * Duas decisões que a assinatura impõe:
 *
 * 1. `idempotencyKey` é obrigatória. Os callbacks destes operadores repetem-se por
 *    desenho, e sem chave o mesmo pagamento é contado duas vezes.
 * 2. `initiate` devolve um estado, não um sucesso. Nenhum destes operadores confirma de
 *    forma síncrona: o aluno ainda tem de aprovar no telemóvel. Uma API que devolvesse
 *    `Promise<void>` esconderia esse facto e levaria a marcar propinas como pagas antes
 *    de o dinheiro existir.
 */

export interface PaymentRequest {
  readonly idempotencyKey: string;
  readonly amount: Money;
  readonly currency: "MZN";
  /** Número do pagador em formato internacional, ex.: "+258841234567". */
  readonly payerPhone: string;
  /** Referência da factura, mostrada ao pagador no telemóvel. */
  readonly reference: string;
  readonly description: string;
}

export interface PaymentInitiation {
  readonly status: PaymentStatus;
  /** Referência do operador, usada depois para consultar o estado. */
  readonly providerReference: string | null;
  readonly failureReason: string | null;
  /** Resposta crua, guardada para reconciliação e para disputas. */
  readonly rawPayload: unknown;
}

export interface PaymentStatusResult {
  readonly status: PaymentStatus;
  readonly providerReference: string;
  readonly confirmedAt: Date | null;
  readonly failureReason: string | null;
  readonly rawPayload: unknown;
}

export interface MobileMoneyGateway {
  readonly provider: PaymentProvider;
  initiate(request: PaymentRequest): Promise<PaymentInitiation>;
  getStatus(providerReference: string): Promise<PaymentStatusResult>;
}

/** Erro de comunicação com o operador. Distinto de um pagamento recusado. */
export class MobileMoneyGatewayError extends Error {
  constructor(
    readonly provider: PaymentProvider,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MobileMoneyGatewayError";
  }
}
