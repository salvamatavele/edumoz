// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { getReportCard, listReportCardFilters } = await import("./report-cards");

describe("getReportCard", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let classGroupId = "";
  let subjectId = "";
  let openTermId = "";
  let closedTermId = "";
  let emptyClassGroupId = "";
  let teacherUserId = "";
  let teacherId = "";
  let teachingGroupId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `RC-${suffix}`, name: "Escola de teste (pautas)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
    teacherUserId = (await prisma.user.create({ data: { name: "Synthetic report owner" } })).id;
    teacherId = (await prisma.teacher.create({ data: { schoolId, userId: teacherUserId, code: `T-${suffix}`, firstName: "Synthetic", lastName: "Owner" } })).id;

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

    const openTerm = await prisma.term.create({
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
    openTermId = openTerm.id;

    const closedTerm = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        sequence: 2,
        name: "2º Trimestre",
        startDate: new Date("2026-04-27"),
        endDate: new Date("2026-08-07"),
        status: "CLOSED",
      },
    });
    closedTermId = closedTerm.id;

    const gradeLevel = await prisma.gradeLevel.create({
      data: { schoolId, code: `GL-${suffix}`, name: "10ª classe", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });

    const studyPath = await prisma.studyPath.create({
      data: { schoolId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, code: `SP-${suffix}`, name: "10ª geral" },
    });

    const subject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });
    subjectId = subject.id;

    const classGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING" },
    });
    classGroupId = classGroup.id;

    const emptyClassGroup = await prisma.classGroup.create({
      data: { schoolId, academicYearId: academicYear.id, name: `10B-${suffix}`, shift: "MORNING" },
    });
    emptyClassGroupId = emptyClassGroup.id;

    const studentA = await prisma.student.create({
      data: { schoolId, code: `STA-${suffix}`, firstName: "Bruna", lastName: "Zunguza", birthDate: new Date("2010-01-01"), gender: "FEMALE" },
    });
    const enrollmentA = await prisma.enrollment.create({
      data: { schoolId, studentId: studentA.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId, number: `2026/${suffix}-A` },
    });
    teachingGroupId = (await prisma.teachingGroup.create({ data: { schoolId, academicYearId: academicYear.id, subjectId, teacherId, name: `Owned-${suffix}`, scope: "CORE", classGroupId, members: { create: { enrollmentId: enrollmentA.id } } } })).id;

    const studentB = await prisma.student.create({
      data: { schoolId, code: `STB-${suffix}`, firstName: "Aires", lastName: "Manhique", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    await prisma.enrollment.create({
      data: { schoolId, studentId: studentB.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId, number: `2026/${suffix}-B` },
    });

    const scheme = await prisma.assessmentScheme.create({
      data: { schoolId, academicYearId: academicYear.id, name: `Esquema ${suffix}` },
    });

    // Só a aluna A tem TermResult no trimestre fechado — o aluno B fica "Pendente".
    await prisma.termResult.create({
      data: {
        schoolId,
        enrollmentId: enrollmentA.id,
        subjectId,
        termId: closedTerm.id,
        schemeId: scheme.id,
        schemeVersion: 1,
        componentAverages: {},
        average: 15,
        finalScore: 15,
        passed: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.termResult.deleteMany({ where: { schoolId } });
    await prisma.assessmentScheme.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.user.delete({ where: { id: teacherUserId } });
    await prisma.$disconnect();
  });

  it("devolve term-open quando o trimestre ainda não foi fechado", async () => {
    const result = await getReportCard(schoolId, classGroupId, subjectId, openTermId);
    expect(result.status).toBe("term-open");
  });

  it("devolve not-found para uma turma, disciplina ou trimestre inexistente", async () => {
    const result = await getReportCard(schoolId, "turma-inexistente", subjectId, closedTermId);
    expect(result.status).toBe("not-found");
  });

  it("devolve as linhas da turma, com pendente para quem não tem TermResult", async () => {
    const result = await getReportCard(schoolId, classGroupId, subjectId, closedTermId);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.rows).toHaveLength(2);

    // Ordenado por apelido: Manhique antes de Zunguza.
    expect(result.rows[0].studentName).toBe("Aires Manhique");
    expect(result.rows[0].passed).toBeNull();
    expect(result.rows[0].average).toBeNull();

    expect(result.rows[1].studentName).toBe("Bruna Zunguza");
    expect(result.rows[1].average).toBe("15");
    expect(result.rows[1].passed).toBe(true);
  });

  it("devolve uma lista vazia para uma turma sem matrículas", async () => {
    const result = await getReportCard(schoolId, emptyClassGroupId, subjectId, closedTermId);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.rows).toHaveLength(0);
  });
  it("limits teacher filters and report rows to owned teaching-group members", async () => {
    const filters = await listReportCardFilters(schoolId, teacherUserId);
    expect(filters.classGroups.map(row => row.id)).toEqual([classGroupId]);
    expect(filters.subjects.map(row => row.id)).toEqual([subjectId]);
    const report = await getReportCard(schoolId, classGroupId, subjectId, closedTermId, teacherUserId);
    expect(report.status).toBe("ready");
    if (report.status === "ready") expect(report.rows.map(row => row.studentName)).toEqual(["Bruna Zunguza"]);
    expect(await getReportCard(schoolId, emptyClassGroupId, subjectId, closedTermId, teacherUserId)).toEqual({ status: "not-found" });
    expect(await getReportCard(schoolId, classGroupId, subjectId, closedTermId, "unrelated-account")).toEqual({ status: "not-found" });
  });
  it("revokes teacher report ownership immediately when the professional profile becomes inactive", async () => {
    await prisma.teacher.update({ where: { id: teacherId }, data: { isActive: false } });
    try {
      expect((await listReportCardFilters(schoolId, teacherUserId)).classGroups).toEqual([]);
      expect(await getReportCard(schoolId, classGroupId, subjectId, closedTermId, teacherUserId)).toEqual({ status: "not-found" });
    } finally { await prisma.teacher.update({ where: { id: teacherId }, data: { isActive: true } }); }
    expect(await prisma.teachingGroup.findUnique({ where: { id: teachingGroupId } })).not.toBeNull();
  });
});
