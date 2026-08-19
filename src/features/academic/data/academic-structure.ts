import { getTenantDb } from "@/lib/db/tenant";
import type { SchoolCycle, Shift, SubjectScope } from "@/types";

export interface SelectOption {
  readonly id: string;
  readonly name: string;
}

export interface GradeLevelRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly order: number;
  readonly cycle: SchoolCycle;
  readonly isExamLevel: boolean;
}

export async function listGradeLevels(schoolId: string): Promise<GradeLevelRow[]> {
  const db = getTenantDb(schoolId);
  return db.gradeLevel.findMany({ orderBy: { order: "asc" } });
}

export interface SectionRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
}

export async function listSections(schoolId: string): Promise<SectionRow[]> {
  const db = getTenantDb(schoolId);
  return db.section.findMany({ orderBy: { name: "asc" } });
}

export interface StudyPathRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly gradeLevel: string;
  readonly section: string | null;
}

/**
 * `StudyPath` vive dentro de um ano lectivo — sem ano activo não há percursos para
 * listar, mesma forma de "sem erro, lista vazia" que `listEnrolledStudents` já usa.
 */
export async function listStudyPaths(
  schoolId: string,
): Promise<{ rows: StudyPathRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const studyPaths = await db.studyPath.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevel: { select: { name: true } },
      section: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = studyPaths.map(
    (path) =>
      ({
        id: path.id,
        code: path.code,
        name: path.name,
        gradeLevel: path.gradeLevel.name,
        section: path.section?.name ?? null,
      }) satisfies StudyPathRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface SubjectRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly area: string | null;
}

export async function listSubjects(schoolId: string): Promise<SubjectRow[]> {
  const db = getTenantDb(schoolId);
  return db.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export interface CurriculumSubjectRow {
  readonly id: string;
  readonly studyPath: string;
  readonly subject: string;
  readonly scope: SubjectScope;
  readonly weeklyHours: number;
  readonly coefficient: string;
  readonly isExamSubject: boolean;
}

export async function listCurriculumSubjects(
  schoolId: string,
): Promise<{ rows: CurriculumSubjectRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const entries = await db.curriculumSubject.findMany({
    where: { studyPath: { academicYearId: academicYear.id } },
    select: {
      id: true,
      scope: true,
      weeklyHours: true,
      coefficient: true,
      isExamSubject: true,
      studyPath: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ studyPath: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  const rows = entries.map(
    (entry) =>
      ({
        id: entry.id,
        studyPath: entry.studyPath.name,
        subject: entry.subject.name,
        scope: entry.scope,
        weeklyHours: entry.weeklyHours,
        coefficient: entry.coefficient.toString(),
        isExamSubject: entry.isExamSubject,
      }) satisfies CurriculumSubjectRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface ClassGroupRow {
  readonly id: string;
  readonly name: string;
  readonly shift: Shift;
  readonly capacity: number;
  /** Director de turma — nulo quando a turma ainda não tem um atribuído. */
  readonly headTeacher: string | null;
}

export async function listClassGroups(
  schoolId: string,
): Promise<{ rows: ClassGroupRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const classGroups = await db.classGroup.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      id: true,
      name: true,
      shift: true,
      capacity: true,
      headTeacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = classGroups.map(
    (group) =>
      ({
        id: group.id,
        name: group.name,
        shift: group.shift,
        capacity: group.capacity,
        headTeacher: group.headTeacher
          ? `${group.headTeacher.firstName} ${group.headTeacher.lastName}`
          : null,
      }) satisfies ClassGroupRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface AcademicStructureOptions {
  readonly gradeLevels: readonly SelectOption[];
  readonly sections: readonly SelectOption[];
  readonly studyPaths: readonly SelectOption[];
  readonly subjects: readonly SelectOption[];
  readonly teachers: readonly SelectOption[];
  readonly hasActiveAcademicYear: boolean;
}

/**
 * Opções resolvidas para os formulários desta secção — `StudyPath` precisa de
 * `GradeLevel`/`Section`, `CurriculumSubject` precisa de `StudyPath`/`Subject`. Uma só
 * consulta agregada em vez de cada `FormModal` ir buscar as suas, tal como
 * `listEnrollmentOptions` já faz para a matrícula.
 */
export async function listAcademicStructureOptions(
  schoolId: string,
): Promise<AcademicStructureOptions> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const [gradeLevels, sections, subjects, studyPaths, teachers] = await Promise.all([
    db.gradeLevel.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
    db.section.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    academicYear
      ? db.studyPath.findMany({
          where: { academicYearId: academicYear.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    db.teacher.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return {
    gradeLevels,
    sections,
    studyPaths,
    subjects,
    teachers: teachers.map((teacher) => ({ id: teacher.id, name: `${teacher.firstName} ${teacher.lastName}` })),
    hasActiveAcademicYear: academicYear !== null,
  };
}
