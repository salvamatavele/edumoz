import { describe, expect, it } from "vitest";

import { RoundingMode } from "@/types";

import {
  Decimal,
  isWithin,
  roundScore,
  sum,
  toDecimal,
  toDecimalOrNull,
  toStoredString,
} from "./numeric";

describe("toDecimal", () => {
  it("aceita o que o Prisma devolve numa coluna Decimal", () => {
    // O Prisma 7 entrega instâncias de decimal.js, não números.
    expect(toDecimal(new Decimal("14.75")).toString()).toBe("14.75");
  });

  it("aceita strings e números", () => {
    expect(toDecimal("2500.00").toString()).toBe("2500");
    expect(toDecimal(12.5).toString()).toBe("12.5");
  });

  it("rejeita valores não numéricos em vez de propagar NaN", () => {
    expect(() => toDecimal("dezasseis")).toThrow(/inválido/i);
  });

  it("rejeita Infinity, que o decimal.js aceitaria em silêncio", () => {
    expect(() => toDecimal(Number.POSITIVE_INFINITY)).toThrow(/inválido/i);
    expect(() => toDecimal("-Infinity")).toThrow(/inválido/i);
  });

  it("trata vazio, null e undefined como ausência de valor", () => {
    expect(toDecimalOrNull(null)).toBeNull();
    expect(toDecimalOrNull(undefined)).toBeNull();
    expect(toDecimalOrNull("")).toBeNull();
  });
});

describe("aritmética exacta", () => {
  it("soma sem erro binário", () => {
    // O caso que justifica o módulo inteiro: 0.1 + 0.2 em vírgula flutuante dá
    // 0.30000000000000004, e numa propina isso é dinheiro perdido.
    expect(sum(["0.1", "0.2"]).toString()).toBe("0.3");
  });

  it("soma uma lista vazia como zero, não NaN", () => {
    expect(sum([]).toString()).toBe("0");
  });

  it("acumula propinas mensais sem desvio", () => {
    const dozeMeses = Array.from({ length: 12 }, () => "1800.00");
    expect(toStoredString(sum(dozeMeses))).toBe("21600.00");
  });
});

describe("roundScore", () => {
  it("NONE devolve o valor intacto", () => {
    expect(roundScore("14.6789", RoundingMode.NONE, 2).toString()).toBe("14.6789");
  });

  it.each([
    [RoundingMode.HALF_UP, "14.5", 0, "15"],
    [RoundingMode.HALF_DOWN, "14.5", 0, "14"],
    [RoundingMode.CEIL, "14.01", 0, "15"],
    [RoundingMode.FLOOR, "14.99", 0, "14"],
    [RoundingMode.HALF_UP, "13.456", 2, "13.46"],
    [RoundingMode.FLOOR, "13.456", 2, "13.45"],
  ])("%s de %s com %i casas dá %s", (mode, value, places, expected) => {
    expect(roundScore(value, mode, places).toString()).toBe(expected);
  });

  it("rejeita um número de casas decimais inválido", () => {
    expect(() => roundScore("14.5", RoundingMode.HALF_UP, -1)).toThrow();
    expect(() => roundScore("14.5", RoundingMode.HALF_UP, 1.5)).toThrow();
  });
});

describe("toStoredString", () => {
  it("fixa as casas decimais para persistência", () => {
    expect(toStoredString("1800")).toBe("1800.00");
    expect(toStoredString("0.4", 4)).toBe("0.4000");
  });
});

describe("isWithin", () => {
  it("inclui os extremos da escala", () => {
    expect(isWithin("0", "0", "20")).toBe(true);
    expect(isWithin("20", "0", "20")).toBe(true);
  });

  it("exclui valores fora da escala", () => {
    expect(isWithin("20.01", "0", "20")).toBe(false);
    expect(isWithin("-0.01", "0", "20")).toBe(false);
  });
});
