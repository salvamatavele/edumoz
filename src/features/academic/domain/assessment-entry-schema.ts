import { z } from "zod";

/**
 * Regras de criação de uma `Assessment` — a avaliação concreta (um teste, um trabalho)
 * dentro de um componente. `teachingGroupId` e `termId` não fazem parte do formulário —
 * vêm da página onde o botão vive, tal como `schoolId` nunca vem do cliente em
 * `create-student.ts`.
 */
export const createAssessmentSchema = z.object({
  teachingGroupId: z.string().trim().min(1),
  termId: z.string().trim().min(1),
  componentId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  maxScore: z.coerce.number().positive(),
  weight: z.coerce.number().positive(),
  date: z.coerce.date(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
