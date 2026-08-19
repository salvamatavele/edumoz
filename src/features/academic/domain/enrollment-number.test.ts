import { describe, expect, it } from "vitest";

import { suggestEnrollmentNumber } from "./enrollment-number";

describe("suggestEnrollmentNumber", () => {
  it("sugere a primeira matrícula do ano quando não há nenhuma", () => {
    expect(suggestEnrollmentNumber(2026, 0)).toBe("2026/001");
  });

  it("soma um à contagem existente", () => {
    expect(suggestEnrollmentNumber(2026, 12)).toBe("2026/013");
  });

  it("preenche com zeros até 3 dígitos", () => {
    expect(suggestEnrollmentNumber(2026, 8)).toBe("2026/009");
  });

  it("não trunca acima de 999 matrículas", () => {
    expect(suggestEnrollmentNumber(2026, 999)).toBe("2026/1000");
  });
});
