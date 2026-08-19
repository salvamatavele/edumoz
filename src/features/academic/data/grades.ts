import { listHeadTeacherClassGroupIds } from "@/features/academic/data/attendance";
import type { AssessmentSchemeDefinition, GradeEntry } from "@/features/academic/domain/assessment";
import { getTenantDb } from "@/lib/db/tenant";

import { listSchemesForYear, pickScheme, type ResolvedScheme } from "./scheme-resolution";

export { findTeacherByUserId, listHeadTeacherClassGroupIds } from "@/features/academic/data/attendance";

export interface TeachingGroupAccess {
  readonly teacherId: string | null;
  /** Falso quando visível só por o professor dirigir a turma, não por leccionar. */
  readonly isOwn: boolean;
}

/**
 * Decide se `viewerTeacherId` pode ver (nunca editar — isso é sempre `teacherId`) um
 * agrupamento lectivo: por leccioná-lo, ou por dirigir a turma de algum dos seus membros.
 * `null` quando nem uma coisa nem outra — o chamador trata isso como "não encontrado",
 * mesma forma que uma consulta sem resultados.
 */
export async function resolveTeachingGroupAccess(
  schoolId: string,
  teachingGroupId: string,
  viewerTeacherId: string,
): Promise<TeachingGroupAccess | null> {
  const db = getTenantDb(schoolId);

  const group = await db.teachingGroup.findUnique({
    where: { id: teachingGroupId },
    select: { teacherId: true },
  });

  if (!group) return null;
  if (group.teacherId === viewerTeacherId) return { teacherId: group.teacherId, isOwn: true };

  const directedClassGroupIds = await listHeadTeacherClassGroupIds(schoolId, viewerTeacherId);
  if (directedClassGroupIds.length === 0) return null;

  const hasDirectedMember = await db.teachingGroupMember.findFirst({
    where: { teachingGroupId, enrollment: { classGroupId: { in: directedClassGroupIds } } },
    select: { enrollmentId: true },
  });

  if (!hasDirectedMember) return null;

  return { teacherId: group.teacherId, isOwn: false };
}

export interface TeacherTeachingGroupOption {
  readonly id: string;
  readonly name: string;
  readonly subjectName: string;
  /** Falso quando visível só por o professor dirigir a turma, não por leccionar. */
  readonly isOwn: boolean;
}

/**
 * Agrupamentos lectivos do professor no ano lectivo activo. Ao contrário de Presenças (que
 * parte do horário do dia), aqui não há "dia" — um professor lança notas de um agrupamento
 * seu em qualquer altura do trimestre, não só numa aula concreta.
 *
 * Um director de turma vê também os agrupamentos de outros professores para a turma que
 * dirige, marcados `isOwn: false` — só para consulta (ver `getGradeRoster`, que continua a
 * recusar a escrita a quem não lecciona).
 */
export async function listTeacherTeachingGroups(
  schoolId: string,
  teacherId: string,
): Promise<TeacherTeachingGroupOption[]> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return [];

  const directedClassGroupIds = await listHeadTeacherClassGroupIds(schoolId, teacherId);

  const groups = await db.teachingGroup.findMany({
    where: {
      academicYearId: academicYear.id,
      OR:
        directedClassGroupIds.length > 0
          ? [
              { teacherId },
              {
                members: { some: { enrollment: { classGroupId: { in: directedClassGroupIds } } } },
              },
            ]
          : [{ teacherId }],
    },
    select: { id: true, teacherId: true, name: true, subject: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    subjectName: group.subject.name,
    isOwn: group.teacherId === teacherId,
  }));
}

export type ResolvedTeachingGroupScheme = ResolvedScheme;

/**
 * Esquema aplicável a um agrupamento lectivo, no ano lectivo activo — resolvido por
 * `resolveApplicableScheme` (classe+disciplina → disciplina → classe → base do ano). A
 * classe do agrupamento vem de qualquer membro seu: turmas mistas juntam secções
 * diferentes, nunca classes diferentes (ver docs/specs/domain-foundation.md §4.2).
 */
export async function resolveTeachingGroupScheme(
  schoolId: string,
  teachingGroupId: string,
): Promise<ResolvedTeachingGroupScheme | null> {
  const db = getTenantDb(schoolId);

  const group = await db.teachingGroup.findUnique({
    where: { id: teachingGroupId },
    select: {
      academicYearId: true,
      subjectId: true,
      members: {
        take: 1,
        select: { enrollment: { select: { studyPath: { select: { gradeLevelId: true } } } } },
      },
    },
  });

  const gradeLevelId = group?.members[0]?.enrollment.studyPath.gradeLevelId;
  if (!group || !gradeLevelId) return null;

  const schemes = await listSchemesForYear(schoolId, group.academicYearId);
  return pickScheme(schemes, { gradeLevelId, subjectId: group.subjectId });
}

/** O trimestre "de trabalho" — o primeiro `Term` aberto do ano lectivo activo. */
export async function findCurrentOpenTerm(
  schoolId: string,
): Promise<{ id: string; name: string } | null> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return null;

  return db.term.findFirst({
    where: { academicYearId: academicYear.id, status: "OPEN" },
    select: { id: true, name: true },
    orderBy: { sequence: "asc" },
  });
}

export interface TeachingGroupAssessmentRow {
  readonly id: string;
  readonly name: string;
  readonly componentCode: string;
  readonly componentName: string;
  readonly maxScore: string;
  readonly weight: string;
  readonly date: string;
}

