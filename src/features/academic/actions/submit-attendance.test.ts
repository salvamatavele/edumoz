// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Mesma razão que em create-student.test.ts/enroll-student.test.ts: `getTranslations`,
 * `getPathname` e `revalidatePath` não correm fora do runtime do Next.
 */
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
const { submitAttendance } = await import("./submit-attendance");

// Mesma nota que nos outros testes de acção sobre a sobrecarga de `auth()`.
const mockAuth = auth as unknown as {
  mockResolvedValue: (value: unknown) => void;
};
const mockRevalidatePath = vi.mocked(revalidatePath);

const MONDAY_DATE = new Date("2026-08-17T00:00:00.000Z"); // segunda-feira

describe("submitAttendance", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let scheduleEntryId = "";
  let teacherUserId = "";
  let otherTeacherUserId = "";
  let enrollmentIds: string[] = [];

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: {
        code: `AT-${suffix}`,
        name: "Escola de teste (presenças)",
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
      data: { name: "Professora de Teste", email: `professora.${suffix}@edumoz.co.mz` },
    });
    teacherUserId = teacherUser.id;

    const otherTeacherUser = await prisma.user.create({
      data: { name: "Outro Professor", email: `outro.${suffix}@edumoz.co.mz` },
    });
    otherTeacherUserId = otherTeacherUser.id;

    const teacher = await prisma.teacher.create({
      data: {
        schoolId,
        userId: teacherUser.id,
        code: `P-${suffix}`,
        firstName: "Professora",
        lastName: "Teste",
      },
    });

    const otherTeacher = await prisma.teacher.create({
      data: {
        schoolId,
        userId: otherTeacherUser.id,
        code: `P2-${suffix}`,
        firstName: "Outro",
        lastName: "Professor",
      },
    });

    // `otherTeacher` dirige a turma da matrícula, mas não lecciona `teachingGroup` — usado
    // para confirmar que dirigir a turma não abre escrita em disciplinas alheias.
    await prisma.classGroup.update({ where: { id: classGroup.id }, data: { headTeacherId: otherTeacher.id } });

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

    const scheduleEntry = await prisma.scheduleEntry.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        teachingGroupId: teachingGroup.id,
        teacherId: teacher.id,
        roomId: room.id,
        timeSlotId: timeSlot.id,
      },
    });
    scheduleEntryId = scheduleEntry.id;

    const enrollments = [];
    for (let i = 0; i < 3; i++) {
      const student = await prisma.student.create({
        data: {
          schoolId,
          code: `ST-${suffix}-${i}`,
          firstName: `Aluna${i}`,
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
          number: `2026/${suffix}-${i}`,
        },
      });
      enrollments.push(enrollment.id);

      await prisma.teachingGroupMember.create({
        data: { teachingGroupId: teachingGroup.id, enrollmentId: enrollment.id },
      });
    }
    enrollmentIds = enrollments;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.attendanceRecord.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
    await prisma.attendanceSession.deleteMany({ where: { schoolId } });
    await prisma.scheduleEntry.deleteMany({ where: { schoolId } });
    await prisma.teachingGroupMember.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherUserId, otherTeacherUserId] } } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(userId: string, role: "TEACHER" | null = "TEACHER") {
    return {
      user: { id: userId, name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await submitAttendance({
      scheduleEntryId,
      date: MONDAY_DATE,
      changes: [],
    });

    expect(result.status).toBe("error");
  });

  it("recusa um utilizador que não tem Teacher ligado", async () => {
    mockAuth.mockResolvedValue(sessionAs("user-sem-teacher"));

    const result = await submitAttendance({
      scheduleEntryId,
      date: MONDAY_DATE,
      changes: [],
    });

    expect(result.status).toBe("error");
  });

  it("recusa um professor que não é dono desta ScheduleEntry — mesmo sendo director da turma", async () => {
    mockAuth.mockResolvedValue(sessionAs(otherTeacherUserId));

    const result = await submitAttendance({
      scheduleEntryId,
      date: MONDAY_DATE,
      changes: [{ enrollmentId: enrollmentIds[0], status: "ABSENT" }],
    });

    expect(result.status).toBe("error");

    const session = await prisma.attendanceSession.findFirst({ where: { schoolId, date: MONDAY_DATE } });
    expect(session).toBeNull();
  });

  it("grava só o delta, fecha a sessão e regista AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await submitAttendance({
      scheduleEntryId,
      date: MONDAY_DATE,
      changes: [
        { enrollmentId: enrollmentIds[0], status: "ABSENT" },
        { enrollmentId: enrollmentIds[1], status: "LATE", minutesLate: 10 },
      ],
    });

    expect(result.status).toBe("success");

    const session = await prisma.attendanceSession.findFirstOrThrow({
      where: { schoolId, date: MONDAY_DATE },
    });
    expect(session.status).toBe("SUBMITTED");

    const records = await prisma.attendanceRecord.findMany({ where: { sessionId: session.id } });
    // Só o delta — os 3 alunos existem no agrupamento, mas só 2 mudaram de "Presente".
    expect(records).toHaveLength(2);

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: session.id, action: "attendance.submit" },
    });
    expect(log.actorUserId).toBe(teacherUserId);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/attendance");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("ignora um enrollmentId que não pertence ao agrupamento", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await submitAttendance({
      scheduleEntryId,
      date: new Date("2026-08-24T00:00:00.000Z"),
      changes: [{ enrollmentId: "enrolment-alheio", status: "ABSENT" }],
    });

    expect(result.status).toBe("success");

    const session = await prisma.attendanceSession.findFirstOrThrow({
      where: { schoolId, date: new Date("2026-08-24T00:00:00.000Z") },
    });
    const records = await prisma.attendanceRecord.findMany({ where: { sessionId: session.id } });
    expect(records).toHaveLength(0);
  });
});
