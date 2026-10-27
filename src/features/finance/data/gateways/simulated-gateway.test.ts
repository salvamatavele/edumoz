import { describe, expect, it } from "vitest";

import type { PaymentRequest } from "@/features/finance/domain/ports/mobile-money-gateway";

import { SimulatedGateway } from "./simulated-gateway";

function request(payerPhone: string): PaymentRequest {
  return {
    idempotencyKey: `idem-${payerPhone}`,
    amount: 1800 as never,
    currency: "MZN",
    payerPhone,
    reference: "2026-0001",
    description: "Propina mensal",
  };
}

describe("SimulatedGateway", () => {
  const gateway = new SimulatedGateway("MPESA");

  it("termina em 0000 — sucesso imediato", async () => {
    const initiation = await gateway.initiate(request("+258840000000"));
    expect(initiation.status).toBe("CONFIRMED");
    expect(initiation.failureReason).toBeNull();
  });

  it("termina em 1111 — falha imediata", async () => {
    const initiation = await gateway.initiate(request("+258841111111"));
    expect(initiation.status).toBe("FAILED");
    expect(initiation.failureReason).not.toBeNull();
  });

  it("termina em 2222 — timeout: getStatus nunca sai de PENDING", async () => {
    const initiation = await gateway.initiate(request("+258842222222"));
    expect(initiation.status).toBe("PENDING");

    const first = await gateway.getStatus(initiation.providerReference!);
    const second = await gateway.getStatus(initiation.providerReference!);
    expect(first.status).toBe("PENDING");
    expect(second.status).toBe("PENDING");
  });

  it("qualquer outro número — o caminho real: PENDING, depois PENDING, depois CONFIRMED", async () => {
    const initiation = await gateway.initiate(request("+258849876543"));
    expect(initiation.status).toBe("PENDING");

    const first = await gateway.getStatus(initiation.providerReference!);
    expect(first.status).toBe("PENDING");
    expect(first.confirmedAt).toBeNull();

    const second = await gateway.getStatus(initiation.providerReference!);
    expect(second.status).toBe("CONFIRMED");
    expect(second.confirmedAt).not.toBeNull();
  });

  it("gera uma providerReference diferente a cada chamada de initiate", async () => {
    const a = await gateway.initiate(request("+258849876543"));
    const b = await gateway.initiate(request("+258849876543"));
    expect(a.providerReference).not.toBe(b.providerReference);
  });
});
