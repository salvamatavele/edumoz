import { getTenantDb } from "@/lib/db/tenant";
import type { AssessmentRegime } from "@/types";

import type { SelectOption } from "./academic-structure";

export interface AssessmentSchemeRow {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly regime: AssessmentRegime;
  readonly gradeLevel: string | null;
  readonly subject: string | null;
  readonly hasExam: boolean;
  readonly componentCount: number;
}

/** Esquemas do ano lectivo activo, do mais específico (classe+disciplina) ao mais geral. */
export async function listAssessmentSchemes(
  schoolId: string,
): Promise<{ rows: AssessmentSchemeRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const schemes = await db.assessmentScheme.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      id: true,
      name: true,
      version: true,
      regime: true,
      hasExam: true,
      gradeLevel: { select: { name: true } },
      subject: { select: { name: true } },
      _count: { select: { components: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = schemes.map(
    (scheme) =>
      ({
        id: scheme.id,
        name: scheme.name,
        version: scheme.version,
        regime: scheme.regime,
        gradeLevel: scheme.gradeLevel?.name ?? null,
        subject: scheme.subject?.name ?? null,
        hasExam: scheme.hasExam,
        componentCount: scheme._count.components,
      }) satisfies AssessmentSchemeRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface AssessmentSchemeOptions {
  readonly gradeLevels: readonly SelectOption[];
  readonly subjects: readonly SelectOption[];
  readonly hasActiveAcademicYear: boolean;
}

export async function listAssessmentSchemeOptions(
  schoolId: string,
): Promise<AssessmentSchemeOptions> {
  const db = getTenantDb(schoolId);

  const [academicYear, gradeLevels, subjects] = await Promise.all([
    db.academicYear.findFirst({ where: { isActive: true }, select: { id: true } }),
    db.gradeLevel.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
    db.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { gradeLevels, subjects, hasActiveAcademicYear: academicYear !== null };
}
