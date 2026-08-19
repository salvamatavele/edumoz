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
const { recordGrades } = await import("./record-grades");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("recordGrades", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let assessmentId = "";
  let teacherUserId = "";
  let otherTeacherUserId = "";
  let enrollmentIds: string[] = [];

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `RG-${suffix}`, name: "Escola de teste (notas)", province: "Maputo", district: "KaMpfumu" },
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

    const term = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        sequence: 1,
        name: "1º Trimestre",
        startDate: new Date("2026-01-19"),
        endDate: new Date("2026-04-17"),
        status: "OPEN",
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

    const subject = await prisma.subject.create({
      data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" },
    });

    const scheme = await prisma.assessmentScheme.create({
      data: { schoolId, academicYearId: academicYear.id, name: `Esquema ${suffix}` },
    });

    const component = await prisma.assessmentComponent.create({
      data: { schemeId: scheme.id, code: "AC", name: "Avaliação Contínua", weight: 0.4 },
    });
    await prisma.assessmentComponent.create({
      data: { schemeId: scheme.id, code: "AT", name: "Avaliação Trimestral", weight: 0.6 },
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
      data: { schoolId, userId: teacherUser.id, code: `P-${suffix}`, firstName: "Professora", lastName: "Teste" },
    });

    const otherTeacher = await prisma.teacher.create({
      data: { schoolId, userId: otherTeacherUser.id, code: `P2-${suffix}`, firstName: "Outro", lastName: "Professor" },
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

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        teachingGroupId: teachingGroup.id,
        termId: term.id,
        componentId: component.id,
        name: "Teste 1",
        maxScore: 20,
        weight: 1,
        date: new Date("2026-02-10"),
      },
    });
    assessmentId = assessment.id;

    const enrollments = [];
    for (let i = 0; i < 3; i++) {
      const student = await prisma.student.create({
        data: { schoolId, code: `ST-${suffix}-${i}`, firstName: `Aluna${i}`, lastName: "Teste", birthDate: new Date("2010-01-01"), gender: "FEMALE" },
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
    await prisma.grade.deleteMany({ where: { schoolId } });
    await prisma.assessment.deleteMany({ where: { schoolId } });
    await prisma.teachingGroupMember.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.assessmentScheme.deleteMany({ where: { schoolId } });
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
    const result = await recordGrades({ assessmentId, changes: [] });
    expect(result.status).toBe("error");
  });

  it("recusa um professor que não é dono do agrupamento — mesmo sendo director da turma", async () => {
    mockAuth.mockResolvedValue(sessionAs(otherTeacherUserId));

    const result = await recordGrades({
      assessmentId,
      changes: [{ enrollmentId: enrollmentIds[0], score: 15, isAbsent: false }],
    });

    expect(result.status).toBe("error");

    const grade = await prisma.grade.findUnique({
      where: { assessmentId_enrollmentId: { assessmentId, enrollmentId: enrollmentIds[0] } },
    });
    expect(grade).toBeNull();
  });

  it("grava só o delta e regista AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await recordGrades({
      assessmentId,
      changes: [
        { enrollmentId: enrollmentIds[0], score: 15, isAbsent: false },
        { enrollmentId: enrollmentIds[1], score: undefined, isAbsent: true },
      ],
    });

    expect(result.status).toBe("success");

    const grades = await prisma.grade.findMany({ where: { assessmentId } });
    expect(grades).toHaveLength(2);

    const absentGrade = grades.find((g) => g.enrollmentId === enrollmentIds[1]);
    expect(absentGrade?.isAbsent).toBe(true);
    expect(absentGrade?.score).toBeNull();

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: assessmentId, action: "grade.record" },
    });
    expect(log.actorUserId).toBe(teacherUserId);

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("ignora um enrollmentId que não pertence ao agrupamento", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await recordGrades({
      assessmentId,
      changes: [{ enrollmentId: "enrolment-alheio", score: 10, isAbsent: false }],
    });

    expect(result.status).toBe("success");

    const stray = await prisma.grade.findFirst({ where: { assessmentId, enrollmentId: "enrolment-alheio" } });
    expect(stray).toBeNull();
  });

  it("altera uma nota já lançada", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await recordGrades({
      assessmentId,
      changes: [{ enrollmentId: enrollmentIds[0], score: 18, isAbsent: false }],
    });

    expect(result.status).toBe("success");

    const grade = await prisma.grade.findUniqueOrThrow({
      where: { assessmentId_enrollmentId: { assessmentId, enrollmentId: enrollmentIds[0] } },
    });
    expect(grade.score?.toString()).toBe("18");
  });
});
