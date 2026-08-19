import {
  computeAttendanceSummary,
  todaysDayOfWeek,
  type AttendanceRecordInput,
  type AttendanceSummary,
} from "@/features/academic/domain/attendance";
import { TIME_ZONE } from "@/i18n/formats";
import { getTenantDb } from "@/lib/db/tenant";
import type { AttendanceSessionStatus } from "@/types";

/**
 * Data de hoje em Africa/Maputo, à meia-noite UTC — a mesma forma que `z.coerce.date()`
 * produz a partir de um `<input type="date">`, para as duas fontes acabarem no mesmo
 * formato que `AttendanceSession.date` (`@db.Date`) espera.
 */
export function todayInMaputo(): Date {
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${isoDate}T00:00:00.000Z`);
}

/**
 * Primeira ponte sessão → perfil profissional: até aqui nenhum módulo precisara de saber
 * QUAL `Teacher` corresponde ao utilizador autenticado — só o papel/escola da `Membership`.
 * Devolve `null` quando o papel é `TEACHER` mas ainda não há `Teacher` ligado (convite
 * aceite antes do perfil existir); quem chama trata isso como "sem agrupamentos", não erro.
 */
export async function findTeacherByUserId(schoolId: string, userId: string) {
  const db = getTenantDb(schoolId);
  return db.teacher.findFirst({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
}

/**
 * Turmas que o professor dirige (`ClassGroup.headTeacherId`), no ano lectivo activo. Um
 * director de turma vê presenças e notas da turma inteira, mesmo em disciplinas que não
 * lecciona — nunca as edita (ver openspec/changes/permissions-management/design.md,
 * Non-Goals). As Server Actions de escrita continuam a verificar posse directa
 * (`teacherId`), por isso alargar aqui a LEITURA é seguro por construção.
 */
export async function listHeadTeacherClassGroupIds(
  schoolId: string,
  teacherId: string,
): Promise<string[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return [];

  const classGroups = await db.classGroup.findMany({
    where: { headTeacherId: teacherId, academicYearId: academicYear.id },
    select: { id: true },
  });

  return classGroups.map((group) => group.id);
}

export interface TeacherScheduleEntry {
  readonly scheduleEntryId: string;
  readonly teachingGroupId: string;
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly roomName: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly sessionStatus: AttendanceSessionStatus | null;
  /** Falso quando visível só por o professor dirigir a turma, não por leccionar. */
  readonly isOwn: boolean;
}

/**
 * Agrupamentos do professor no dia da semana de `date` — nunca uma escolha livre. Sai de
 * `ScheduleEntry`, o horário real, não de uma lista de todos os agrupamentos da escola.
 *
 * Um director de turma vê também as aulas de outros professores para as turmas que
 * dirige, marcadas `isOwn: false` — só para consulta (ver `listHeadTeacherClassGroupIds`).
 */
export async function listTeacherScheduleForDate(
  schoolId: string,
  teacherId: string,
  date: Date,
): Promise<TeacherScheduleEntry[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return [];

  const dayOfWeek = todaysDayOfWeek(date);
  const directedClassGroupIds = await listHeadTeacherClassGroupIds(schoolId, teacherId);

  const entries = await db.scheduleEntry.findMany({
    where: {
      academicYearId: academicYear.id,
      timeSlot: { dayOfWeek },
      OR:
        directedClassGroupIds.length > 0
          ? [
              { teacherId },
              {
                teachingGroup: {
                  members: { some: { enrollment: { classGroupId: { in: directedClassGroupIds } } } },
                },
              },
            ]
          : [{ teacherId }],
    },
    select: {
      id: true,
      teacherId: true,
      teachingGroupId: true,
      timeSlotId: true,
      teachingGroup: { select: { name: true, subject: { select: { name: true } } } },
      room: { select: { name: true } },
      timeSlot: { select: { startTime: true, endTime: true, order: true } },
    },
    orderBy: { timeSlot: { order: "asc" } },
  });

  if (entries.length === 0) return [];

  const sessions = await db.attendanceSession.findMany({
    where: { teachingGroupId: { in: entries.map((entry) => entry.teachingGroupId) }, date },
    select: { teachingGroupId: true, timeSlotId: true, status: true },
  });

  const sessionStatusByKey = new Map(
    sessions.map((session) => [`${session.teachingGroupId}:${session.timeSlotId}`, session.status]),
  );

  return entries.map((entry) => ({
    scheduleEntryId: entry.id,
    teachingGroupId: entry.teachingGroupId,
    teachingGroupName: entry.teachingGroup.name,
    subjectName: entry.teachingGroup.subject.name,
    roomName: entry.room.name,
    startTime: entry.timeSlot.startTime,
    endTime: entry.timeSlot.endTime,
    sessionStatus: sessionStatusByKey.get(`${entry.teachingGroupId}:${entry.timeSlotId}`) ?? null,
    isOwn: entry.teacherId === teacherId,
  }));
}

export interface AttendanceRosterEntry {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly status: string;
}

export interface AttendanceRoster {
  readonly teachingGroupId: string;
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly sessionId: string | null;
  readonly sessionStatus: AttendanceSessionStatus | null;
  readonly entries: readonly AttendanceRosterEntry[];
  /** Falso quando `viewerTeacherId` não é quem lecciona — só consulta. */
  readonly isOwn: boolean;
}

/**
 * Alunos da folha de marcação — do agrupamento (`TeachingGroupMember`), nunca da turma.
 * Um agrupamento de Secção reúne alunos de turmas diferentes que seguem o mesmo percurso;
 * partir da turma mostraria alunos a mais.
 *
 * `viewerTeacherId` decide quem pode SEQUER ver isto: o professor dono, ou um director de
 * turma de alguma das matrículas do agrupamento (`isOwn: false`, nesse caso). A
 * autorização real de ESCRITA vive em `submit-attendance.ts`, que volta a verificar posse
 * directa — esta função nunca a substitui.
 */
export async function getAttendanceRoster(
  schoolId: string,
  scheduleEntryId: string,
  date: Date,
  viewerTeacherId: string | null = null,
): Promise<AttendanceRoster | null> {
  const db = getTenantDb(schoolId);

  const scheduleEntry = await db.scheduleEntry.findUnique({
    where: { id: scheduleEntryId },
    select: {
      teacherId: true,
      teachingGroupId: true,
      timeSlotId: true,
      teachingGroup: { select: { name: true, subject: { select: { name: true } } } },
    },
  });

  if (!scheduleEntry) return null;

  let isOwn = true;

  if (viewerTeacherId !== null) {
    isOwn = scheduleEntry.teacherId === viewerTeacherId;

    if (!isOwn) {
      const directedClassGroupIds = await listHeadTeacherClassGroupIds(schoolId, viewerTeacherId);
      if (directedClassGroupIds.length === 0) return null;

      const hasDirectedMember = await db.teachingGroupMember.findFirst({
        where: {
          teachingGroupId: scheduleEntry.teachingGroupId,
          enrollment: { classGroupId: { in: directedClassGroupIds } },
        },
        select: { enrollmentId: true },
      });

      if (!hasDirectedMember) return null;
    }
  }

  const [members, session] = await Promise.all([
    db.teachingGroupMember.findMany({
      where: { teachingGroupId: scheduleEntry.teachingGroupId },
      select: {
        enrollmentId: true,
        enrollment: { select: { student: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { enrollment: { student: { lastName: "asc" } } },
    }),
    db.attendanceSession.findFirst({
      where: {
        teachingGroupId: scheduleEntry.teachingGroupId,
        date,
        timeSlotId: scheduleEntry.timeSlotId,
      },
      select: {
        id: true,
        status: true,
        records: { select: { enrollmentId: true, status: true } },
      },
    }),
  ]);

  const statusByEnrollment = new Map(
    session?.records.map((record) => [record.enrollmentId, record.status]) ?? [],
  );

  const entries = members.map((member) => ({
    enrollmentId: member.enrollmentId,
    studentName: `${member.enrollment.student.firstName} ${member.enrollment.student.lastName}`,
    status: statusByEnrollment.get(member.enrollmentId) ?? "PRESENT",
  }));

  return {
    teachingGroupId: scheduleEntry.teachingGroupId,
    teachingGroupName: scheduleEntry.teachingGroup.name,
    subjectName: scheduleEntry.teachingGroup.subject.name,
    sessionId: session?.id ?? null,
    sessionStatus: session?.status ?? null,
    entries,
    isOwn,
  };
}

export interface AttendanceReportFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface AttendanceReportFilters {
  readonly classGroups: readonly AttendanceReportFilterOption[];
  readonly terms: readonly AttendanceReportFilterOption[];
}

/** Opções dos dois selectores do mapa de assiduidade — turmas e períodos do ano activo. */
export async function listAttendanceReportFilters(
  schoolId: string,
): Promise<AttendanceReportFilters> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return { classGroups: [], terms: [] };

  const [classGroups, terms] = await Promise.all([
    db.classGroup.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.term.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, name: true },
      orderBy: { sequence: "asc" },
    }),
  ]);

  return {
    classGroups: classGroups.map((group) => ({ id: group.id, label: group.name })),
    terms: terms.map((term) => ({ id: term.id, label: term.name })),
  };
}

export interface AttendanceReportRow {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly summary: AttendanceSummary;
}

/** Mapa de assiduidade: por aluno de uma turma, num período, com faltas por disciplina. */
export async function getAttendanceReport(
  schoolId: string,
  classGroupId: string,
  termId: string,
): Promise<AttendanceReportRow[]> {
  const db = getTenantDb(schoolId);

  const term = await db.term.findUnique({
    where: { id: termId },
    select: { startDate: true, endDate: true },
  });

  if (!term) return [];

  const enrollments = await db.enrollment.findMany({
    where: { classGroupId },
    select: { id: true, student: { select: { firstName: true, lastName: true } } },
    orderBy: { student: { lastName: "asc" } },
  });

  if (enrollments.length === 0) return [];

  const records = await db.attendanceRecord.findMany({
    where: {
      enrollmentId: { in: enrollments.map((enrollment) => enrollment.id) },
      session: { date: { gte: term.startDate, lte: term.endDate } },
    },
    select: {
      enrollmentId: true,
      status: true,
      session: {
        select: {
          teachingGroup: { select: { subjectId: true, subject: { select: { name: true } } } },
        },
      },
    },
  });

  const recordsByEnrollment = new Map<string, AttendanceRecordInput[]>();
  for (const record of records) {
    const list = recordsByEnrollment.get(record.enrollmentId) ?? [];
    list.push({
      status: record.status,
      subjectId: record.session.teachingGroup.subjectId,
      subjectName: record.session.teachingGroup.subject.name,
    });
    recordsByEnrollment.set(record.enrollmentId, list);
  }

  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    summary: computeAttendanceSummary(recordsByEnrollment.get(enrollment.id) ?? []),
  }));
}
