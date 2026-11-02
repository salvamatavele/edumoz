import { z } from "zod";

import { optionalNumberField } from "@/components/form/field-schema";

/**
 * Geração de facturas em lote. `periodMonth` presente selecciona as rubricas `MONTHLY`
 * dessa tabela de propinas (uma factura por mês); ausente selecciona as rubricas
 * `TERM`/`ANNUAL`/`ONE_OFF` (uma factura para o `periodYear` inteiro) — nunca as duas
 * misturadas na mesma factura. Ver openspec/changes/finance/design.md.
 */
export const generateInvoicesSchema = z.object({
  feeScheduleId: z.string().trim().min(1),
  periodYear: z.coerce.number().int().min(2000).max(9999),
  periodMonth: optionalNumberField(z.coerce.number().int().min(1).max(12)),
});

/** Shared period rules for issuance and read filters. */
export const invoicePeriodSchema = generateInvoicesSchema.pick({ periodYear: true, periodMonth: true });

export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export interface GenerateInvoicesResult {
  readonly status: "success" | "error";
  readonly message?: string;
  /** Número de facturas efectivamente criadas — o resto já existia (idempotente). */
  readonly created?: number;
  readonly skipped?: number;
}
