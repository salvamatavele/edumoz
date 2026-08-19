// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { getPortalGrades } = await import("./student-grades");

describe("getPortalGrades", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let studentUserId = "";
  let guardianUserId = "";
  let otherGuardianUserId = "";
  let openTermId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `SG-${suffix}`, name: "Escola de teste (portal)", province: "Maputo", district: "KaMpfumu" },
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

    const closedTerm = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        sequence: 1,
        name: "1º Trimestre",
        startDate: new Date("2026-01-19"),
        endDate: new Date("2026-04-17"),
        status: "CLOSED",
      },
    });

    const openTerm = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        sequence: 2,
        name: "2º Trimestre",
        startDate: new Date("2026-04-27"),
        endDate: new Date("2026-08-07"),
        status: "OPEN",
      },
    });
    openTermId = openTerm.id;

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });

    const subject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });

    const scheme = await prisma.assessmentScheme.create({
      data: { schoolId, academicYearId: academicYear.id, name: `Esquema ${suffix}` },
    });

    const studentUser = await prisma.user.create({
      data: { name: "Aluna Teste", email: `aluna.${suffix}@edumoz.co.mz` },
    });
    studentUserId = studentUser.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: studentUser.id,
        code: `ST-${suffix}`,
        firstName: "Aluna",
        lastName: "Teste",
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}` },
    });

    await prisma.termResult.create({
      data: {
        schoolId,
        enrollmentId: enrollment.id,
        subjectId: subject.id,
        termId: closedTerm.id,
        schemeId: scheme.id,
        schemeVersion: 1,
        componentAverages: {},
        average: 14,
        finalScore: 14,
        passed: true,
      },
    });

    // Encarregada ligada à aluna — vê as notas dela.
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

    // Outra encarregada, sem nenhuma relação com esta aluna.
    const otherGuardianUser = await prisma.user.create({
      data: { name: "Sem Relação", email: `semrelacao.${suffix}@edumoz.co.mz` },
    });
    otherGuardianUserId = otherGuardianUser.id;

    await prisma.guardian.create({
      data: { schoolId, userId: otherGuardianUser.id, firstName: "Sem", lastName: "Relação", phone: "+258840000001" },
    });
  });

  afterAll(async () => {
    await prisma.termResult.deleteMany({ where: { schoolId } });
    await prisma.assessmentScheme.deleteMany({ where: { schoolId } });
    await prisma.studentGuardian.deleteMany({ where: { student: { schoolId } } });
    await prisma.guardian.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentUserId, guardianUserId, otherGuardianUserId] } } });
    await prisma.$disconnect();
  });

  it("aluno vê as suas próprias notas de trimestres fechados", async () => {
    const result = await getPortalGrades(schoolId, "STUDENT", studentUserId);

    expect(result.children).toHaveLength(0);
    expect(result.selected?.studentName).toBe("Aluna Teste");
    expect(result.selected?.rows).toHaveLength(1);
    expect(result.selected?.rows[0].average).toBe("14");
    // Sem linha nenhuma para o trimestre ainda aberto.
    expect(result.selected?.rows.every((row) => row.termId !== openTermId)).toBe(true);
  });

  it("encarregada vê as notas da sua educanda", async () => {
    const result = await getPortalGrades(schoolId, "GUARDIAN", guardianUserId);

    expect(result.children).toHaveLength(1);
    expect(result.selected?.studentName).toBe("Aluna Teste");
    expect(result.selected?.rows).toHaveLength(1);
  });

  it("encarregada sem relação nenhuma não vê nenhuma nota", async () => {
    const result = await getPortalGrades(schoolId, "GUARDIAN", otherGuardianUserId);

    expect(result.children).toHaveLength(0);
    expect(result.selected).toBeNull();
  });

  it("ignora um studentId pedido que não é educando da encarregada", async () => {
    const result = await getPortalGrades(schoolId, "GUARDIAN", guardianUserId, "aluno-alheio");

    // Cai para o único educando real, em vez de expor o pedido inválido.
    expect(result.selected?.studentName).toBe("Aluna Teste");
  });

  it("um utilizador sem Student/Guardian ligado não vê nada", async () => {
    const result = await getPortalGrades(schoolId, "STUDENT", "utilizador-sem-perfil");
    expect(result.selected).toBeNull();
  });
});
