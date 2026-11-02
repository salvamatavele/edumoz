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
const { closeTerm } = await import("./close-term");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("closeTerm", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let termId = "";
  let mathSubjectId = "";
  let historySubjectId = "";
  let enrollmentId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `CT-${suffix}`, name: "Escola de teste (fecho)", province: "Maputo", district: "KaMpfumu" },
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

    const mathSubject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });
    mathSubjectId = mathSubject.id;
    const historySubject = await prisma.subject.create({ data: { schoolId, code: `HIS-${suffix}`, name: "História" } });
    historySubjectId = historySubject.id;

    await prisma.curriculumSubject.create({
      data: { schoolId, studyPathId: studyPath.id, subjectId: mathSubject.id, scope: "CORE", weeklyHours: 4 },
    });
    await prisma.curriculumSubject.create({
      data: { schoolId, studyPathId: studyPath.id, subjectId: historySubject.id, scope: "CORE", weeklyHours: 2 },
    });

    const scheme = await prisma.assessmentScheme.create({
      data: { schoolId, academicYearId: academicYear.id, name: `Esquema base ${suffix}` },
    });

    const componentAC = await prisma.assessmentComponent.create({
      data: { schemeId: scheme.id, code: "AC", name: "Avaliação Contínua", weight: 0.4 },
    });
    await prisma.assessmentComponent.create({
      data: { schemeId: scheme.id, code: "AT", name: "Avaliação Trimestral", weight: 0.6 },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const teacherUser = await prisma.user.create({
      data: { name: "Professora de Teste", email: `professora.${suffix}@edumoz.co.mz` },
    });

    const teacher = await prisma.teacher.create({
      data: { schoolId, userId: teacherUser.id, code: `P-${suffix}`, firstName: "Professora", lastName: "Teste" },
    });

    const teachingGroup = await prisma.teachingGroup.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        subjectId: mathSubject.id,
        teacherId: teacher.id,
        name: `TG-${suffix}`,
        scope: "CORE",
        classGroupId: classGroup.id,
      },
    });

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
    enrollmentId = enrollment.id;

    await prisma.teachingGroupMember.create({
      data: { teachingGroupId: teachingGroup.id, enrollmentId: enrollment.id },
    });

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        teachingGroupId: teachingGroup.id,
        termId: term.id,
        componentId: componentAC.id,
        name: "Teste 1",
        maxScore: 20,
        weight: 1,
        date: new Date("2026-02-10"),
      },
    });

    await prisma.grade.create({
      data: { schoolId, assessmentId: assessment.id, enrollmentId: enrollment.id, score: 16 },
    });
    // Matemática só tem AC lançado — o teste confirma que a média renormaliza.
    // História não tem nenhuma avaliação nem nota — confirma que o fecho não falha.
  });

  afterAll(async () => {
    await prisma.term.updateMany({ where: { schoolId }, data: { status: "OPEN" } });
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.termResult.deleteMany({ where: { schoolId } });
    await prisma.grade.deleteMany({ where: { schoolId } });
    await prisma.assessment.deleteMany({ where: { schoolId } });
    await prisma.teachingGroupMember.deleteMany({ where: { enrollmentId } });
    await prisma.curriculumSubject.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.assessmentScheme.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(role: "SCHOOL_MANAGER" | "TEACHER" | null) {
    return {
      user: { id: "user-1", name: null, email: null, image: null },
      schoolId,
      role,
      memberships: role ? [{ schoolId, schoolName: "Escola de teste", role }] : [],
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await closeTerm({ termId });
    expect(result.status).toBe("error");
  });

  it("recusa um professor — só quem administra a escola fecha um trimestre", async () => {
    mockAuth.mockResolvedValue(sessionAs("TEACHER"));
    const result = await closeTerm({ termId });
    expect(result.status).toBe("error");
  });

  it("recusa um termId inexistente", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await closeTerm({ termId: "termo-inexistente" });
    expect(result.status).toBe("error");
  });

  it("fecha o trimestre, grava TermResult para as disciplinas do percurso e regista AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));

    const result = await closeTerm({ termId });
    expect(result.status).toBe("success");

    const term = await prisma.term.findUniqueOrThrow({ where: { id: termId } });
    expect(term.status).toBe("CLOSED");
    expect(term.closedById).toBe("user-1");

    const mathResult = await prisma.termResult.findUniqueOrThrow({
      where: { enrollmentId_subjectId_termId: { enrollmentId, subjectId: mathSubjectId, termId } },
    });
    // Só AC (16) lançado — renormaliza para 16.
    expect(mathResult.average?.toString()).toBe("16");
    expect(mathResult.schemeVersion).toBe(1);

    // História não teve nenhuma avaliação nem nota — o fecho ainda assim grava um
    // TermResult (sem média), em vez de falhar ou omitir a disciplina.
    const historyResult = await prisma.termResult.findUniqueOrThrow({
      where: { enrollmentId_subjectId_termId: { enrollmentId, subjectId: historySubjectId, termId } },
    });
    expect(historyResult.average).toBeNull();

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: termId, action: "term.close" },
    });
    expect(log.actorUserId).toBe("user-1");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("recusa fechar um trimestre já fechado", async () => {
    mockAuth.mockResolvedValue(sessionAs("SCHOOL_MANAGER"));
    const result = await closeTerm({ termId });
    expect(result.status).toBe("error");
  });
});