/** Avaliações já criadas para um agrupamento, num trimestre — a lista da página do grupo. */
export async function listTeachingGroupAssessments(
  schoolId: string,
  teachingGroupId: string,
  termId: string,
): Promise<TeachingGroupAssessmentRow[]> {
  const db = getTenantDb(schoolId);

  const assessments = await db.assessment.findMany({
    where: { teachingGroupId, termId },
    select: {
      id: true,
      name: true,
      maxScore: true,
      weight: true,
      date: true,
      component: { select: { code: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return assessments.map((assessment) => ({
    id: assessment.id,
    name: assessment.name,
    componentCode: assessment.component.code,
    componentName: assessment.component.name,
    maxScore: assessment.maxScore.toString(),
    weight: assessment.weight.toString(),
    date: assessment.date.toISOString(),
  }));
}

export interface GradeRosterEntry {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly score: string | null;
  readonly isAbsent: boolean;
  readonly note: string | null;
  /** As restantes notas do aluno, este trimestre, para o cálculo da média ao vivo. */
  readonly otherEntries: readonly GradeEntry[];
}

export interface GradeRoster {
  readonly teachingGroupId: string;
  readonly teacherId: string | null;
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly assessment: {
    readonly id: string;
    readonly name: string;
    readonly componentCode: string;
    readonly maxScore: string;
    readonly weight: string;
    readonly termId: string;
  };
  readonly scheme: AssessmentSchemeDefinition;
  readonly entries: readonly GradeRosterEntry[];
  /** Falso quando `viewerTeacherId` não é quem lecciona — só consulta. */
  readonly isOwn: boolean;
}

/**
 * Alunos da grelha de lançamento — do agrupamento (`TeachingGroupMember`), nunca da turma,
 * mesma razão que a folha de presenças. `otherEntries` traz as notas já lançadas nas
 * OUTRAS avaliações do trimestre, para a média ao vivo reflectir a disciplina inteira, não
 * só a avaliação aberta.
 *
 * `viewerTeacherId` só decide `isOwn` (para a UI esconder a edição) — a autorização real
 * de escrita vive em `record-grades.ts`, que volta a verificar posse.
 */
export async function getGradeRoster(
  schoolId: string,
  assessmentId: string,
  viewerTeacherId: string | null = null,
): Promise<GradeRoster | null> {
  const db = getTenantDb(schoolId);

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      name: true,
      maxScore: true,
      weight: true,
      termId: true,
      teachingGroupId: true,
      component: { select: { code: true } },
      teachingGroup: { select: { name: true, teacherId: true, subject: { select: { name: true } } } },
    },
  });

  if (!assessment) return null;

  const resolvedScheme = await resolveTeachingGroupScheme(schoolId, assessment.teachingGroupId);
  if (!resolvedScheme) return null;

  let isOwn = true;

  if (viewerTeacherId !== null) {
    const access = await resolveTeachingGroupAccess(schoolId, assessment.teachingGroupId, viewerTeacherId);
    if (!access) return null;
    isOwn = access.isOwn;
  }

  const [members, allGradesThisTerm] = await Promise.all([
    db.teachingGroupMember.findMany({
      where: { teachingGroupId: assessment.teachingGroupId },
      select: {
        enrollmentId: true,
        enrollment: { select: { student: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { enrollment: { student: { lastName: "asc" } } },
    }),
    db.grade.findMany({
      where: { assessment: { teachingGroupId: assessment.teachingGroupId, termId: assessment.termId } },
      select: {
        enrollmentId: true,
        score: true,
        isAbsent: true,
        assessmentId: true,
        assessment: { select: { maxScore: true, weight: true, component: { select: { code: true } } } },
      },
    }),
  ]);

  const gradesByEnrollment = new Map<string, typeof allGradesThisTerm>();
  for (const grade of allGradesThisTerm) {
    const list = gradesByEnrollment.get(grade.enrollmentId) ?? [];
    list.push(grade);
    gradesByEnrollment.set(grade.enrollmentId, list);
  }

  const entries = members.map((member) => {
    const grades = gradesByEnrollment.get(member.enrollmentId) ?? [];
    const current = grades.find((grade) => grade.assessmentId === assessment.id);
    const other = grades.filter((grade) => grade.assessmentId !== assessment.id);

    return {
      enrollmentId: member.enrollmentId,
      studentName: `${member.enrollment.student.firstName} ${member.enrollment.student.lastName}`,
      score: current?.score?.toString() ?? null,
      isAbsent: current?.isAbsent ?? false,
      note: null,
      otherEntries: other.map(
        (grade) =>
          ({
            componentCode: grade.assessment.component.code,
            score: grade.score?.toString() ?? null,
            maxScore: grade.assessment.maxScore.toString(),
            weight: grade.assessment.weight.toString(),
            isAbsent: grade.isAbsent,
          }) satisfies GradeEntry,
      ),
    } satisfies GradeRosterEntry;
  });

  return {
    teachingGroupId: assessment.teachingGroupId,
    teacherId: assessment.teachingGroup.teacherId,
    teachingGroupName: assessment.teachingGroup.name,
    subjectName: assessment.teachingGroup.subject.name,
    assessment: {
      id: assessment.id,
      name: assessment.name,
      componentCode: assessment.component.code,
      maxScore: assessment.maxScore.toString(),
      weight: assessment.weight.toString(),
      termId: assessment.termId,
    },
    scheme: resolvedScheme.definition,
    entries,
    isOwn,
  };
}
