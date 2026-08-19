import { timeSlotDurationHours } from "@/features/academic/domain/scheduling";
import type { ScheduleEntryCandidate, TeachingGroupMembership } from "@/features/academic/domain/scheduling";
import { getTenantDb } from "@/lib/db/tenant";
import type { DayOfWeek, RoomKind, Shift } from "@/types";

export interface RoomRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly capacity: number;
  readonly kind: RoomKind;
}

export async function listRooms(schoolId: string): Promise<RoomRow[]> {
  const db = getTenantDb(schoolId);
  return db.room.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export interface TimeSlotRow {
  readonly id: string;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: string;
  readonly endTime: string;
  readonly shift: Shift;
  readonly order: number;
}

/** Tempos lectivos do ano lectivo activo, ordenados por dia da semana e ordem. */
export async function listTimeSlots(
  schoolId: string,
): Promise<{ rows: TimeSlotRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const rows = await db.timeSlot.findMany({
    where: { academicYearId: academicYear.id },
    orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
  });

  return { rows, academicYear: academicYear.label };
}

/**
 * O horário todo de um ano lectivo, já no formato que
 * `conflictsForPlacement`/`detectScheduleConflicts` (`domain/schedule-conflicts.ts`)
 * esperam — para quem chama nunca ter de converter linhas do Prisma antes de verificar
 * conflitos.
 */
export async function listScheduleEntriesForYear(
  schoolId: string,
  academicYearId: string,
): Promise<ScheduleEntryCandidate[]> {
  const db = getTenantDb(schoolId);

  const entries = await db.scheduleEntry.findMany({
    where: { academicYearId },
    select: { id: true, teachingGroupId: true, teacherId: true, roomId: true, timeSlotId: true },
  });

  return entries;
}

/**
 * Composição de todos os agrupamentos lectivos do ano — para o conflito de aluno, que só
 * é visível cruzando os membros com o horário (ver `domain/schedule-conflicts.ts`).
 */
export async function listTeachingGroupMemberships(
  schoolId: string,
  academicYearId: string,
): Promise<TeachingGroupMembership[]> {
  const db = getTenantDb(schoolId);

  const groups = await db.teachingGroup.findMany({
    where: { academicYearId },
    select: { id: true, members: { select: { enrollmentId: true } } },
  });

  return groups.map((group) => ({
    teachingGroupId: group.id,
    enrollmentIds: group.members.map((member) => member.enrollmentId),
  }));
}

/**
 * Horas já colocadas por professor no ano lectivo, para o aviso (nunca bloqueio) de
 * `Teacher.maxWeeklyHours`. Só entram professores com pelo menos uma colocação — quem
 * chama trata a ausência como zero horas.
 */
export async function listWeeklyHoursByTeacher(
  schoolId: string,
  academicYearId: string,
): Promise<Map<string, number>> {
  const db = getTenantDb(schoolId);

  const entries = await db.scheduleEntry.findMany({
    where: { academicYearId },
    select: { teacherId: true, timeSlot: { select: { startTime: true, endTime: true } } },
  });

  const hoursByTeacher = new Map<string, number>();

  for (const entry of entries) {
    const duration = timeSlotDurationHours(entry.timeSlot.startTime, entry.timeSlot.endTime);
    hoursByTeacher.set(entry.teacherId, (hoursByTeacher.get(entry.teacherId) ?? 0) + duration);
  }

  return hoursByTeacher;
}

export interface ScheduleBoardEntry {
  readonly id: string;
  readonly teachingGroupId: string;
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly roomId: string;
  readonly roomName: string;
  readonly timeSlotId: string;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: string;
  readonly endTime: string;
  /** Nulo para agrupamentos de Secção/Currículo interno, que não correspondem a UMA turma. */
  readonly classGroupId: string | null;
}

export interface ScheduleBoardTeachingGroupOption {
  readonly id: string;
  readonly name: string;
  readonly subjectName: string;
  readonly teacherId: string | null;
  readonly teacherName: string | null;
  readonly classGroupId: string | null;
}

export interface ScheduleBoardOptions {
  readonly teachingGroups: readonly ScheduleBoardTeachingGroupOption[];
  readonly rooms: readonly RoomRow[];
  readonly timeSlots: readonly TimeSlotRow[];
  readonly teachers: readonly { readonly id: string; readonly name: string }[];
  readonly classGroups: readonly { readonly id: string; readonly name: string }[];
}

export interface ScheduleBoardData {
  readonly entries: readonly ScheduleBoardEntry[];
  readonly options: ScheduleBoardOptions;
  readonly candidates: readonly ScheduleEntryCandidate[];
  readonly memberships: readonly TeachingGroupMembership[];
  readonly academicYear: string | null;
}

const EMPTY_SCHEDULE_BOARD_DATA: ScheduleBoardData = {
  entries: [],
  options: { teachingGroups: [], rooms: [], timeSlots: [], teachers: [], classGroups: [] },
  candidates: [],
  memberships: [],
  academicYear: null,
};

/**
 * Tudo o que a grelha de montagem (`ScheduleBoard`) precisa, numa só chamada: o horário já
 * com nomes resolvidos para apresentação, as opções dos selectores, e os dados crus
 * (`candidates`/`memberships`) para `conflictsForPlacement` correr no cliente antes de
 * submeter — a mesma verificação que o servidor repete em `placeScheduleEntry`.
 */
export async function getScheduleBoardData(schoolId: string): Promise<ScheduleBoardData> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return EMPTY_SCHEDULE_BOARD_DATA;

  const [entries, teachingGroups, rooms, timeSlots, teachers, classGroups, candidates, memberships] =
    await Promise.all([
      db.scheduleEntry.findMany({
        where: { academicYearId: academicYear.id },
        select: {
          id: true,
          teachingGroupId: true,
          teachingGroup: { select: { name: true, subject: { select: { name: true } }, classGroupId: true } },
          teacherId: true,
          teacher: { select: { firstName: true, lastName: true } },
          roomId: true,
          room: { select: { name: true } },
          timeSlotId: true,
          timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
      db.teachingGroup.findMany({
        where: { academicYearId: academicYear.id },
        select: {
          id: true,
          name: true,
          subject: { select: { name: true } },
          teacherId: true,
          teacher: { select: { firstName: true, lastName: true } },
          classGroupId: true,
        },
        orderBy: { name: "asc" },
      }),
      listRooms(schoolId),
      db.timeSlot.findMany({
        where: { academicYearId: academicYear.id },
        orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
      }),
      db.teacher.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      db.classGroup.findMany({
        where: { academicYearId: academicYear.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      listScheduleEntriesForYear(schoolId, academicYear.id),
      listTeachingGroupMemberships(schoolId, academicYear.id),
    ]);

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      teachingGroupId: entry.teachingGroupId,
      teachingGroupName: entry.teachingGroup.name,
      subjectName: entry.teachingGroup.subject.name,
      teacherId: entry.teacherId,
      teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
      roomId: entry.roomId,
      roomName: entry.room.name,
      timeSlotId: entry.timeSlotId,
      dayOfWeek: entry.timeSlot.dayOfWeek,
      startTime: entry.timeSlot.startTime,
      endTime: entry.timeSlot.endTime,
      classGroupId: entry.teachingGroup.classGroupId,
    })),
    options: {
      teachingGroups: teachingGroups.map((group) => ({
        id: group.id,
        name: group.name,
        subjectName: group.subject.name,
        teacherId: group.teacherId,
        teacherName: group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : null,
        classGroupId: group.classGroupId,
      })),
      rooms,
      timeSlots,
      teachers: teachers.map((teacher) => ({ id: teacher.id, name: `${teacher.firstName} ${teacher.lastName}` })),
      classGroups,
    },
    candidates,
    memberships,
    academicYear: academicYear.label,
  };
}

export interface ScheduleViewEntry {
  readonly id: string;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: string;
  readonly endTime: string;
  readonly subjectName: string;
  readonly teachingGroupName: string;
  readonly teacherName: string;
  readonly roomName: string;
}

const SCHEDULE_VIEW_ENTRY_SELECT = {
  id: true,
  teacher: { select: { firstName: true, lastName: true } },
  teachingGroup: { select: { name: true, subject: { select: { name: true } } } },
  room: { select: { name: true } },
  timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } },
} as const;

