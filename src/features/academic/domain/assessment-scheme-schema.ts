import { z } from "zod";

import { optionalNumberField } from "@/components/form/field-schema";
import { AssessmentRegime, ComponentType, RoundingMode } from "@/types";

/**
 * Regras de criação de um esquema de avaliação — a fórmula de cálculo de médias, com os
 * seus componentes. Ver openspec/changes/academic-configuration/design.md.
 *
 * "Esquema + lista", mesma forma que `submitAttendanceSchema` usa para o delta de
 * presenças: um objecto com um array aninhado. Zod valida a FORMA de cada componente
 * (peso positivo, código não vazio); a COERÊNCIA do esquema inteiro (pesos somam 1.0000)
 * fica com `validateScheme` (`grade-engine.ts`), que corre depois, no servidor.
 */
export const assessmentComponentInputSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.enum(ComponentType),
  weight: z.coerce.number().positive(),
  minGrade: optionalNumberField(z.coerce.number().min(0)),
});

export type AssessmentComponentInput = z.infer<typeof assessmentComponentInputSchema>;

export const createAssessmentSchemeSchema = z.object({
  name: z.string().trim().min(1),
  // "none" é o pseudo-item destes dois selectores opcionais — ver a mesma nota em
  // `createStudyPathSchema` para `sectionId`.
  gradeLevelId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
  subjectId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
  regime: z.enum(AssessmentRegime),
  scaleMin: z.coerce.number(),
  scaleMax: z.coerce.number(),
  passMark: z.coerce.number(),
  roundingMode: z.enum(RoundingMode),
  decimalPlaces: z.coerce.number().int().min(0),
  hasExam: z.boolean(),
  examWeight: z.coerce.number().min(0),
  minGradeForExam: optionalNumberField(z.coerce.number()),
  exemptionGrade: optionalNumberField(z.coerce.number()),
  minExamGrade: optionalNumberField(z.coerce.number()),
  components: z.array(assessmentComponentInputSchema),
});

export type CreateAssessmentSchemeInput = z.infer<typeof createAssessmentSchemeSchema>;
