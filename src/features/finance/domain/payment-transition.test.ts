import { describe, expect, it } from "vitest";

import { resolvePaymentTransition } from "./payment-transition";

const NOW = new Date("2026-03-01T00:00:00Z");

describe("resolvePaymentTransition", () => {
  it("aplica INITIATED → CONFIRMED e usa `now` quando o resultado não traz confirmedAt", () => {
    const update = resolvePaymentTransition("INITIATED", {
      status: "CONFIRMED",
      providerReference: "REF-1",
      failureReason: null,
      rawPayload: { ok: true },
    }, NOW);

    expect(update).toEqual({
      status: "CONFIRMED",
      providerReference: "REF-1",
      failureReason: null,
      rawPayload: { ok: true },
      confirmedAt: NOW,
    });
  });

  it("devolve null quando o operador responde o mesmo estado outra vez (idempotente)", () => {
    const update = resolvePaymentTransition("PENDING", {
      status: "PENDING",
      providerReference: "REF-1",
      failureReason: null,
      rawPayload: null,
    }, NOW);

    expect(update).toBeNull();
  });

  it("devolve null para uma transição inválida (ex.: sair de CONFIRMED sem ser para REVERSED)", () => {
    const update = resolvePaymentTransition("CONFIRMED", {
      status: "PENDING",
      providerReference: "REF-1",
      failureReason: null,
      rawPayload: null,
    }, NOW);

    expect(update).toBeNull();
  });

  it("confirmedAt fica null para uma transição para FAILED", () => {
    const update = resolvePaymentTransition("INITIATED", {
      status: "FAILED",
      providerReference: "REF-1",
      failureReason: "Recusado",
      rawPayload: null,
    }, NOW);

    expect(update?.confirmedAt).toBeNull();
    expect(update?.failureReason).toBe("Recusado");
  });
});
