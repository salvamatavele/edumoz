import { randomUUID } from "node:crypto";

import type {
  MobileMoneyGateway,
  PaymentInitiation,
  PaymentRequest,
  PaymentStatusResult,
} from "@/features/finance/domain/ports/mobile-money-gateway";
import type { PaymentProvider } from "@/types";

/**
 * Implementação simulada de `MobileMoneyGateway`, para desenvolvimento e testes enquanto
 * a escola não tem credenciais reais de nenhum operador (ver design.md, Non-Goals).
 *
 * Quatro caminhos determinísticos, escolhidos pelos últimos 4 dígitos de
 * `request.payerPhone`:
 *
 * - terminado em `0000` — sucesso imediato: `initiate` já devolve `CONFIRMED`.
 * - terminado em `1111` — falha imediata: `initiate` devolve `FAILED`.
 * - terminado em `2222` — timeout: `initiate` devolve `PENDING`, e `getStatus` nunca sai
 *   de `PENDING` — simula um operador que nunca responde.
 * - qualquer outro número — o caminho REAL, e o único que importa: nenhum operador
 *   confirma de forma síncrona. `initiate` devolve `PENDING`; a primeira consulta a
 *   `getStatus` continua `PENDING` (o aluno ainda não aprovou no telemóvel); só a segunda
 *   consulta resolve para `CONFIRMED`.
 */

const SUCCESS_SUFFIX = "0000";
const FAILURE_SUFFIX = "1111";
const TIMEOUT_SUFFIX = "2222";

type TrackedState = "TIMEOUT" | "AWAITING_SECOND_POLL";

// Estado em memória, por referência do operador — é o que permite ao caminho
// "pendente-depois-confirmado" resolver só na segunda chamada a `getStatus`, e ao
// caminho de timeout nunca resolver. Aceitável num simulado: não há operador real por
// trás disto, e cada `Payment` gera a sua própria referência.
const trackedReferences = new Map<string, TrackedState>();

export class SimulatedGateway implements MobileMoneyGateway {
  constructor(readonly provider: PaymentProvider) {}

  async initiate(request: PaymentRequest): Promise<PaymentInitiation> {
    const suffix = request.payerPhone.slice(-4);
    const providerReference = `SIM-${randomUUID()}`;

    if (suffix === SUCCESS_SUFFIX) {
      return {
        status: "CONFIRMED",
        providerReference,
        failureReason: null,
        rawPayload: { simulated: "success", payerPhone: request.payerPhone },
      };
    }

    if (suffix === FAILURE_SUFFIX) {
      return {
        status: "FAILED",
        providerReference,
        failureReason: "Pagamento recusado pelo operador (simulado).",
        rawPayload: { simulated: "failure", payerPhone: request.payerPhone },
      };
    }

    if (suffix === TIMEOUT_SUFFIX) {
      trackedReferences.set(providerReference, "TIMEOUT");
    } else {
      trackedReferences.set(providerReference, "AWAITING_SECOND_POLL");
    }

    return {
      status: "PENDING",
      providerReference,
      failureReason: null,
      rawPayload: { simulated: "pending", payerPhone: request.payerPhone },
    };
  }

  async getStatus(providerReference: string): Promise<PaymentStatusResult> {
    const state = trackedReferences.get(providerReference);

    if (state === "TIMEOUT") {
      return { status: "PENDING", providerReference, confirmedAt: null, failureReason: null, rawPayload: { simulated: "timeout" } };
    }

    if (state === "AWAITING_SECOND_POLL") {
      trackedReferences.delete(providerReference);
      return { status: "PENDING", providerReference, confirmedAt: null, failureReason: null, rawPayload: { simulated: "still-pending" } };
    }

    return { status: "CONFIRMED", providerReference, confirmedAt: new Date(), failureReason: null, rawPayload: { simulated: "confirmed" } };
  }
}
