import { getTenantDb } from "@/lib/db/tenant";

export interface StudentRow {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly classGroup: string;
  readonly studyPath: string;
  readonly gender: "MALE" | "FEMALE";
  readonly birthDate: string;
  readonly guardian: string | null;
}

/**
 * Alunos matriculados no ano lectivo activo.
 *
 * Repare-se que a consulta parte da MATRÍCULA e não do aluno: é a matrícula que liga o
 * aluno ao percurso e à turma num ano concreto, e é dela que sai o "Percurso" da lista.
 * Dois alunos da mesma turma podem ter percursos diferentes — é o caso das turmas mistas.
 * Ver docs/specs/domain-foundation.md §4.2.
 */
export async function listEnrolledStudents(schoolId: string): Promise<{
  rows: StudentRow[];
  academicYear: string | null;
}> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const enrollments = await db.enrollment.findMany({
    where: { academicYearId: academicYear.id, status: "ACTIVE" },
    select: {
      id: true,
      number: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          guardians: {
            where: { isPrimary: true },
            select: { guardian: { select: { firstName: true, lastName: true } } },
            take: 1,
          },
        },
      },
      classGroup: { select: { name: true } },
      studyPath: { select: { name: true } },
    },
    orderBy: [{ classGroup: { name: "asc" } }, { student: { lastName: "asc" } }],
  });

  const rows = enrollments.map((enrollment) => {
    const guardian = enrollment.student.guardians[0]?.guardian;

    return {
      id: enrollment.id,
      number: enrollment.number,
      name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      classGroup: enrollment.classGroup.name,
      studyPath: enrollment.studyPath.name,
      gender: enrollment.student.gender,
      // Serializado como ISO para atravessar a fronteira servidor→cliente; a formatação
      // por língua acontece no componente, com os formatos de `src/i18n/request.ts`.
      birthDate: enrollment.student.birthDate.toISOString(),
      guardian: guardian ? `${guardian.firstName} ${guardian.lastName}` : null,
    } satisfies StudentRow;
  });

  return { rows, academicYear: academicYear.label };
}
