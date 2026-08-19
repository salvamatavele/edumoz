import type { DayOfWeek, Shift } from "@/types";

/**
 * Tipos do motor de horários.
 *
 * A verificação de conflitos trabalha sobre estas estruturas e não sobre linhas do Prisma,
 * porque tem de correr sobre horários hipotéticos — o que o utilizador está a arrastar no
 * ecrã antes de gravar. Ver docs/specs/domain-foundation.md §4.5.
 */

export interface TimeSlotRef {
  readonly id: string;
  readonly dayOfWeek: DayOfWeek;
  /** "HH:mm". Sem fuso horário de propósito — um tempo lectivo não tem fuso. */
  readonly startTime: string;
  readonly endTime: string;
  readonly shift: Shift;
}

/** Uma aula colocada no horário, real ou apenas proposta. */
export interface ScheduleEntryCandidate {
  /** Ausente quando a aula ainda não foi gravada. */
  readonly id?: string;
  readonly teachingGroupId: string;
  readonly teacherId: string;
  readonly roomId: string;
  readonly timeSlotId: string;
}

/**
 * Composição dos agrupamentos, para o conflito de aluno.
 *
 * Este é o conflito que nenhum índice da base de dados consegue exprimir: uma matrícula
 * pertence a vários agrupamentos ao mesmo tempo, portanto a colisão só é visível quando
 * se cruza a lista de membros com o horário.
 */
export interface TeachingGroupMembership {
  readonly teachingGroupId: string;
  readonly enrollmentIds: readonly string[];
}

export type ScheduleConflict =
  | {
      readonly kind: "TEACHER_DOUBLE_BOOKED";
      readonly timeSlotId: string;
      readonly teacherId: string;
      readonly teachingGroupIds: readonly [string, string];
    }
  | {
      readonly kind: "ROOM_DOUBLE_BOOKED";
      readonly timeSlotId: string;
      readonly roomId: string;
      readonly teachingGroupIds: readonly [string, string];
    }
  | {
      readonly kind: "STUDENT_DOUBLE_BOOKED";
      readonly timeSlotId: string;
      readonly enrollmentId: string;
      readonly teachingGroupIds: readonly [string, string];
    }
  | {
      readonly kind: "GROUP_DOUBLE_BOOKED";
      readonly timeSlotId: string;
      readonly teachingGroupId: string;
    };

export interface ScheduleConflictCheck {
  readonly entries: readonly ScheduleEntryCandidate[];
  readonly memberships: readonly TeachingGroupMembership[];
}

/**
 * Duração de um tempo lectivo, em horas (pode ser fraccionária — um tempo de 45 minutos
 * conta 0.75). Usada para somar a carga horária semanal de um professor contra
 * `Teacher.maxWeeklyHours`, que é sempre um aviso, nunca um bloqueio (ver design.md).
 */
export function timeSlotDurationHours(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  return minutes / 60;
}
