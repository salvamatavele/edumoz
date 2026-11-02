import { randomUUID } from "node:crypto";
import { MobileMoneyGatewayError, type MobileMoneyGateway, type PaymentInitiation, type PaymentRequest, type PaymentStatusResult } from "@/features/finance/domain/ports/mobile-money-gateway";
import type { PaymentProvider } from "@/types";

// Simulation only: this state is not persisted and proves no real operator integration.
const intentions = new Map<string, { fingerprint: string; result: PaymentInitiation }>();
const references = new Map<string, "TIMEOUT" | "WAITING" | "CONFIRMED" | "FAILED">();
export class SimulatedGateway implements MobileMoneyGateway {
  constructor(readonly provider: PaymentProvider) {}
  async initiate(request: PaymentRequest): Promise<PaymentInitiation> {
    const key = `${this.provider}:${request.idempotencyKey}`;
    const fingerprint = JSON.stringify([String(request.amount), request.currency, request.payerPhone, request.reference]);
    const existing = intentions.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new MobileMoneyGatewayError(this.provider, "Simulated intent key was reused with different parameters");
      return existing.result;
    }
    const suffix = request.payerPhone.slice(-4);
    const providerReference = `SIM-${randomUUID()}`;
    const status = suffix === "0000" ? "CONFIRMED" : suffix === "1111" ? "FAILED" : "PENDING";
    const result: PaymentInitiation = { status, providerReference, failureReason: status === "FAILED" ? "Pagamento recusado pelo operador (simulado)." : null, rawPayload: { simulated: status.toLowerCase() } };
    references.set(`${this.provider}:${providerReference}`, suffix === "2222" ? "TIMEOUT" : status === "PENDING" ? "WAITING" : status);
    intentions.set(key, { fingerprint, result });
    return result;
  }
  async getStatus(providerReference: string): Promise<PaymentStatusResult> {
    const key = `${this.provider}:${providerReference}`;
    const state = references.get(key);
    if (!state) throw new MobileMoneyGatewayError(this.provider, "Unknown simulated reference; simulation state may have been restarted");
    if (state === "WAITING") references.set(key, "CONFIRMED");
    const status = state === "WAITING" || state === "TIMEOUT" ? "PENDING" : state;
    return { status, providerReference, confirmedAt: status === "CONFIRMED" ? new Date() : null, failureReason: status === "FAILED" ? "Pagamento recusado pelo operador (simulado)." : null, rawPayload: { simulated: state.toLowerCase() } };
  }
}
