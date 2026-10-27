import { describe, expect, it } from "vitest";

import { deriveInvoiceStatus } from "./invoice-status";

const PAST = new Date("2026-01-01T00:00:00Z");
const NOW = new Date("2026-03-01T00:00:00Z");
const FUTURE = new Date("2026-06-01T00:00:00Z");

describe("deriveInvoiceStatus", () => {
  it("é CANCELLED sempre que cancelledAt está preenchido, mesmo já paga", () => {
    expect(deriveInvoiceStatus(1800, 1800, PAST, NOW, NOW)).toBe("CANCELLED");
  });

  it("é PAID quando paidAmount cobre o total", () => {
    expect(deriveInvoiceStatus(1800, 1800, FUTURE, NOW, null)).toBe("PAID");
  });

  it("é PAID quando paidAmount excede o total", () => {
    expect(deriveInvoiceStatus(1800, 2000, FUTURE, NOW, null)).toBe("PAID");
  });

  it("é PARTIAL quando pagou algo mas não o suficiente, mesmo com o prazo já passado", () => {
    expect(deriveInvoiceStatus(1800, 900, PAST, NOW, null)).toBe("PARTIAL");
  });

  it("é OVERDUE quando não pagou nada e o prazo já passou", () => {
    expect(deriveInvoiceStatus(1800, 0, PAST, NOW, null)).toBe("OVERDUE");
  });

  it("é PENDING quando não pagou nada e o prazo ainda não passou", () => {
    expect(deriveInvoiceStatus(1800, 0, FUTURE, NOW, null)).toBe("PENDING");
  });

  it("aceita Decimal do Prisma (com toString) directamente", () => {
    const total = { toString: () => "1800.00" };
    const paid = { toString: () => "1800.00" };
    expect(deriveInvoiceStatus(total, paid, FUTURE, NOW, null)).toBe("PAID");
  });
});
