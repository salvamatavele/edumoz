// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { getAttendanceRoster, listHeadTeacherClassGroupIds, listTeacherScheduleForDate } = await import(
  "./attendance"
);
const { todaysDayOfWeek } = await import("@/features/academic/domain/attendance");

/**
 * Director de turma: vê presenças de disciplinas que não lecciona, desde que sejam da
 * turma que dirige — nunca edita (`submit-attendance.test.ts` já cobre a recusa de
 * escrita a quem não é dono da `ScheduleEntry`, director ou não).
 * Ver openspec/changes/permissions-management/design.md.
 */
describe("director de turma — presenças", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let ownTeacherId = "";
  let directorTeacherId = "";
  let otherTeacherId = "";
  let directedClassGroupId = "";
  let scheduleEntryId = "";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = todaysDayOfWeek(today);

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `HT-${suffix}`, name: "Escola de teste (director de turma)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;

    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        year: 2026,
        label: "2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-15"),
        isActive: true,
      },
    });

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });
    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });
    const subject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });

    const ownTeacher = await prisma.teacher.create({
      data: { schoolId, code: `PROF-OWN-${suffix}`, firstName: "Dona", lastName: "Disciplina" },
    });
    ownTeacherId = ownTeacher.id;

    const directorTeacher = await prisma.teacher.create({
      data: { schoolId, code: `PROF-DIR-${suffix}`, firstName: "Director", lastName: "Turma" },
    });
    directorTeacherId = directorTeacher.id;

    const otherTeacher = await prisma.teacher.create({
      data: { schoolId, code: `PROF-OTHER-${suffix}`, firstName: "Outro", lastName: "Professor" },
    });
    otherTeacherId = otherTeacher.id;

    const classGroup = await prisma.classGroup.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: `10A-${suffix}`,
        shift: "MORNING",
        headTeacherId: directorTeacherId,
      },
    });
    directedClassGroupId = classGroup.id;

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluno", lastName: "Teste", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}` },
    });

    const teachingGroup = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subject.id, teacherId: ownTeacherId, name: `Mat-${suffix}`, scope: "CORE" },
    });

    await prisma.teachingGroupMember.create({
      data: { teachingGroupId: teachingGroup.id, enrollmentId: enrollment.id },
    });

    const room = await prisma.room.create({ data: { schoolId, code: `SALA-${suffix}`, name: `Sala ${suffix}`, capacity: 30, kind: "CLASSROOM" } });
    const timeSlot = await prisma.timeSlot.create({
      data: { schoolId, academicYearId: academicYear.id, shift: "MORNING", dayOfWeek, startTime: "08:00", endTime: "08:45", order: 1 },
    });

    const scheduleEntry = await prisma.scheduleEntry.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        teachingGroupId: teachingGroup.id,
        teacherId: ownTeacherId,
        roomId: room.id,
        timeSlotId: timeSlot.id,
      },
    });
    scheduleEntryId = scheduleEntry.id;
  });

  afterAll(async () => {
    // `Enrollment.classGroup` não tem `onDelete: Cascade` — apagar antes da escola evita
    // que a cascata tente apagar `ClassGroup` com matrículas ainda a apontar para ela.
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("listHeadTeacherClassGroupIds devolve as turmas dirigidas, e nenhuma para quem não dirige", async () => {
    expect(await listHeadTeacherClassGroupIds(schoolId, directorTeacherId)).toEqual([directedClassGroupId]);
    expect(await listHeadTeacherClassGroupIds(schoolId, ownTeacherId)).toEqual([]);
  });

  it("listTeacherScheduleForDate mostra a aula ao professor dono, marcada isOwn", async () => {
    const schedule = await listTeacherScheduleForDate(schoolId, ownTeacherId, today);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].isOwn).toBe(true);
  });

  it("listTeacherScheduleForDate mostra a aula ao director de turma, marcada isOwn: false", async () => {
    const schedule = await listTeacherScheduleForDate(schoolId, directorTeacherId, today);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].isOwn).toBe(false);
  });

  it("listTeacherScheduleForDate não mostra nada a um professor sem aulas nem turma dirigida", async () => {
    expect(await listTeacherScheduleForDate(schoolId, otherTeacherId, today)).toEqual([]);
  });

  it("rejects invalid dates and dates outside the active school year", async () => {
    for (const date of [new Date("invalid"), new Date("2025-03-02")]) {
      expect(await getAttendanceRoster(schoolId, scheduleEntryId, date, ownTeacherId)).toBeNull();
      expect(await listTeacherScheduleForDate(schoolId, ownTeacherId, date)).toEqual([]);
    }
    const wrongWeekday = new Date(today.getTime() + 86400000);
    expect(await getAttendanceRoster(schoolId, scheduleEntryId, wrongWeekday, ownTeacherId)).toBeNull();
  });

  it("does not treat an administrative roster read as teaching ownership", async () => {
    expect((await getAttendanceRoster(schoolId, scheduleEntryId, today))?.isOwn).toBe(false);
  });

  it("getAttendanceRoster: isOwn verdadeiro para o professor dono", async () => {
    const roster = await getAttendanceRoster(schoolId, scheduleEntryId, today, ownTeacherId);
    expect(roster?.isOwn).toBe(true);
  });

  it("getAttendanceRoster: isOwn falso para o director de turma, mas continua a ver o roster", async () => {
    const roster = await getAttendanceRoster(schoolId, scheduleEntryId, today, directorTeacherId);
    expect(roster).not.toBeNull();
    expect(roster?.isOwn).toBe(false);
    expect(roster?.entries).toHaveLength(1);
  });

  it("getAttendanceRoster: null para um professor que nem lecciona nem dirige a turma", async () => {
    const roster = await getAttendanceRoster(schoolId, scheduleEntryId, today, otherTeacherId);
    expect(roster).toBeNull();
  });
});
