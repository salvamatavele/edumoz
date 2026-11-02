import { z } from "zod";

import { optionalNumberField } from "@/components/form/field-schema";

/**
 * Payload de submissão de notas de uma `Assessment` — só o DELTA face às notas já
 * lançadas, não a lista toda. Mesma forma "esquema + array" que `submitAttendanceSchema`
 * já usa. `score` fica opcional: um aluno ausente (`isAbsent`) pode não ter nota nenhuma.
 */
export const recordGradesSchema = z.object({
  assessmentId: z.string().trim().min(1),
  changes: z.array(
    z.object({
      enrollmentId: z.string().trim().min(1),
      score: optionalNumberField(z.coerce.number().min(0).max(999.99).multipleOf(0.01)),
      isAbsent: z.boolean(),
      note: z.string().trim().optional(),
    }),
  ),
});

export type RecordGradesInput = z.infer<typeof recordGradesSchema>;

export type GradeActionResult =
  | { readonly status: "success" }
  | { readonly status: "error"; readonly message: string };
