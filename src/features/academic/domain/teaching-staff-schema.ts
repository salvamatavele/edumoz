import { z } from "zod";

import { optionalNumberField } from "@/components/form/field-schema";
import { SubjectScope } from "@/types";

/**
 * Regras de gestão de professores e das suas atribuições. Ver
 * openspec/changes/academic-configuration.
 *
 * `userId` nunca faz parte do formulário: liga-se um professor a uma conta de
 * utilizador só pela base de dados, por agora (gap conhecido desde a Fase 6, ver
 * docs/specs/attendance.md).
 */
export const createTeacherSchema = z.object({
  code: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  qualification: z.string().trim().optional().or(z.literal("")),
  maxWeeklyHours: optionalNumberField(z.coerce.number().int().min(0)),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

/** `academicYearId` resolvido a partir do ano lectivo activo — nunca vem do cliente. */
export const createTeachingGroupSchema = z.object({
  name: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  teacherId: z.string().trim().min(1),
  // "none" é o pseudo-item "Sem turma" do `Select` — ver a mesma nota em
  // `createStudyPathSchema` para `sectionId`.
  classGroupId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
  scope: z.enum(SubjectScope),
});

export type CreateTeachingGroupInput = z.infer<typeof createTeachingGroupSchema>;
