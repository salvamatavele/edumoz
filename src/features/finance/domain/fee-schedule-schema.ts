import { z } from "zod";

import { optionalNumberField } from "@/components/form/field-schema";
import { FeeRecurrence } from "@/types";

/**
 * Regras de criação de tabelas de propinas e das suas rubricas. Ver
 * openspec/changes/finance. `academicYearId` nunca vem do cliente — resolvido a partir do
 * ano lectivo activo, mesmo tratamento que o resto do módulo académico já dá.
 */
export const createFeeScheduleSchema = z.object({
  name: z.string().trim().min(1),
  // "none" é o pseudo-item "Sem âmbito" — mesma convenção de `createStudyPathSchema`
  // para `sectionId`: o Radix Select não aceita um item com `value=""`.
  gradeLevelId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
  studyPathId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
});

export type CreateFeeScheduleInput = z.infer<typeof createFeeScheduleSchema>;

export const createFeeItemSchema = z.object({
  feeScheduleId: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  amount: z.coerce.number().positive().max(9999999999.99).multipleOf(0.01),
  recurrence: z.enum(FeeRecurrence),
  dueDayOfMonth: optionalNumberField(z.coerce.number().int().min(1).max(31)),
  isMandatory: z.boolean(),
});

export type CreateFeeItemInput = z.infer<typeof createFeeItemSchema>;