function toScheduleViewEntry(entry: {
  id: string;
  teacher: { firstName: string; lastName: string };
  teachingGroup: { name: string; subject: { name: string } };
  room: { name: string };
  timeSlot: { dayOfWeek: DayOfWeek; startTime: string; endTime: string };
}): ScheduleViewEntry {
  return {
    id: entry.id,
    dayOfWeek: entry.timeSlot.dayOfWeek,
    startTime: entry.timeSlot.startTime,
    endTime: entry.timeSlot.endTime,
    subjectName: entry.teachingGroup.subject.name,
    teachingGroupName: entry.teachingGroup.name,
    teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
    roomName: entry.room.name,
  };
}

/** Horário do professor no ano lectivo activo — Tronco Comum, Secção e Currículo Interno juntos. */
export async function getTeacherSchedule(schoolId: string, teacherId: string): Promise<ScheduleViewEntry[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!academicYear) return [];

  const entries = await db.scheduleEntry.findMany({
    where: { academicYearId: academicYear.id, teacherId },
    select: SCHEDULE_VIEW_ENTRY_SELECT,
    orderBy: [{ timeSlot: { dayOfWeek: "asc" } }, { timeSlot: { order: "asc" } }],
  });

  return entries.map(toScheduleViewEntry);
}

/**
 * Horário de um aluno no ano lectivo activo — dos agrupamentos da matrícula desse ano,
 * nunca de outro. `null` quando o aluno não tem matrícula no ano activo (aluno criado mas
 * ainda por matricular).
 */
