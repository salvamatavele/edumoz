import type { AssessmentSchemeDefinition } from "@/features/academic/domain/assessment";
import { resolveApplicableScheme, type SchemeScope } from "@/features/academic/domain/grade-engine";
import { toDecimal } from "@/features/shared/domain/numeric";
import { getTenantDb, type TenantDb } from "@/lib/db/tenant";

/**
 * Resolução do esquema aplicável — partilhada entre a grelha de lançamento
 * (`grades.ts`, um agrupamento de cada vez) e o fecho de trimestre (`term-results.ts`, o
 * ano inteiro de uma vez). Uma só consulta dos esquemas do ano, reutilizada para resolver
 * várias combinações classe+disciplina em memória — nunca uma consulta por combinação.
 */

interface SchemeCandidateRow extends SchemeScope {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly regime: AssessmentSchemeDefinition["regime"];
  readonly scaleMin: { toString(): string };
  readonly scaleMax: { toString(): string };
  readonly passMark: { toString(): string };
  readonly roundingMode: AssessmentSchemeDefinition["roundingMode"];
  readonly decimalPlaces: number;
  readonly hasExam: boolean;
  readonly examWeight: { toString(): string };
  readonly minGradeForExam: { toString(): string } | null;
  readonly exemptionGrade: { toString(): string } | null;
  readonly minExamGrade: { toString(): string } | null;
  readonly components: ReadonlyArray<{
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly type: AssessmentSchemeDefinition["components"][number]["type"];
    readonly weight: { toString(): string };
    readonly minGrade: { toString(): string } | null;
    readonly order: number;
  }>;
}

function toSchemeDefinition(row: SchemeCandidateRow): AssessmentSchemeDefinition {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    regime: row.regime,
    scaleMin: toDecimal(row.scaleMin.toString()),
    scaleMax: toDecimal(row.scaleMax.toString()),
    passMark: toDecimal(row.passMark.toString()),
    roundingMode: row.roundingMode,
    decimalPlaces: row.decimalPlaces,
    hasExam: row.hasExam,
    examWeight: toDecimal(row.examWeight.toString()),
    minGradeForExam: row.minGradeForExam ? toDecimal(row.minGradeForExam.toString()) : null,
    exemptionGrade: row.exemptionGrade ? toDecimal(row.exemptionGrade.toString()) : null,
    minExamGrade: row.minExamGrade ? toDecimal(row.minExamGrade.toString()) : null,
    components: [...row.components]
      .sort((a, b) => a.order - b.order)
      .map((component) => ({
        code: component.code,
        name: component.name,
        type: component.type,
        weight: toDecimal(component.weight.toString()),
        minGrade: component.minGrade ? toDecimal(component.minGrade.toString()) : null,
        order: component.order,
      })),
  };
}

export interface ResolvedScheme {
  readonly schemeId: string;
  readonly definition: AssessmentSchemeDefinition;
  /** Ids reais dos componentes na base de dados — a `code` sozinha não chega para a FK
   * `Assessment.componentId`. */
  readonly components: ReadonlyArray<{ readonly id: string; readonly code: string; readonly name: string }>;
}

/** Todos os esquemas de avaliação do ano lectivo, prontos para `pickScheme` resolver várias
 * combinações classe+disciplina sem uma consulta por combinação. */
export async function listSchemesForYear(schoolId: string, academicYearId: string, db: Pick<TenantDb, "assessmentScheme"> = getTenantDb(schoolId)): Promise<readonly SchemeCandidateRow[]> {

  return db.assessmentScheme.findMany({
    where: { academicYearId },
    select: {
      id: true,
      version: true,
      name: true,
      gradeLevelId: true,
      subjectId: true,
      regime: true,
      scaleMin: true,
      scaleMax: true,
      passMark: true,
      roundingMode: true,
      decimalPlaces: true,
      hasExam: true,
      examWeight: true,
      minGradeForExam: true,
      exemptionGrade: true,
      minExamGrade: true,
      components: {
        select: { id: true, code: true, name: true, type: true, weight: true, minGrade: true, order: true },
      },
    },
  });
}

/** Resolve, em memória, qual dos esquemas já carregados (`listSchemesForYear`) se aplica a
 * uma classe e disciplina — mesma prioridade de `resolveApplicableScheme`. */
export function pickScheme(
  schemes: readonly SchemeCandidateRow[],
  scope: { readonly gradeLevelId: string; readonly subjectId: string },
): ResolvedScheme | null {
  const resolved = resolveApplicableScheme(schemes, scope);
  if (!resolved) return null;

  return {
    schemeId: resolved.id,
    definition: toSchemeDefinition(resolved),
    components: [...resolved.components]
      .sort((a, b) => a.order - b.order)
      .map((component) => ({ id: component.id, code: component.code, name: component.name })),
  };
}
