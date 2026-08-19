import { suggestEnrollmentNumber } from "@/features/academic/domain/enrollment-number";
import { getTenantDb } from "@/lib/db/tenant";

export interface UnenrolledStudentRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly gender: "MALE" | "FEMALE";
  readonly birthDate: string;
}

/**
 * Alunos da escola sem matrícula no ano lectivo activo.
 *
 * `create-student` (Fase 3) só grava o `Student` — sem isto, um aluno criado fica
 * invisível em qualquer ecrã, porque `listEnrolledStudents` parte da `Enrollment`, não do
 * `Student`. Mesma forma de lidar com "sem ano activo" que `listEnrolledStudents`: lista
 * vazia, sem erro.
 */
export async function listUnenrolledStudents(schoolId: string): Promise<{
  rows: UnenrolledStudentRow[];
  academicYear: string | null;
}> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const students = await db.student.findMany({
    where: {
      isActive: true,
      enrollments: { none: { academicYearId: academicYear.id } },
    },
    select: { id: true, code: true, firstName: true, lastName: true, gender: true, birthDate: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = students.map(
    (student) =>
      ({
        id: student.id,
        code: student.code,
        name: `${student.firstName} ${student.lastName}`,
        gender: student.gender,
        birthDate: student.birthDate.toISOString(),
      }) satisfies UnenrolledStudentRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface EnrollmentOption {
  readonly id: string;
  readonly name: string;
}

export interface EnrollmentOptions {
  readonly academicYearId: string;
  readonly suggestedNumber: string;
  readonly classGroups: readonly EnrollmentOption[];
  readonly studyPaths: readonly EnrollmentOption[];
}

/**
 * Turmas e percursos do ano lectivo activo, para o formulário de matrícula — e a sugestão
 * de número, já calculada aqui porque a contagem de matrículas existentes é a mesma
 * consulta que já precisa de correr para saber o ano activo.
 */
export async function listEnrollmentOptions(schoolId: string): Promise<EnrollmentOptions | null> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, year: true },
  });

  if (!academicYear) return null;

  const [classGroups, studyPaths, enrollmentCount] = await Promise.all([
    db.classGroup.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.studyPath.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.enrollment.count({ where: { academicYearId: academicYear.id } }),
  ]);

  return {
    academicYearId: academicYear.id,
    suggestedNumber: suggestEnrollmentNumber(academicYear.year, enrollmentCount),
    classGroups,
    studyPaths,
  };
}
