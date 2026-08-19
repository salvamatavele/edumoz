import { AttendanceStatus, DayOfWeek } from "@/types";

/**
 * Motor de presenças — puro, sem Prisma nem data actual. Ver
 * openspec/changes/attendance/design.md.
 */

export interface AttendanceRecordInput {
  readonly status: AttendanceStatus;
  readonly subjectId: string;
  readonly subjectName: string;
}

export interface SubjectAttendanceCount {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly present: number;
  readonly absent: number;
  readonly late: number;
  readonly excused: number;
}

export interface AttendanceSummary {
  readonly bySubject: readonly SubjectAttendanceCount[];
  /** Só `ABSENT` — "falta" no sentido comum. `LATE` e `EXCUSED` contam à parte. */
  readonly totalAbsences: number;
}

/**
 * Agrega registos de presença por disciplina.
 *
 * Por disciplina e não por dia: um aluno que falta a duas disciplinas no mesmo dia tem
 * duas faltas, uma em cada — nunca uma falta genérica "do dia". Ver RF-08.
 */
export function computeAttendanceSummary(
  records: readonly AttendanceRecordInput[],
): AttendanceSummary {
  const bySubject = new Map<string, SubjectAttendanceCount>();

  for (const record of records) {
    const current = bySubject.get(record.subjectId) ?? {
      subjectId: record.subjectId,
      subjectName: record.subjectName,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    bySubject.set(record.subjectId, {
      ...current,
      present: current.present + (record.status === AttendanceStatus.PRESENT ? 1 : 0),
      absent: current.absent + (record.status === AttendanceStatus.ABSENT ? 1 : 0),
      late: current.late + (record.status === AttendanceStatus.LATE ? 1 : 0),
      excused: current.excused + (record.status === AttendanceStatus.EXCUSED ? 1 : 0),
    });
  }

  const subjects = [...bySubject.values()].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName),
  );

  return {
    bySubject: subjects,
    totalAbsences: subjects.reduce((sum, subject) => sum + subject.absent, 0),
  };
}

export interface AbsenceExclusionRule {
  /** Número de faltas NUMA disciplina que leva à exclusão. Por confirmar — ver design.md. */
  readonly maxAbsences: number;
}

/**
 * Um aluno é excluído se ultrapassar o limite de faltas em QUALQUER disciplina, não pela
 * soma de todas — a prática moçambicana avalia a exclusão disciplina a disciplina.
 */
export function isExcludedByAbsences(
  summary: AttendanceSummary,
  rule: AbsenceExclusionRule,
): boolean {
  return summary.bySubject.some((subject) => subject.absent > rule.maxAbsences);
}

const DAY_OF_WEEK_BY_UTC_INDEX: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/**
 * Dia da semana de uma data, para cruzar com `TimeSlot.dayOfWeek`.
 *
 * Usa `getUTCDay()`, não `getDay()`: uma data escolhida num `<input type="date">` chega
 * como meia-noite UTC, e `getDay()` lê-a no fuso do servidor — que em produção não é
 * necessariamente `Africa/Maputo` e podia devolver o dia errado perto da meia-noite.
 */
export function todaysDayOfWeek(date: Date): DayOfWeek {
  return DAY_OF_WEEK_BY_UTC_INDEX[date.getUTCDay()];
}
