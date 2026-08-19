import { z } from "zod";

/**
 * Colocação de um agrupamento lectivo num tempo e sala. `id` só vem preenchido numa
 * remarcação — a própria entrada é excluída da verificação de conflitos nesse caso (ver
 * `conflictsForPlacement`, `domain/schedule-conflicts.ts`). `academicYearId` nunca vem do
 * cliente, mesmo tratamento que o resto do módulo académico já dá.
 */
export const placeScheduleEntrySchema = z.object({
  id: z.string().trim().min(1).optional(),
  teachingGroupId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  timeSlotId: z.string().trim().min(1),
});

export type PlaceScheduleEntryInput = z.infer<typeof placeScheduleEntrySchema>;

/**
 * `conflict` é distinto de `error`: um conflito é uma resposta esperada do domínio (a
 * colocação pedida colide com outra), com texto já traduzido para cada um — nunca um erro
 * genérico. `warning` acompanha um `success` quando a colocação excede
 * `Teacher.maxWeeklyHours`, sem impedir a gravação.
 */
export type PlaceScheduleEntryResult =
  | { readonly status: "success"; readonly warning?: string }
  | { readonly status: "conflict"; readonly conflicts: readonly string[] }
  | { readonly status: "error"; readonly message: string };
