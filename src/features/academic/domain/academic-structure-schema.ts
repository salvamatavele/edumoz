import { z } from "zod";

import { DayOfWeek, RoomKind, SchoolCycle, Shift, SubjectScope } from "@/types";

/** "HH:mm", 24 horas — a mesma forma que `ScheduleEntry`/`TimeSlot` guardam no schema. */
const timeOfDay = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * Regras de criação da taxonomia académica — classes, secções, percursos, disciplinas,
 * a relação disciplina↔percurso, e turmas. Ver openspec/changes/academic-configuration.
 *
 * Um esquema por entidade, tal como `student-schema.ts`/`enrollment-schema.ts`: cada um
 * valida dos dois lados (cliente via `zodResolver`, servidor via `safeParse`).
 */

export const createGradeLevelSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  order: z.coerce.number().int().min(0),
  cycle: z.enum(SchoolCycle),
  isExamLevel: z.boolean(),
});

export type CreateGradeLevelInput = z.infer<typeof createGradeLevelSchema>;

export const createSectionSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

/**
 * `code` e `academicYearId` não fazem parte do esquema: o `code` é gerado a partir de
 * classe + secção (ver comentário em `schema.prisma`), e o ano lectivo é sempre o activo —
 * nenhum dos dois é uma escolha do formulário. Mesmo tratamento que `enroll-student.ts` dá
 * a `academicYearId`.
 */
export const createStudyPathSchema = z.object({
  gradeLevelId: z.string().trim().min(1),
  // "none" é o valor do pseudo-item "Sem secção" no `Select` — o Radix Select não aceita
  // um item com `value=""`, daí não poder reutilizar a mesma convenção de string vazia
  // que os campos de texto opcionais usam.
  sectionId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
  name: z.string().trim().min(1),
});

export type CreateStudyPathInput = z.infer<typeof createStudyPathSchema>;

export const createSubjectSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortName: z.string().trim().optional().or(z.literal("")),
  area: z.string().trim().optional().or(z.literal("")),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const createCurriculumSubjectSchema = z.object({
  studyPathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  scope: z.enum(SubjectScope),
  weeklyHours: z.coerce.number().int().min(0),
  coefficient: z.coerce.number().positive(),
  isExamSubject: z.boolean(),
});

export type CreateCurriculumSubjectInput = z.infer<typeof createCurriculumSubjectSchema>;

/** `academicYearId` resolvido a partir do ano lectivo activo — nunca vem do cliente. */
export const createClassGroupSchema = z.object({
  name: z.string().trim().min(1),
  shift: z.enum(Shift),
  capacity: z.coerce.number().int().min(0),
  // "none" é o pseudo-item "Sem director de turma" — mesma convenção de
  // `createStudyPathSchema` para `sectionId`.
  headTeacherId: z.string().trim().optional().or(z.literal("")).or(z.literal("none")),
});

export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;

export const createRoomSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  capacity: z.coerce.number().int().min(0),
  kind: z.enum(RoomKind),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

/**
 * `academicYearId` resolvido a partir do ano lectivo activo — nunca vem do cliente, mesmo
 * tratamento que `createClassGroupSchema` já dá.
 */
export const createTimeSlotSchema = z
  .object({
    dayOfWeek: z.enum(DayOfWeek),
    startTime: timeOfDay,
    endTime: timeOfDay,
    shift: z.enum(Shift),
    order: z.coerce.number().int().min(0),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "endBeforeStart",
    path: ["endTime"],
  });

export type CreateTimeSlotInput = z.infer<typeof createTimeSlotSchema>;
