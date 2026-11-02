import { describe, expect, it } from "vitest";
import { invoiceDueDate } from "./invoice-due-date";
describe("invoice due dates stay inside their period", () => {
  it.each([[2026, 2, "2026-02-28"], [2024, 2, "2024-02-29"], [2026, 6, "2026-06-30"]] as const)("clamps day 31 in %i/%i", (year, month, expected) => {
    expect(invoiceDueDate(year, month, 31).toISOString().slice(0, 10)).toBe(expected);
  });
  it("preserves a valid day and the annual January convention", () => {
    expect(invoiceDueDate(2026, 3, 10).toISOString().slice(0, 10)).toBe("2026-03-10");
    expect(invoiceDueDate(2026, null, 31).toISOString().slice(0, 10)).toBe("2026-01-31");
  });
});
