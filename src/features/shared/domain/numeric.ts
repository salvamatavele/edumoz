import { Decimal } from "decimal.js";

import { RoundingMode } from "@/types";

/**
 * Aritmética exacta para notas e dinheiro.
 *
 * O Prisma devolve colunas `Decimal` como instâncias de decimal.js, nunca como `number`.
 * Converter para `number` para "simplificar" reintroduz o erro binário que a coluna
 * Decimal existe para evitar: `0.1 + 0.2 !== 0.3` numa pauta é uma nota errada, e numa
 * propina é dinheiro a menos. Este módulo é a fronteira onde os valores entram no domínio.
 *
 * Não importa Prisma — aceita o que o Prisma devolve pela forma (`toString`), o que mantém
 * a camada de domínio livre de infra-estrutura.
 */

export { Decimal };

/** Uma quantia monetária. Sempre em MZN nesta fase, sempre com 2 casas na persistência. */
export type Money = Decimal;

/** Uma nota, na escala definida pelo esquema de avaliação (tipicamente 0–20). */
export type Score = Decimal;

/** O que o Prisma pode entregar numa coluna Decimal, mais o que um formulário pode enviar. */
export type DecimalLike = Decimal | string | number | { toString(): string };

export function toDecimal(value: DecimalLike): Decimal {
  if (value instanceof Decimal) return value;

  const asString = typeof value === "string" ? value : String(value);

  // decimal.js lança a sua própria excepção em texto não numérico, e aceita Infinity sem
  // se queixar. Os dois casos são o mesmo problema para nós — um valor que não serve para
  // uma nota nem para uma quantia — e devem dar o mesmo erro, em português e nosso.
  let parsed: Decimal;

  try {
    parsed = new Decimal(asString);
  } catch {
    throw new Error(`Valor numérico inválido: "${asString}".`);
  }

  if (!parsed.isFinite()) {
    throw new Error(`Valor numérico inválido: "${asString}".`);
  }

  return parsed;
}

export function toDecimalOrNull(value: DecimalLike | null | undefined): Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  return toDecimal(value);
}

const ROUNDING: Record<
  Exclude<RoundingMode, typeof RoundingMode.NONE>,
  Decimal.Rounding
> = {
  [RoundingMode.HALF_UP]: Decimal.ROUND_HALF_UP,
  [RoundingMode.HALF_DOWN]: Decimal.ROUND_HALF_DOWN,
  [RoundingMode.CEIL]: Decimal.ROUND_CEIL,
  [RoundingMode.FLOOR]: Decimal.ROUND_FLOOR,
};

/**
 * Arredonda uma nota segundo o esquema de avaliação.
 *
 * `NONE` devolve o valor intacto — é o que permite a uma escola guardar a média com toda a
 * precisão e só arredondar na apresentação. Note-se que `CEIL` e `FLOOR` são direccionais,
 * não "para o zero": -0.5 com FLOOR dá -1, não 0. Nas escalas escolares (0–20) não há
 * negativos, mas a distinção fica registada para quem venha a usar isto noutro contexto.
 */
export function roundScore(
  value: DecimalLike,
  mode: RoundingMode,
  decimalPlaces: number,
): Decimal {
  const decimal = toDecimal(value);

  if (mode === RoundingMode.NONE) return decimal;

  if (decimalPlaces < 0 || !Number.isInteger(decimalPlaces)) {
    throw new Error(`decimalPlaces deve ser um inteiro não negativo, recebeu ${decimalPlaces}.`);
  }

  return decimal.toDecimalPlaces(decimalPlaces, ROUNDING[mode]);
}

/** Soma exacta. Uma lista vazia soma zero, não `NaN`. */
export function sum(values: readonly DecimalLike[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(toDecimal(value)), new Decimal(0));
}

/** Representação para persistência: string com casas fixas, nunca `number`. */
export function toStoredString(value: DecimalLike, decimalPlaces = 2): string {
  return toDecimal(value).toFixed(decimalPlaces);
}

export function isWithin(value: DecimalLike, min: DecimalLike, max: DecimalLike): boolean {
  const decimal = toDecimal(value);
  return decimal.greaterThanOrEqualTo(toDecimal(min)) && decimal.lessThanOrEqualTo(toDecimal(max));
}
