// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const {
  listScheduleEntriesForYear,
  listTeachingGroupMemberships,
  listWeeklyHoursByTeacher,
  getTeacherSchedule,
  getStudentSchedule,
  getPortalSchedule,
  getClassGroupSchedule,
} = await import("./scheduling");

describe("scheduling — leitura do horário", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let academicYearId = "";
  let teacherAId = "";
  let teacherBId = "";
  let groupAId = "";
  let groupBId = "";
  let enrollmentId = "";
  let studentId = "";
  let classGroupId = "";
  let entryA1Id = "";
  let entryA2Id = "";
  let entryBId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `SCH-${suffix}`, name: "Escola de teste (horário)", province: "Maputo", district: "KaMpfumu" },
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
    academicYearId = academicYear.id;

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });
    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });
    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId, name: `10A-${suffix}`, shift: "MORNING" },
    });
    classGroupId = classGroup.id;

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluno", lastName: "Teste", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    studentId = student.id;
    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}` },
    });
    enrollmentId = enrollment.id;

    const subjectA = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });
    const subjectB = await prisma.subject.create({ data: { schoolId, code: `POR-${suffix}`, name: "Português" } });

    const teacherA = await prisma.teacher.create({
      data: { schoolId, code: `PROF-A-${suffix}`, firstName: "Elsa", lastName: "Chirindza" },
    });
    teacherAId = teacherA.id;
    const teacherB = await prisma.teacher.create({
      data: { schoolId, code: `PROF-B-${suffix}`, firstName: "João", lastName: "Muianga" },
    });
    teacherBId = teacherB.id;

    const groupA = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId, subjectId: subjectA.id, teacherId: teacherAId, name: `Mat-${suffix}`, scope: "CORE" },
    });
    groupAId = groupA.id;
    const groupB = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId, subjectId: subjectB.id, teacherId: teacherBId, name: `Por-${suffix}`, scope: "CORE" },
    });
    groupBId = groupB.id;

    await prisma.teachingGroupMember.create({ data: { teachingGroupId: groupAId, enrollmentId } });
    await prisma.teachingGroupMember.create({ data: { teachingGroupId: groupBId, enrollmentId } });

    const room = await prisma.room.create({ data: { schoolId, code: `SALA-${suffix}`, name: `Sala ${suffix}`, capacity: 30, kind: "CLASSROOM" } });

    // Dois tempos de 45 minutos para teacherA (1.5h) e um de 60 minutos para teacherB (1h).
    const slot1 = await prisma.timeSlot.create({
      data: { schoolId, academicYearId, shift: "MORNING", dayOfWeek: "MONDAY", startTime: "07:00", endTime: "07:45", order: 1 },
    });
    const slot2 = await prisma.timeSlot.create({
      data: { schoolId, academicYearId, shift: "MORNING", dayOfWeek: "MONDAY", startTime: "07:45", endTime: "08:30", order: 2 },
    });
    const slot3 = await prisma.timeSlot.create({
      data: { schoolId, academicYearId, shift: "MORNING", dayOfWeek: "TUESDAY", startTime: "07:00", endTime: "08:00", order: 1 },
    });

    const entryA1 = await prisma.scheduleEntry.create({
      data: { schoolId, academicYearId, teachingGroupId: groupAId, teacherId: teacherAId, roomId: room.id, timeSlotId: slot1.id },
    });
    entryA1Id = entryA1.id;
    const entryA2 = await prisma.scheduleEntry.create({
      data: { schoolId, academicYearId, teachingGroupId: groupAId, teacherId: teacherAId, roomId: room.id, timeSlotId: slot2.id },
    });
    entryA2Id = entryA2.id;
    const entryB = await prisma.scheduleEntry.create({
      data: { schoolId, academicYearId, teachingGroupId: groupBId, teacherId: teacherBId, roomId: room.id, timeSlotId: slot3.id },
    });
    entryBId = entryB.id;
  });

  afterAll(async () => {
    // `Enrollment.classGroup` não tem `onDelete: Cascade` — apagar antes da escola evita
    // que a cascata tente apagar `ClassGroup` com matrículas ainda a apontar para ela.
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("listScheduleEntriesForYear devolve todas as colocações no formato ScheduleEntryCandidate", async () => {
    const entries = await listScheduleEntriesForYear(schoolId, academicYearId);

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.id).sort()).toEqual([entryA1Id, entryA2Id, entryBId].sort());
    expect(entries.find((e) => e.id === entryA1Id)).toMatchObject({
      teachingGroupId: groupAId,
      teacherId: teacherAId,
    });
  });

  it("listTeachingGroupMemberships devolve os membros de cada agrupamento", async () => {
    const memberships = await listTeachingGroupMemberships(schoolId, academicYearId);

    expect(memberships).toHaveLength(2);
    const groupAMembership = memberships.find((m) => m.teachingGroupId === groupAId);
    const groupBMembership = memberships.find((m) => m.teachingGroupId === groupBId);
    expect(groupAMembership?.enrollmentIds).toEqual([enrollmentId]);
    expect(groupBMembership?.enrollmentIds).toEqual([enrollmentId]);
  });

  it("listWeeklyHoursByTeacher soma a duração dos tempos lectivos já colocados", async () => {
    const hours = await listWeeklyHoursByTeacher(schoolId, academicYearId);

    expect(hours.get(teacherAId)).toBe(1.5);
    expect(hours.get(teacherBId)).toBe(1);
  });

  it("listWeeklyHoursByTeacher não inclui professores sem nenhuma colocação", async () => {
    const hours = await listWeeklyHoursByTeacher(schoolId, academicYearId);
    expect(hours.has("professor-inexistente")).toBe(false);
  });

  it("getTeacherSchedule devolve só as colocações do professor pedido", async () => {
    const scheduleA = await getTeacherSchedule(schoolId, teacherAId);
    expect(scheduleA).toHaveLength(2);
    expect(scheduleA.every((entry) => entry.teacherName === "Elsa Chirindza")).toBe(true);

    const scheduleB = await getTeacherSchedule(schoolId, teacherBId);
    expect(scheduleB).toHaveLength(1);
    expect(scheduleB[0].dayOfWeek).toBe("TUESDAY");
  });

  it("getStudentSchedule devolve as colocações de todos os agrupamentos da matrícula activa", async () => {
    const schedule = await getStudentSchedule(schoolId, studentId);
    expect(schedule).toHaveLength(3);
    expect(schedule?.map((entry) => entry.subjectName).sort()).toEqual(["Matemática", "Matemática", "Português"].sort());
  });

  it("getStudentSchedule devolve null para um aluno sem matrícula no ano lectivo activo", async () => {
    const otherStudent = await prisma.student.create({
      data: { schoolId, code: `ST-SEM-${suffix}`, firstName: "Sem", lastName: "Matrícula", birthDate: new Date("2010-01-01"), gender: "FEMALE" },
    });

    expect(await getStudentSchedule(schoolId, otherStudent.id)).toBeNull();

    await prisma.student.delete({ where: { id: otherStudent.id } });
  });

  it("getClassGroupSchedule junta os horários de todos os agrupamentos com membros da turma, sem duplicar", async () => {
    const schedule = await getClassGroupSchedule(schoolId, classGroupId);
    expect(schedule).toHaveLength(3);
    expect(schedule.map((entry) => entry.id).sort()).toEqual([entryA1Id, entryA2Id, entryBId].sort());
  });

  it("getClassGroupSchedule devolve lista vazia para uma turma sem nenhuma aula colocada", async () => {
    const emptyClassGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId, name: `10B-${suffix}`, shift: "AFTERNOON" },
    });

    expect(await getClassGroupSchedule(schoolId, emptyClassGroup.id)).toEqual([]);

    await prisma.classGroup.delete({ where: { id: emptyClassGroup.id } });
  });
});

describe("getPortalSchedule", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let studentUserId = "";
  let guardianUserId = "";
  let otherGuardianUserId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `PSC-${suffix}`, name: "Escola de teste (horário do portal)", province: "Maputo", district: "KaMpfumu" },
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
    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const studentUser = await prisma.user.create({
      data: { name: "Aluno Verificação", email: `aluno.${suffix}@edumoz.co.mz` },
    });
    studentUserId = studentUser.id;
    const student = await prisma.student.create({
      data: { schoolId, userId: studentUser.id, code: `ST-${suffix}`, firstName: "Aluno", lastName: "Verificação", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}` },
    });

    const subject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });
    const teacher = await prisma.teacher.create({
      data: { schoolId, code: `PROF-${suffix}`, firstName: "Elsa", lastName: "Chirindza" },
    });
    const group = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subject.id, teacherId: teacher.id, name: `Mat-${suffix}`, scope: "CORE" },
    });
    await prisma.teachingGroupMember.create({ data: { teachingGroupId: group.id, enrollmentId: enrollment.id } });

    const room = await prisma.room.create({ data: { schoolId, code: `SALA-${suffix}`, name: `Sala ${suffix}`, capacity: 30, kind: "CLASSROOM" } });
    const slot = await prisma.timeSlot.create({
      data: { schoolId, academicYearId: academicYear.id, shift: "MORNING", dayOfWeek: "MONDAY", startTime: "07:00", endTime: "07:45", order: 1 },
    });
    await prisma.scheduleEntry.create({
      data: { schoolId, academicYearId: academicYear.id, teachingGroupId: group.id, teacherId: teacher.id, roomId: room.id, timeSlotId: slot.id },
    });

    const guardianUser = await prisma.user.create({
      data: { name: "Encarregada Teste", email: `encarregada.${suffix}@edumoz.co.mz` },
    });
    guardianUserId = guardianUser.id;
    const guardian = await prisma.guardian.create({
      data: { schoolId, userId: guardianUser.id, firstName: "Encarregada", lastName: "Teste", phone: "+258840000000" },
    });
    await prisma.studentGuardian.create({
      data: { studentId: student.id, guardianId: guardian.id, relationship: "MOTHER", isPrimary: true },
    });

    const otherGuardianUser = await prisma.user.create({
      data: { name: "Sem Relação", email: `sem.relacao.${suffix}@edumoz.co.mz` },
    });
    otherGuardianUserId = otherGuardianUser.id;
    await prisma.guardian.create({
      data: { schoolId, userId: otherGuardianUser.id, firstName: "Sem", lastName: "Relação", phone: "+258840000001" },
    });
  });

  afterAll(async () => {
    await prisma.studentGuardian.deleteMany({ where: { student: { schoolId } } });
    await prisma.guardian.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentUserId, guardianUserId, otherGuardianUserId] } } });
    await prisma.$disconnect();
  });

  it("um aluno vê o seu próprio horário", async () => {
    const result = await getPortalSchedule(schoolId, "STUDENT", studentUserId);
    expect(result.children).toEqual([]);
    expect(result.entries).toHaveLength(1);
  });

  it("um encarregado vê o horário do seu educando", async () => {
    const result = await getPortalSchedule(schoolId, "GUARDIAN", guardianUserId);
    expect(result.children).toHaveLength(1);
    expect(result.entries).toHaveLength(1);
  });

  it("um encarregado sem relação não vê nenhum horário", async () => {
    const result = await getPortalSchedule(schoolId, "GUARDIAN", otherGuardianUserId);
    expect(result.children).toEqual([]);
    expect(result.entries).toBeNull();
  });

  it("um encarregado a pedir um aluno alheio é ignorado, devolve o seu próprio educando", async () => {
    const result = await getPortalSchedule(schoolId, "GUARDIAN", guardianUserId, "aluno-alheio");
    expect(result.entries).toHaveLength(1);
  });
});
