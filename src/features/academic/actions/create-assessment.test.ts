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
const { createAssessment } = await import("./create-assessment");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createAssessment", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let teachingGroupId = "";
  let termId = "";
  let componentId = "";
  let foreignComponentId = "";
  let teacherUserId = "";
  let otherTeacherUserId = "";
  let enrollmentIds: string[] = [];

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `CA-${suffix}`, name: "Escola de teste (avaliações)", province: "Maputo", district: "KaMpfumu" },
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
    termId = term.id;

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
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
    componentId = component.id;
    await prisma.assessmentComponent.create({
      data: { schemeId: scheme.id, code: "AT", name: "Avaliação Trimestral", weight: 0.6 },
    });

    // Componente de um esquema de OUTRO ano lectivo: não deve poder ser escolhido para uma
    // avaliação de um agrupamento do ano activo.
    const secondYear = await prisma.academicYear.create({
      data: {
        schoolId,
        year: 2025,
        label: "2025",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-15"),
        isActive: false,
      },
    });
    const foreignScheme = await prisma.assessmentScheme.create({
      data: { schoolId, academicYearId: secondYear.id, name: `Esquema de outro ano ${suffix}` },
    });
    const foreignComponent = await prisma.assessmentComponent.create({
      data: { schemeId: foreignScheme.id, code: "XX", name: "Fora do ano activo", weight: 1 },
    });
    foreignComponentId = foreignComponent.id;

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

    await prisma.teacher.create({
      data: { schoolId, userId: otherTeacherUser.id, code: `P2-${suffix}`, firstName: "Outro", lastName: "Professor" },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
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
    teachingGroupId = teachingGroup.id;

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluna", lastName: "Teste", birthDate: new Date("2010-01-01"), gender: "FEMALE" },
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
    enrollmentIds = [enrollment.id];

    await prisma.teachingGroupMember.create({
      data: { teachingGroupId: teachingGroup.id, enrollmentId: enrollment.id },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
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

  function sessionAs(userId: string, role: "TEACHER" | "SCHOOL_MANAGER" | null = "TEACHER") {
    return {
      user: { id: userId, name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  function input(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      teachingGroupId,
      termId,
      componentId,
      name: "Teste 1",
      maxScore: 20,
      weight: 1,
      date: new Date("2026-02-10"),
      ...overrides,
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createAssessment(input());
    expect(result.status).toBe("error");
  });

  it("recusa um professor que não é dono do agrupamento", async () => {
    mockAuth.mockResolvedValue(sessionAs(otherTeacherUserId));
    const result = await createAssessment(input());
    expect(result.status).toBe("error");
  });

  it("recusa um gestor a criar em nome de um professor", async () => {
    // Um gestor sem Teacher ligado ao seu userId não é o professor dono do agrupamento.
    const managerUser = await prisma.user.create({
      data: { name: "Gestora", email: `gestora.${suffix}@edumoz.co.mz` },
    });
    mockAuth.mockResolvedValue(sessionAs(managerUser.id, "SCHOOL_MANAGER"));

    const result = await createAssessment(input());
    expect(result.status).toBe("error");

    await prisma.user.delete({ where: { id: managerUser.id } });
  });

  it("recusa um componente que não pertence ao esquema do agrupamento", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await createAssessment(input({ componentId: foreignComponentId }));

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.componentId).toBeDefined();
    }
  });

  it("cria a avaliação, regista o AuditLog e revalida as duas línguas", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await createAssessment(input());
    expect(result.status).toBe("success");

    const created = await prisma.assessment.findFirstOrThrow({ where: { teachingGroupId, termId, name: "Teste 1" } });
    expect(created.componentId).toBe(componentId);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("assessment.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("permite um segundo teste no mesmo componente, com o seu próprio peso", async () => {
    mockAuth.mockResolvedValue(sessionAs(teacherUserId));

    const result = await createAssessment(input({ name: "Teste 2", weight: 0.5 }));
    expect(result.status).toBe("success");

    const count = await prisma.assessment.count({ where: { teachingGroupId, termId, componentId } });
    expect(count).toBe(2);
  });
});
