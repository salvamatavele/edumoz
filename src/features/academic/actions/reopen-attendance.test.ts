// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
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
const { reopenAttendance } = await import("./reopen-attendance");

const mockAuth = auth as unknown as {
  mockResolvedValue: (value: unknown) => void;
};
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("reopenAttendance", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let sessionId = "";
  let enrollmentId = "";
  let teacherUserId = "";
  let otherTeacherUserId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: {
        code: `RA-${suffix}`,
        name: "Escola de teste (reabertura)",
        province: "Maputo",
        district: "KaMpfumu",
      },
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
      data: {
        schoolId,
        academicYearId: academicYear.id,
        gradeLevelId: gradeLevel.id,
        code: `SP-${suffix}`,
        name: "10ª — Ciências",
      },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const subject = await prisma.subject.create({
      data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" },
    });

    const room = await prisma.room.create({
      data: { schoolId, code: `S-${suffix}`, name: "Sala de teste" },
    });

    const timeSlot = await prisma.timeSlot.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        dayOfWeek: "MONDAY",
        startTime: "07:00",
        endTime: "07:45",
        shift: "MORNING",
        order: 1,
      },
    });

    const teacherUser = await prisma.user.create({
      data: { name: "Professora de Teste", email: `professora.ra.${suffix}@edumoz.co.mz` },
    });
    teacherUserId = teacherUser.id;

    const otherTeacherUser = await prisma.user.create({
      data: { name: "Outro Professor", email: `outro.ra.${suffix}@edumoz.co.mz` },
    });
    otherTeacherUserId = otherTeacherUser.id;

    const teacher = await prisma.teacher.create({
      data: { schoolId, userId: teacherUser.id, code: `P-${suffix}`, firstName: "Professora", lastName: "Teste" },
    });

    await prisma.teacher.create({
      data: { schoolId, userId: otherTeacherUser.id, code: `P2-${suffix}`, firstName: "Outro", lastName: "Professor" },
    });

    const teachingGroup = await prisma.teachingGroup.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        name: `TG-${suffix}`,
        scope: "CORE",
        classGroupId: classGroup.id,
      },
    });

    await prisma.scheduleEntry.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        teachingGroupId: teachingGroup.id,
        teacherId: teacher.id,
        roomId: room.id,
        timeSlotId: timeSlot.id,
      },
    });

    const student = await prisma.student.create({
      data: {
        schoolId,
        code: `ST-${suffix}`,
        firstName: "Aluna",
        lastName: "Teste",
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        schoolId,
        studentId: student.id,
        academicYearId: academicYear.id,
        studyPathId: studyPath.id,
        classGroupId: classGroup.id,
        number: `2026/${suffix}`,
      },
    });
    enrollmentId = enrollment.id;

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        schoolId,
        teachingGroupId: teachingGroup.id,
        timeSlotId: timeSlot.id,
        date: new Date("2026-08-17T00:00:00.000Z"),
        status: "SUBMITTED",
      },
    });
    sessionId = attendanceSession.id;

    await prisma.attendanceRecord.create({
      data: { sessionId: attendanceSession.id, enrollmentId: enrollment.id, status: "ABSENT" },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.attendanceRecord.deleteMany({ where: { enrollmentId } });
    await prisma.attendanceSession.deleteMany({ where: { schoolId } });
    await prisma.scheduleEntry.deleteMany({ where: { schoolId } });
    await prisma.teachingGroupMember.deleteMany({ where: { enrollmentId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherUserId, otherTeacherUserId] } } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(userId: string, role: "TEACHER" | "SCHOOL_MANAGER" | null = "TEACHER") {
    return {
      user: { id: userId, name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await reopenAttendance(sessionId);
    expect(result.status).toBe("error");
  });

  it("recusa um professor que não é dono da sessão", async () => {
    mockAuth.mockResolvedValue(sessionAs(otherTeacherUserId));
    const result = await reopenAttendance(sessionId);
    expect(result.status).toBe("error");

    const stillSubmitted = await prisma.attendanceSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(stillSubmitted.status).toBe("SUBMITTED");
  });

  it("um gestor consegue reabrir mesmo sem ser o professor da sessão", async () => {
    mockAuth.mockResolvedValue(sessionAs(otherTeacherUserId, "SCHOOL_MANAGER"));

    const result = await reopenAttendance(sessionId);
    expect(result.status).toBe("success");

    const reopened = await prisma.attendanceSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(reopened.status).toBe("DRAFT");

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: sessionId, action: "attendance.reopen" },
    });
    expect(Array.isArray(log.before)).toBe(true);
    expect((log.before as unknown[])[0]).toMatchObject({ enrollmentId, status: "ABSENT" });

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);

    // repõe para o próximo teste
    await prisma.attendanceSession.update({ where: { id: sessionId }, data: { status: "SUBMITTED" } });
  });

  it("o próprio professor dono consegue reabrir", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await reopenAttendance(sessionId);
    expect(result.status).toBe("success");

    const reopened = await prisma.attendanceSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(reopened.status).toBe("DRAFT");
  });
});
