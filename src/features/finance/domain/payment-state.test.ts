import { describe, expect, it } from "vitest";

import type { PaymentStatus } from "@/types";

import { canTransition } from "./payment-state";

const ALL_STATUSES: readonly PaymentStatus[] = ["INITIATED", "PENDING", "CONFIRMED", "FAILED", "REVERSED"];

const VALID_PAIRS: ReadonlyArray<readonly [PaymentStatus, PaymentStatus]> = [
  ["INITIATED", "PENDING"],
  ["INITIATED", "CONFIRMED"],
  ["INITIATED", "FAILED"],
  ["PENDING", "CONFIRMED"],
  ["PENDING", "FAILED"],
  ["CONFIRMED", "REVERSED"],
];

describe("canTransition", () => {
  it.each(VALID_PAIRS)("permite %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it("recusa qualquer combinação não listada como válida", () => {
    const validSet = new Set(VALID_PAIRS.map(([from, to]) => `${from}->${to}`));

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = validSet.has(`${from}->${to}`);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });

  it("recusa permanecer no mesmo estado", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("recusa sair de FAILED ou REVERSED — são estados terminais", () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition("FAILED", to)).toBe(false);
      expect(canTransition("REVERSED", to)).toBe(false);
    }
  });
});
