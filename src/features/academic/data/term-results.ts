import type { GradeEntry } from "@/features/academic/domain/assessment";
import { getTenantDb } from "@/lib/db/tenant";

import { listSchemesForYear, pickScheme } from "./scheme-resolution";

export interface TermOption {
  readonly id: string;
  readonly name: string;
  readonly status: "OPEN" | "CLOSED";
}

/** Trimestres do ano lectivo activo — para o gestor escolher qual fechar. */
export async function listTerms(schoolId: string): Promise<TermOption[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return [];

  const terms = await db.term.findMany({
    where: { academicYearId: academicYear.id },
    select: { id: true, name: true, status: true },
    orderBy: { sequence: "asc" },
  });

  return terms;
}

interface ClosingSubjectEntry {
  readonly enrollmentId: string;
  readonly subjectId: string;
  readonly gradeLevelId: string;
  readonly entries: readonly GradeEntry[];
}

export interface TermClosingPlan {
  readonly termId: string;
  readonly academicYearId: string;
  /** Uma linha por matrícula×disciplina do seu percurso — o que `closeTerm` percorre. */
  readonly subjectEntries: readonly ClosingSubjectEntry[];
}

/**
 * Reúne tudo o que `closeTerm` precisa para calcular: cada matrícula activa do ano, as
 * disciplinas do seu percurso (`CurriculumSubject`), e as notas já lançadas nesse
 * trimestre para cada uma — cruzando `Assessment` (que sabe a disciplina, via
 * `teachingGroup.subjectId`) com `Grade` (que sabe a matrícula).
 */
export async function getTermClosingPlan(schoolId: string, termId: string): Promise<TermClosingPlan | null> {
  const db = getTenantDb(schoolId);

  const term = await db.term.findUnique({
    where: { id: termId },
    select: { id: true, academicYearId: true, status: true },
  });

  if (!term) return null;

  const [enrollments, grades] = await Promise.all([
    db.enrollment.findMany({
      where: { academicYearId: term.academicYearId, status: "ACTIVE" },
      select: {
        id: true,
        studyPath: {
          select: {
            gradeLevelId: true,
            curriculumSubjects: { select: { subjectId: true } },
          },
        },
      },
    }),
    db.grade.findMany({
      where: { assessment: { termId } },
      select: {
        enrollmentId: true,
        score: true,
        isAbsent: true,
        assessment: {
          select: {
            maxScore: true,
            weight: true,
            component: { select: { code: true } },
            teachingGroup: { select: { subjectId: true } },
          },
        },
      },
    }),
  ]);

  // Chave "matrícula:disciplina" — uma disciplina só se cruza com uma matrícula através do
  // agrupamento lectivo que a lecciona, nunca directamente.
  const gradesByKey = new Map<string, GradeEntry[]>();
  for (const grade of grades) {
    const key = `${grade.enrollmentId}:${grade.assessment.teachingGroup.subjectId}`;
    const list = gradesByKey.get(key) ?? [];
    list.push({
      componentCode: grade.assessment.component.code,
      score: grade.score?.toString() ?? null,
      maxScore: grade.assessment.maxScore.toString(),
      weight: grade.assessment.weight.toString(),
      isAbsent: grade.isAbsent,
    });
    gradesByKey.set(key, list);
  }

  const subjectEntries: ClosingSubjectEntry[] = [];
  for (const enrollment of enrollments) {
    for (const curriculumSubject of enrollment.studyPath.curriculumSubjects) {
      const key = `${enrollment.id}:${curriculumSubject.subjectId}`;
      subjectEntries.push({
        enrollmentId: enrollment.id,
        subjectId: curriculumSubject.subjectId,
        gradeLevelId: enrollment.studyPath.gradeLevelId,
        entries: gradesByKey.get(key) ?? [],
      });
    }
  }

  return { termId: term.id, academicYearId: term.academicYearId, subjectEntries };
}

export { listSchemesForYear, pickScheme };