export async function getStudentSchedule(schoolId: string, studentId: string): Promise<ScheduleViewEntry[] | null> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!academicYear) return null;

  const enrollment = await db.enrollment.findFirst({
    where: { studentId, academicYearId: academicYear.id },
    select: { id: true },
  });

  if (!enrollment) return null;

  const entries = await db.scheduleEntry.findMany({
    where: {
      academicYearId: academicYear.id,
      teachingGroup: { members: { some: { enrollmentId: enrollment.id } } },
    },
    select: SCHEDULE_VIEW_ENTRY_SELECT,
    orderBy: [{ timeSlot: { dayOfWeek: "asc" } }, { timeSlot: { order: "asc" } }],
  });

  return entries.map(toScheduleViewEntry);
}

export interface ScheduleGuardianChild {
  readonly studentId: string;
  readonly name: string;
}

export interface PortalSchedule {
  /** Vazio para um aluno — só um encarregado com vários educandos precisa de escolher. */
  readonly children: readonly ScheduleGuardianChild[];
  readonly selectedStudentName: string | null;
  readonly entries: readonly ScheduleViewEntry[] | null;
}

/**
 * Horário de "o meu horário" (aluno) ou "o horário do meu educando" (encarregado) —
 * nunca de outro aluno. Mesmo padrão de autorização que `getPortalGrades`
 * (`student-grades.ts`): um encarregado só vê um educando com `StudentGuardian` a
 * ligá-los; pedir outro `studentId` é ignorado, não um erro.
 */
export async function getPortalSchedule(
  schoolId: string,
  role: "STUDENT" | "GUARDIAN",
  userId: string,
  requestedStudentId?: string,
): Promise<PortalSchedule> {
  const db = getTenantDb(schoolId);

  if (role === "STUDENT") {
    const student = await db.student.findFirst({ where: { userId }, select: { id: true, firstName: true, lastName: true } });
    if (!student) return { children: [], selectedStudentName: null, entries: null };

    return {
      children: [],
      selectedStudentName: `${student.firstName} ${student.lastName}`,
      entries: await getStudentSchedule(schoolId, student.id),
    };
  }

  const guardian = await db.guardian.findFirst({
    where: { userId },
    select: {
      students: {
        select: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { student: { firstName: "asc" } },
      },
    },
  });

  const children: ScheduleGuardianChild[] = (guardian?.students ?? []).map((link) => ({
    studentId: link.student.id,
    name: `${link.student.firstName} ${link.student.lastName}`,
  }));

  if (children.length === 0) return { children: [], selectedStudentName: null, entries: null };

  const target = children.find((child) => child.studentId === requestedStudentId) ?? children[0];

  return {
    children,
    selectedStudentName: target.name,
    entries: await getStudentSchedule(schoolId, target.studentId),
  };
}

/**
 * Horário semanal de uma turma — junta os `ScheduleEntry`s de todos os agrupamentos com
 * pelo menos um membro matriculado nessa `ClassGroup`, no ano lectivo activo. Para
 * exportação/impressão (`/timetables`, gestor). O filtro `members: { some: ... } }` é uma
 * verificação de existência por linha, não um `JOIN` — não duplica `ScheduleEntry`s, nem
 * quando o agrupamento tem vários membros da turma (ex.: Tronco Comum).
 */
export async function getClassGroupSchedule(
  schoolId: string,
  classGroupId: string,
): Promise<ScheduleViewEntry[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!academicYear) return [];

  const entries = await db.scheduleEntry.findMany({
    where: {
      academicYearId: academicYear.id,
      teachingGroup: { members: { some: { enrollment: { classGroupId } } } },
    },
    select: SCHEDULE_VIEW_ENTRY_SELECT,
    orderBy: [{ timeSlot: { dayOfWeek: "asc" } }, { timeSlot: { order: "asc" } }],
  });

  return entries.map(toScheduleViewEntry);
}
