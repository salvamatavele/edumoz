// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { getGradeRoster, listTeacherTeachingGroups, resolveTeachingGroupAccess } = await import("./grades");

/**
 * Director de turma: vê notas de disciplinas que não lecciona, desde que sejam da turma
 * que dirige — nunca edita (`record-grades.test.ts` já cobre a recusa de escrita a quem
 * não é dono do agrupamento, director ou não). Ver
 * openspec/changes/permissions-management/design.md.
 */
describe("director de turma — notas", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let ownTeacherId = "";
  let directorTeacherId = "";
  let otherTeacherId = "";
  let teachingGroupId = "";
  let assessmentId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `HTG-${suffix}`, name: "Escola de teste (director de turma, notas)", province: "Maputo", district: "KaMpfumu" },
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
    const subject = await prisma.subject.create({ data: { schoolId, code: `MAT-${suffix}`, name: "Matemática" } });

    const scheme = await prisma.assessmentScheme.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: `Esquema ${suffix}`,
        components: { create: [{ code: "AC", name: "Avaliação Contínua", type: "CONTINUOUS", weight: 1, order: 0 }] },
      },
    });
    const component = await prisma.assessmentComponent.findFirstOrThrow({ where: { schemeId: scheme.id } });

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
      data: { schoolId, academicYearId: academicYear.id, name: `10A-${suffix}`, shift: "MORNING", headTeacherId: directorTeacherId },
    });

    const student = await prisma.student.create({
      data: { schoolId, code: `ST-${suffix}`, firstName: "Aluno", lastName: "Teste", birthDate: new Date("2010-01-01"), gender: "MALE" },
    });
    const enrollment = await prisma.enrollment.create({
      data: { schoolId, studentId: student.id, academicYearId: academicYear.id, studyPathId: studyPath.id, classGroupId: classGroup.id, number: `2026/${suffix}` },
    });

    const teachingGroup = await prisma.teachingGroup.create({
      data: { schoolId, academicYearId: academicYear.id, subjectId: subject.id, teacherId: ownTeacherId, name: `Mat-${suffix}`, scope: "CORE" },
    });
    teachingGroupId = teachingGroup.id;

    await prisma.teachingGroupMember.create({
      data: { teachingGroupId: teachingGroup.id, enrollmentId: enrollment.id },
    });

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        teachingGroupId: teachingGroup.id,
        termId: term.id,
        componentId: component.id,
        name: `Teste 1 (${suffix})`,
        maxScore: 20,
        weight: 1,
        date: new Date("2026-02-10"),
      },
    });
    assessmentId = assessment.id;
  });

  afterAll(async () => {
    // `Assessment.component` e `Enrollment.classGroup` não têm `onDelete: Cascade` — apagar
    // antes da escola evita que a cascata tente apagar `AssessmentComponent`/`ClassGroup`
    // com filas ainda a apontar para eles.
    await prisma.assessment.deleteMany({ where: { schoolId } });
    await prisma.enrollment.deleteMany({ where: { schoolId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("resolveTeachingGroupAccess: isOwn verdadeiro para o professor dono", async () => {
    const access = await resolveTeachingGroupAccess(schoolId, teachingGroupId, ownTeacherId);
    expect(access).toEqual({ teacherId: ownTeacherId, isOwn: true });
  });

  it("resolveTeachingGroupAccess: isOwn falso, mas visível, para o director de turma", async () => {
    const access = await resolveTeachingGroupAccess(schoolId, teachingGroupId, directorTeacherId);
    expect(access).toEqual({ teacherId: ownTeacherId, isOwn: false });
  });

  it("resolveTeachingGroupAccess: null para um professor que nem lecciona nem dirige", async () => {
    expect(await resolveTeachingGroupAccess(schoolId, teachingGroupId, otherTeacherId)).toBeNull();
  });

  it("listTeacherTeachingGroups: o professor dono vê o seu agrupamento, marcado isOwn", async () => {
    const groups = await listTeacherTeachingGroups(schoolId, ownTeacherId);
    expect(groups).toHaveLength(1);
    expect(groups[0].isOwn).toBe(true);
  });

  it("listTeacherTeachingGroups: o director de turma vê o agrupamento da turma, marcado isOwn: false", async () => {
    const groups = await listTeacherTeachingGroups(schoolId, directorTeacherId);
    expect(groups).toHaveLength(1);
    expect(groups[0].isOwn).toBe(false);
  });

  it("listTeacherTeachingGroups: um professor sem ligação nenhuma não vê nada", async () => {
    expect(await listTeacherTeachingGroups(schoolId, otherTeacherId)).toEqual([]);
  });

  it("getGradeRoster: isOwn verdadeiro para o professor dono", async () => {
    const roster = await getGradeRoster(schoolId, assessmentId, ownTeacherId);
    expect(roster?.isOwn).toBe(true);
  });

  it("getGradeRoster: isOwn falso para o director de turma, mas continua a ver a grelha", async () => {
    const roster = await getGradeRoster(schoolId, assessmentId, directorTeacherId);
    expect(roster).not.toBeNull();
    expect(roster?.isOwn).toBe(false);
    expect(roster?.entries).toHaveLength(1);
  });

  it("getGradeRoster: null para um professor que nem lecciona nem dirige a turma", async () => {
    expect(await getGradeRoster(schoolId, assessmentId, otherTeacherId)).toBeNull();
  });
});
