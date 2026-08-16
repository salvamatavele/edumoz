import type { AssessmentRegime, ComponentType, RoundingMode } from "@/types";

import type { DecimalLike, Score } from "@/features/shared/domain/numeric";

/**
 * Tipos do motor de avaliação.
 *
 * São deliberadamente distintos das linhas do Prisma. Uma linha de `AssessmentScheme` é
 * um registo; um `AssessmentSchemeDefinition` é uma FÓRMULA VÁLIDA — os pesos somam 1, a
 * escala é coerente, e as regras de exame já foram resolvidas. A conversão de um para o
 * outro passa por validação, e é isso que impede o motor de calcular a partir de dados
 * impossíveis. Ver docs/specs/domain-foundation.md §4.4.
 */

export interface AssessmentComponentDefinition {
  readonly code: string;
  readonly name: string;
  readonly type: ComponentType;
  /** Fracção da média final. Os pesos de um esquema somam exactamente 1. */
  readonly weight: Score;
  /** Nota mínima neste componente; abaixo dela reprova mesmo com média positiva. */
  readonly minGrade: Score | null;
  readonly order: number;
}

export interface AssessmentSchemeDefinition {
  readonly id: string;
  readonly version: number;
  readonly name: string;

  /** `WITHOUT_ASSESSMENT` desliga o cálculo: a disciplina não produz nota numérica. */
  readonly regime: AssessmentRegime;

  readonly scaleMin: Score;
  readonly scaleMax: Score;
  readonly passMark: Score;
  readonly roundingMode: RoundingMode;
  readonly decimalPlaces: number;

  readonly components: readonly AssessmentComponentDefinition[];

  /**
   * Regras de exame. Todas nuláveis e todas POR CONFIRMAR — ver spec §4.4. Quando nulas,
   * o motor ignora-as por completo, e o resultado é a média ponderada simples.
   */
  readonly hasExam: boolean;
  readonly examWeight: Score;
  readonly minGradeForExam: Score | null;
  readonly exemptionGrade: Score | null;
  readonly minExamGrade: Score | null;
}

/** Uma nota lançada, já associada ao componente a que pertence. */
export interface GradeEntry {
  readonly componentCode: string;
  /** Nulo quando o aluno faltou ou a nota ainda não foi lançada. */
  readonly score: DecimalLike | null;
  /** Escala desta avaliação em concreto; pode diferir da escala do esquema. */
  readonly maxScore: DecimalLike;
  /** Peso desta avaliação dentro do seu componente, quando o componente tem várias. */
  readonly weight: DecimalLike;
  readonly isAbsent: boolean;
}

export interface ComponentResult {
  readonly componentCode: string;
  /** Nulo quando o componente não teve nenhuma nota lançada. */
  readonly average: Score | null;
  /** Peso efectivamente usado — difere do declarado quando houve renormalização. */
  readonly effectiveWeight: Score;
  readonly countedEntries: number;
  readonly meetsMinimum: boolean;
}

/**
 * Motivos pelos quais um resultado pode não ser o cálculo nominal. Existem para a pauta
 * poder explicar-se a um encarregado de educação sem alguém ter de reconstruir o raciocínio.
 */
export type ResultNote =
  | { readonly kind: "COMPONENT_WITHOUT_GRADES"; readonly componentCode: string }
  | { readonly kind: "WEIGHTS_RENORMALISED"; readonly from: string; readonly to: string }
  | { readonly kind: "BELOW_COMPONENT_MINIMUM"; readonly componentCode: string }
  | { readonly kind: "EXEMPT_FROM_EXAM" }
  | { readonly kind: "NOT_ADMITTED_TO_EXAM" }
  | { readonly kind: "BELOW_EXAM_MINIMUM" }
  | { readonly kind: "NO_GRADES_AT_ALL" };

export interface SubjectResult {
  readonly components: readonly ComponentResult[];
  /** Média das componentes, antes do exame. Nula quando não há nota nenhuma. */
  readonly average: Score | null;
  readonly examScore: Score | null;
  /** Nota final: com exame quando aplicável, senão igual à média. */
  readonly finalScore: Score | null;

  readonly isExempt: boolean;
  readonly isAdmittedToExam: boolean;
  /** Nulo enquanto não houver elementos suficientes para decidir. */
  readonly passed: boolean | null;

  readonly notes: readonly ResultNote[];
}

/** Erros de configuração do esquema, detectados antes de qualquer cálculo. */
export type SchemeValidationError =
  | { readonly kind: "WEIGHTS_DO_NOT_SUM_TO_ONE"; readonly actual: string }
  | { readonly kind: "NO_COMPONENTS" }
  | { readonly kind: "DUPLICATE_COMPONENT_CODE"; readonly code: string }
  | { readonly kind: "INVALID_SCALE"; readonly detail: string }
  | { readonly kind: "EXAM_WEIGHT_WITHOUT_EXAM" }
  | { readonly kind: "THRESHOLD_OUT_OF_SCALE"; readonly field: string };
