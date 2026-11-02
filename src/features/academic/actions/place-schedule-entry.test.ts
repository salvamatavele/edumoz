// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@/types";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () =>
      (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: vi.fn(({ href }: { href: string }) => href),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

const { revalidatePath } = await import("next/cache");
const { auth } = await import("@/lib/auth/config");
const { prisma } = await import("@/lib/db/client");
const { placeScheduleEntry } = await import("./place-schedule-entry");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("placeScheduleEntry", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let schoolIdWithoutActiveYear = "";
  let teacherAId = "";
  let teacherBId = "";
  let groupAId = "";
  let groupBId = "";
  let groupNoTeacherId = "";
  let roomId = "";
  let roomOtherId = "";
  let slot1Id = "";
  let slot2Id = "";
  let academicYearId = "";
  let subjectAId = "";
  let subjectBId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `PSE-${suffix}`, name: "Escola de teste (colocação)", province: "Maputo", district: "KaMpfumu" },
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
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });
    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const student1 = await prisma.student.create({
      data: { schoolId, code: `ST1-${suffix}`, firstName: "Aluno", lastName: "Um", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    const enrollment1 = await prisma.enrollment.create({
      data: { schoolId, studentId: student1.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/1${suffix}` },
    });

    const subjectA = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });
    subjectAId = subjectA.id;
    const subjectB = await prisma.subject.create({ data: { schoolId, code: `POR-${suffix}`, name: "Português" } });
    subjectBId = subjectB.id;

    const teacherA = await prisma.teacher.create({
      data: { schoolId, code: `PROF-A-${suffix}`, firstName: "Elsa", lastName: "Chirindza", maxWeeklyHours: 1 },
    });
    teacherAId = teacherA.id;
    const teacherB = await prisma.teacher.create({
      data: { schoolId, code: `PROF-B-${suffix}`, firstName: "João", lastName: "Muianga" },
    });
    teacherBId = teacherB.id;

    const groupA = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subjectA.id, teacherId: teacherAId, name: `Mat-${suffix}`, scope: "CORE" },
    });
    groupAId = groupA.id;
    const groupB = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subjectB.id, teacherId: teacherBId, name: `Por-${suffix}`, scope: "CORE" },
    });
    groupBId = groupB.id;
    const groupNoTeacher = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subjectA.id, name: `SemProf-${suffix}`, scope: "CORE" },
    });
    groupNoTeacherId = groupNoTeacher.id;

    await prisma.teachingGroupMember.create({ data: { teachingGroupId: groupAId, enrollmentId: enrollment1.id } });
    await prisma.teachingGroupMember.create({ data: { teachingGroupId: groupBId, enrollmentId: enrollment1.id } });

    const room = await prisma.room.create({ data: { schoolId, code: `SALA-${suffix}`, name: `Sala ${suffix}`, capacity: 30, kind: "CLASSROOM" } });
    roomId = room.id;
    const roomOther = await prisma.room.create({ data: { schoolId, code: `SALA-B-${suffix}`, name: `Sala B ${suffix}`, capacity: 30, kind: "CLASSROOM" } });
    roomOtherId = roomOther.id;

    const slot1 = await prisma.timeSlot.create({
      data: { schoolId, academicYearId: academicYear.id, shift: "MORNING", dayOfWeek: "MONDAY", startTime: "07:00", endTime: "08:00", order: 1 },
    });
    slot1Id = slot1.id;
    const slot2 = await prisma.timeSlot.create({
      data: { schoolId, academicYearId: academicYear.id, shift: "MORNING", dayOfWeek: "MONDAY", startTime: "08:00", endTime: "09:00", order: 2 },
    });
    slot2Id = slot2.id;

    const schoolWithoutYear = await prisma.school.create({
      data: { code: `PSE-NOYEAR-${suffix}`, name: "Escola sem ano activo", province: "Maputo", district: "KaMpfumu" },
    });
    schoolIdWithoutActiveYear = schoolWithoutYear.id;
  });

  afterAll(async () => {
    const schoolIds = [schoolId, schoolIdWithoutActiveYear];
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.scheduleEntry.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.enrollment.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.school.delete({ where: { id: schoolIdWithoutActiveYear } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(role: Role | null, forSchoolId = schoolId) {
    return {
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId: forSchoolId,
      role,
      memberships: role ? [{ schoolId: forSchoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("error");
  });

  it("recusa um papel sem gestão da escola", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("error");
  });

  it("recusa sem ano lectivo activo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER", schoolIdWithoutActiveYear));
    const result = await placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("error");
  });

  it("recusa um agrupamento sem professor atribuído", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await placeScheduleEntry({ teachingGroupId: groupNoTeacherId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("error");
  });

  it("coloca o agrupamento sem conflitos e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("success");

    const created = await prisma.scheduleEntry.findFirstOrThrow({
      where: { schoolId, teachingGroupId: groupAId, timeSlotId: slot1Id },
    });
    expect(created.teacherId).toBe(teacherAId);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("scheduleEntry.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("recusa por conflito de professor — o mesmo professor já tem outro agrupamento nesse tempo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    // teacherA já está colocado em slot1 (teste anterior); groupB usa teacherB, então
    // criamos um novo agrupamento com teacherA para testar o conflito de professor.
    const groupA2 = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId, subjectId: subjectBId, teacherId: teacherAId, name: `Mat2-${suffix}`, scope: "CORE" },
    });

    const result = await placeScheduleEntry({ teachingGroupId: groupA2.id, roomId: roomOtherId, timeSlotId: slot1Id });
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.conflicts.some((c) => c.includes("teacherDoubleBooked"))).toBe(true);
    }

    const found = await prisma.scheduleEntry.findFirst({ where: { teachingGroupId: groupA2.id } });
    expect(found).toBeNull();

    await prisma.teachingGroup.delete({ where: { id: groupA2.id } });
  });

  it("recusa por conflito de sala — outra colocação já ocupa a sala nesse tempo", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await placeScheduleEntry({ teachingGroupId: groupBId, roomId, timeSlotId: slot1Id });
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.conflicts.some((c) => c.includes("roomDoubleBooked"))).toBe(true);
    }
  });

  it("recusa por conflito de alunos partilhados entre dois agrupamentos", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    // groupB partilha o aluno de enrollment1 com groupA, já colocado em slot1.
    const result = await placeScheduleEntry({ teachingGroupId: groupBId, roomId: roomOtherId, timeSlotId: slot1Id });
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.conflicts.some((c) => c.includes("studentDoubleBooked"))).toBe(true);
    }
  });

  it("avisa, mas grava, ao exceder maxWeeklyHours", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    // teacherA (maxWeeklyHours: 1) já tem 1h colocada (slot1, 07:00-08:00). Uma segunda
    // colocação de 1h no mesmo professor, noutro tempo, excede o máximo.
    const groupA3 = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId, subjectId: subjectAId, teacherId: teacherAId, name: `Mat3-${suffix}`, scope: "CORE" },
    });

    const result = await placeScheduleEntry({ teachingGroupId: groupA3.id, roomId: roomOtherId, timeSlotId: slot2Id });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.warning).toBeDefined();
    }

    const created = await prisma.scheduleEntry.findFirst({ where: { teachingGroupId: groupA3.id } });
    expect(created).not.toBeNull();
  });

  it("não avisa um professor sem maxWeeklyHours definido", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await placeScheduleEntry({ teachingGroupId: groupBId, roomId, timeSlotId: slot2Id });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.warning).toBeUndefined();
    }
  });
  it("serializes concurrent placements sharing a student even with different rooms and teachers", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const slot = await prisma.timeSlot.create({ data: { schoolId, academicYearId, shift: "MORNING", dayOfWeek: "TUESDAY", startTime: "07:00", endTime: "08:00", order: 1 } });
    const scheduling = await import("@/features/academic/data/scheduling");
    const original = scheduling.listTeachingGroupMemberships;
    let arrivals = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(scheduling, "listTeachingGroupMemberships").mockImplementation(async (...args) => {
      const result = await original(...args);
      arrivals++;
      if (arrivals === 2) release();
      await barrier;
      return result;
    });
    try {
      const results = await Promise.all([
        placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot.id }),
        placeScheduleEntry({ teachingGroupId: groupBId, roomId: roomOtherId, timeSlotId: slot.id }),
      ]);
      expect(results.filter((result) => result.status === "success")).toHaveLength(1);
      expect(results.filter((result) => result.status === "conflict")).toHaveLength(1);
      expect(await prisma.scheduleEntry.count({ where: { schoolId, timeSlotId: slot.id } })).toBe(1);
    } finally { spy.mockRestore(); }
  });

  it.each(["inactive-teacher", "inactive-room", "missing-entry"])("refuses %s without writing a schedule or audit", async (scenario) => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const slot = await prisma.timeSlot.create({ data: { schoolId, academicYearId, shift: "MORNING", dayOfWeek: "WEDNESDAY", startTime: `0${7 + ["inactive-teacher", "inactive-room", "missing-entry"].indexOf(scenario)}:00`, endTime: "10:00", order: 1 } });
    const audits = await prisma.auditLog.count({ where: { schoolId } });
    try {
      if (scenario === "inactive-teacher") await prisma.teacher.update({ where: { id: teacherAId }, data: { isActive: false } });
      if (scenario === "inactive-room") await prisma.room.update({ where: { id: roomId }, data: { isActive: false } });
      const result = await placeScheduleEntry({ teachingGroupId: groupAId, roomId, timeSlotId: slot.id, ...(scenario === "missing-entry" ? { id: "nonexistent-entry" } : {}) });
      expect(result.status).toBe("error");
      expect(await prisma.scheduleEntry.count({ where: { schoolId, timeSlotId: slot.id } })).toBe(0);
      expect(await prisma.auditLog.count({ where: { schoolId } })).toBe(audits);
    } finally {
      await prisma.teacher.update({ where: { id: teacherAId }, data: { isActive: true } });
      await prisma.room.update({ where: { id: roomId }, data: { isActive: true } });
    }
  });

});
