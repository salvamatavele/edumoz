import { getTenantDb } from "@/lib/db/tenant";

export interface ReportCardFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface ReportCardFilters {
  readonly classGroups: readonly ReportCardFilterOption[];
  readonly subjects: readonly ReportCardFilterOption[];
  readonly terms: readonly ReportCardFilterOption[];
}

/** Opções dos três selectores da pauta — turmas, disciplinas e trimestres do ano activo. */
export async function listReportCardFilters(schoolId: string, teacherUserId?: string): Promise<ReportCardFilters> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return { classGroups: [], subjects: [], terms: [] };

  const [classGroups, subjects, terms] = await Promise.all([
    db.classGroup.findMany({
      where: { academicYearId: academicYear.id, ...(teacherUserId !== undefined ? { enrollments: { some: { teachingGroups: { some: { teachingGroup: { schoolId, teacher: { schoolId, userId: teacherUserId, isActive: true } } } } } } } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.subject.findMany({
      where: { isActive: true, ...(teacherUserId !== undefined ? { teachingGroups: { some: { schoolId, academicYearId: academicYear.id, teacher: { schoolId, userId: teacherUserId, isActive: true } } } } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.term.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, name: true },
      orderBy: { sequence: "asc" },
    }),
  ]);

  return {
    classGroups: classGroups.map((group) => ({ id: group.id, label: group.name })),
    subjects: subjects.map((subject) => ({ id: subject.id, label: subject.name })),
    terms: terms.map((term) => ({ id: term.id, label: term.name })),
  };
}

export interface ReportCardRow {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly average: string | null;
  readonly finalScore: string | null;
  readonly passed: boolean | null;
}

export type ReportCard =
  | { readonly status: "not-found" }
  | { readonly status: "term-open" }
  | {
      readonly status: "ready";
      readonly classGroupName: string;
      readonly subjectName: string;
      readonly termName: string;
      readonly rows: readonly ReportCardRow[];
    };

/**
 * Pauta de uma turma, numa disciplina, num trimestre — lê só de `TermResult`, nunca
 * recalcula. Um trimestre `OPEN` ainda não tem `TermResult` nenhum: a pauta explica
 * porquê, em vez de mostrar uma lista vazia indistinguível de "sem alunos".
 */
export async function getReportCard(
  schoolId: string,
  classGroupId: string,
  subjectId: string,
  termId: string,
  teacherUserId?: string,
): Promise<ReportCard> {
  const db = getTenantDb(schoolId);

  // Ownership is checked before reading names or results, including direct URL requests.
  if (teacherUserId !== undefined) {
    const owned = await db.teachingGroup.findFirst({ where: { schoolId, subjectId, teacher: { schoolId, userId: teacherUserId, isActive: true }, academicYear: { terms: { some: { id: termId, schoolId } } }, members: { some: { enrollment: { schoolId, classGroupId } } } }, select: { id: true } });
    if (!owned) return { status: "not-found" };
  }

  const [classGroup, subject, term] = await Promise.all([
    db.classGroup.findUnique({ where: { id: classGroupId }, select: { name: true } }),
    db.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
    db.term.findUnique({ where: { id: termId }, select: { name: true, status: true } }),
  ]);

  if (!classGroup || !subject || !term) return { status: "not-found" };
  if (term.status !== "CLOSED") return { status: "term-open" };

  const enrollments = await db.enrollment.findMany({
    where: { classGroupId, ...(teacherUserId !== undefined ? { teachingGroups: { some: { teachingGroup: { schoolId, subjectId, teacher: { schoolId, userId: teacherUserId, isActive: true } } } } } : {}) },
    select: {
      id: true,
      student: { select: { firstName: true, lastName: true } },
      termResults: {
        where: { subjectId, termId },
        select: { average: true, finalScore: true, passed: true },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const rows = enrollments.map((enrollment) => {
    const result = enrollment.termResults[0];

    return {
      enrollmentId: enrollment.id,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      average: result?.average?.toString() ?? null,
      finalScore: result?.finalScore?.toString() ?? null,
      passed: result?.passed ?? null,
    } satisfies ReportCardRow;
  });

  return {
    status: "ready",
    classGroupName: classGroup.name,
    subjectName: subject.name,
    termName: term.name,
    rows,
  };
}
