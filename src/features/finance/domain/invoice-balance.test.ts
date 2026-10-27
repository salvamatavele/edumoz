import { describe, expect, it } from "vitest";

import { recalculateInvoiceBalance } from "./invoice-balance";

const PAST = new Date("2026-01-01T00:00:00Z");
const NOW = new Date("2026-03-01T00:00:00Z");
const FUTURE = new Date("2026-06-01T00:00:00Z");

describe("recalculateInvoiceBalance", () => {
  it("soma exacta dos pagamentos confirmados, nunca por incremento", () => {
    const balance = recalculateInvoiceBalance(1800, [900, 900], FUTURE, NOW, null);
    expect(balance.paidAmount).toBe("1800.00");
    expect(balance.status).toBe("PAID");
  });

  it("ignora nenhum pagamento — soma vazia dá zero, nunca NaN", () => {
    const balance = recalculateInvoiceBalance(1800, [], FUTURE, NOW, null);
    expect(balance.paidAmount).toBe("0.00");
    expect(balance.status).toBe("PENDING");
  });

  it("recalcular duas vezes com os mesmos pagamentos dá sempre o mesmo resultado (idempotente)", () => {
    const first = recalculateInvoiceBalance(1800, [900], PAST, NOW, null);
    const second = recalculateInvoiceBalance(1800, [900], PAST, NOW, null);
    expect(first).toEqual(second);
    expect(first.status).toBe("PARTIAL");
  });

  it("uma factura cancelada mantém-se CANCELLED mesmo com pagamentos confirmados", () => {
    const balance = recalculateInvoiceBalance(1800, [1800], FUTURE, NOW, NOW);
    expect(balance.status).toBe("CANCELLED");
  });
});
