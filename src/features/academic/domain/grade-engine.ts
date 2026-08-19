import { AssessmentRegime, RoundingMode } from "@/types";

import {
  Decimal,
  type DecimalLike,
  type Score,
  roundScore,
  toDecimal,
} from "@/features/shared/domain/numeric";

import type {
  AssessmentSchemeDefinition,
  ComponentResult,
  GradeEntry,
  ResultNote,
  SchemeValidationError,
  SubjectResult,
} from "./assessment";

/**
 * Motor de avaliação.
 *
 * Função pura: sem I/O, sem Prisma, sem data actual. A fórmula vem toda do esquema, o que
 * é o que permite a uma escola mudar de `(AC*0.4)+(AT*0.6)` para outra combinação sem que
 * uma linha de código mude. Ver docs/specs/domain-foundation.md §4.4.
 */

const ONE = new Decimal(1);
const ZERO = new Decimal(0);

/**
 * Valida o esquema ANTES de processar notas.
 *
 * Devolve uma lista em vez de lançar na primeira falha: quem configura o esquema no painel
 * de administração deve ver tudo o que está errado de uma vez, não corrigir um erro para
 * descobrir o seguinte.
 */
export function validateScheme(
  scheme: AssessmentSchemeDefinition,
): readonly SchemeValidationError[] {
  const errors: SchemeValidationError[] = [];

  const scaleMin = toDecimal(scheme.scaleMin);
  const scaleMax = toDecimal(scheme.scaleMax);
  const passMark = toDecimal(scheme.passMark);

  if (scaleMin.greaterThanOrEqualTo(scaleMax)) {
    errors.push({
      kind: "INVALID_SCALE",
      detail: `scaleMin (${scaleMin}) deve ser menor que scaleMax (${scaleMax}).`,
    });
  }

  if (passMark.lessThan(scaleMin) || passMark.greaterThan(scaleMax)) {
    errors.push({
      kind: "INVALID_SCALE",
      detail: `passMark (${passMark}) fora da escala [${scaleMin}, ${scaleMax}].`,
    });
  }

  if (scheme.regime === AssessmentRegime.WITH_ASSESSMENT) {
    if (scheme.components.length === 0) {
      errors.push({ kind: "NO_COMPONENTS" });
    }

    const seen = new Set<string>();
    for (const component of scheme.components) {
      if (seen.has(component.code)) {
        errors.push({ kind: "DUPLICATE_COMPONENT_CODE", code: component.code });
      }
      seen.add(component.code);
    }

    if (scheme.components.length > 0) {
      const total = scheme.components.reduce<Decimal>(
        (acc, component) => acc.plus(toDecimal(component.weight)),
        ZERO,
      );

      // Comparação em Decimal. Em vírgula flutuante, 0.4 + 0.6 nem sempre é 1.
      if (!total.equals(ONE)) {
        errors.push({ kind: "WEIGHTS_DO_NOT_SUM_TO_ONE", actual: total.toString() });
      }
    }
  }

  if (!scheme.hasExam && !toDecimal(scheme.examWeight).equals(ZERO)) {
    errors.push({ kind: "EXAM_WEIGHT_WITHOUT_EXAM" });
  }

  const thresholds: ReadonlyArray<readonly [string, Score | null]> = [
    ["minGradeForExam", scheme.minGradeForExam],
    ["exemptionGrade", scheme.exemptionGrade],
    ["minExamGrade", scheme.minExamGrade],
  ];

  for (const [field, value] of thresholds) {
    if (value === null) continue;

    const decimal = toDecimal(value);
    if (decimal.lessThan(scaleMin) || decimal.greaterThan(scaleMax)) {
      errors.push({ kind: "THRESHOLD_OUT_OF_SCALE", field });
    }
  }

  return errors;
}

/** Converte uma nota para a escala do esquema. Um teste sobre 100 vale o mesmo sobre 20. */
function normalise(score: DecimalLike, maxScore: DecimalLike, scaleMax: Decimal): Decimal {
  const max = toDecimal(maxScore);

  if (max.lessThanOrEqualTo(ZERO)) {
    throw new Error(`maxScore tem de ser positivo, recebeu ${max}.`);
  }

  return toDecimal(score).dividedBy(max).times(scaleMax);
}

function averageOfComponent(
  entries: readonly GradeEntry[],
  scaleMax: Decimal,
): { average: Decimal | null; counted: number } {
  // Uma entrada conta se tiver nota. `isAbsent` com nota significa que a escola atribuiu
  // um valor à falta (tipicamente zero) — e nesse caso a nota conta, como é devido.
  const counted = entries.filter((entry) => entry.score !== null);

  if (counted.length === 0) return { average: null, counted: 0 };

  let weightedSum = ZERO;
  let totalWeight = ZERO;

  for (const entry of counted) {
    const weight = toDecimal(entry.weight);
    weightedSum = weightedSum.plus(
      normalise(entry.score as DecimalLike, entry.maxScore, scaleMax).times(weight),
    );
    totalWeight = totalWeight.plus(weight);
  }

  if (totalWeight.equals(ZERO)) return { average: null, counted: 0 };

  return { average: weightedSum.dividedBy(totalWeight), counted: counted.length };
}

function emptyResult(notes: readonly ResultNote[], components: readonly ComponentResult[]) {
  return {
    components,
    average: null,
    examScore: null,
    finalScore: null,
    isExempt: false,
    isAdmittedToExam: false,
    passed: null,
    notes,
  } satisfies SubjectResult;
}

/**
 * Calcula o resultado de um aluno numa disciplina, num trimestre.
 *
 * `examScore` é passado à parte e não como componente: no esquema, o exame pesa FORA da
 * média das componentes. Entradas cujo `componentCode` não exista no esquema são ignoradas.
 */
export function computeSubjectResult(
  scheme: AssessmentSchemeDefinition,
  entries: readonly GradeEntry[],
  examScore: DecimalLike | null = null,
): SubjectResult {
  const notes: ResultNote[] = [];

  if (scheme.regime === AssessmentRegime.WITHOUT_ASSESSMENT) {
    return emptyResult(notes, []);
  }

  const scaleMax = toDecimal(scheme.scaleMax);
  const passMark = toDecimal(scheme.passMark);
  const round = (value: Decimal) =>
    roundScore(value, scheme.roundingMode, scheme.decimalPlaces);

  // --- Médias por componente -------------------------------------------------
  const byCode = new Map<string, GradeEntry[]>();
  for (const entry of entries) {
    const bucket = byCode.get(entry.componentCode);
    if (bucket) bucket.push(entry);
    else byCode.set(entry.componentCode, [entry]);
  }

  const ordered = [...scheme.components].sort((a, b) => a.order - b.order);

  const raw = ordered.map((component) => {
    const { average, counted } = averageOfComponent(
      byCode.get(component.code) ?? [],
      scaleMax,
    );

    if (average === null) {
      notes.push({ kind: "COMPONENT_WITHOUT_GRADES", componentCode: component.code });
    }

    return { component, average, counted };
  });

  // --- Renormalização dos pesos ----------------------------------------------
  // Um componente sem notas não deve arrastar a média para baixo. Redistribui-se o seu
  // peso pelos restantes, e o facto fica registado na pauta em vez de ficar implícito.
  const withGrades = raw.filter((item) => item.average !== null);

  const declaredWeight = withGrades.reduce<Decimal>(
    (acc, item) => acc.plus(toDecimal(item.component.weight)),
    ZERO,
  );

  if (withGrades.length === 0 || declaredWeight.equals(ZERO)) {
    notes.push({ kind: "NO_GRADES_AT_ALL" });

    const components = raw.map(
      (item) =>
        ({
          componentCode: item.component.code,
          average: null,
          effectiveWeight: ZERO,
          countedEntries: 0,
          meetsMinimum: true,
        }) satisfies ComponentResult,
    );

    return emptyResult(notes, components);
  }

  if (!declaredWeight.equals(ONE)) {
    notes.push({
      kind: "WEIGHTS_RENORMALISED",
      from: declaredWeight.toString(),
      to: ONE.toString(),
    });
  }

  let allMinimumsMet = true;

  const components: ComponentResult[] = raw.map((item) => {
    const effectiveWeight =
      item.average === null
        ? ZERO
        : toDecimal(item.component.weight).dividedBy(declaredWeight);

    const rounded = item.average === null ? null : round(item.average);

    const minimum = item.component.minGrade;
    const meetsMinimum =
      minimum === null || rounded === null
        ? true
        : rounded.greaterThanOrEqualTo(toDecimal(minimum));

    if (!meetsMinimum) {
      allMinimumsMet = false;
      notes.push({ kind: "BELOW_COMPONENT_MINIMUM", componentCode: item.component.code });
    }

    return {
      componentCode: item.component.code,
      average: rounded,
      effectiveWeight,
      countedEntries: item.counted,
      meetsMinimum,
    };
  });

  // --- Média das componentes -------------------------------------------------
  const weightedAverage = raw.reduce<Decimal>((acc, item) => {
    if (item.average === null) return acc;

    const weight = toDecimal(item.component.weight).dividedBy(declaredWeight);
    return acc.plus(item.average.times(weight));
  }, ZERO);

  const average = round(weightedAverage);

  // --- Exame -----------------------------------------------------------------
  if (!scheme.hasExam) {
    return {
      components,
      average,
      examScore: null,
      finalScore: average,
      isExempt: false,
      isAdmittedToExam: false,
      passed: allMinimumsMet && average.greaterThanOrEqualTo(passMark),
      notes,
    };
  }

  const isExempt =
    scheme.exemptionGrade !== null &&
    average.greaterThanOrEqualTo(toDecimal(scheme.exemptionGrade));

  if (isExempt) {
    notes.push({ kind: "EXEMPT_FROM_EXAM" });

    return {
      components,
      average,
      examScore: null,
      finalScore: average,
      isExempt: true,
      isAdmittedToExam: true,
      passed: allMinimumsMet && average.greaterThanOrEqualTo(passMark),
      notes,
    };
  }

  const isAdmittedToExam =
    scheme.minGradeForExam === null ||
    average.greaterThanOrEqualTo(toDecimal(scheme.minGradeForExam));

  if (!isAdmittedToExam) {
    notes.push({ kind: "NOT_ADMITTED_TO_EXAM" });

    return {
      components,
      average,
      examScore: null,
      finalScore: average,
      isExempt: false,
      isAdmittedToExam: false,
      passed: false,
      notes,
    };
  }

  // Admitido mas ainda sem nota de exame: o resultado está pendente, não reprovado.
  if (examScore === null) {
    return {
      components,
      average,
      examScore: null,
      finalScore: null,
      isExempt: false,
      isAdmittedToExam: true,
      passed: null,
      notes,
    };
  }

  const exam = round(toDecimal(examScore));
  const examWeight = toDecimal(scheme.examWeight);
  const finalScore = round(
    average.times(ONE.minus(examWeight)).plus(exam.times(examWeight)),
  );

  const meetsExamMinimum =
    scheme.minExamGrade === null ||
    exam.greaterThanOrEqualTo(toDecimal(scheme.minExamGrade));

  if (!meetsExamMinimum) {
    notes.push({ kind: "BELOW_EXAM_MINIMUM" });
  }

  return {
    components,
    average,
    examScore: exam,
    finalScore,
    isExempt: false,
    isAdmittedToExam: true,
    passed:
      allMinimumsMet && meetsExamMinimum && finalScore.greaterThanOrEqualTo(passMark),
    notes,
  };
}

/** Identifica o âmbito de um esquema candidato — o que `resolveApplicableScheme` compara. */
export interface SchemeScope {
  readonly gradeLevelId: string | null;
  readonly subjectId: string | null;
}

/**
 * Resolve qual esquema se aplica a uma classe e disciplina concretas, do mais específico
 * para o mais geral: (classe + disciplina) → (só disciplina) → (só classe) → nenhum dos
 * dois (esquema base do ano). Requisito já escrito na capability `assessment-schemes`
 * ("Esquema geral do ano vs. esquema específico") mas nunca antes implementado — este é o
 * primeiro consumidor real. Pura e genérica: quem chama passa os seus próprios candidatos
 * (normalmente linhas de `AssessmentScheme` já filtradas por `getTenantDb` e pelo ano
 * lectivo activo), sem este módulo saber nada de Prisma.
 */
export function resolveApplicableScheme<T extends SchemeScope>(
  schemes: readonly T[],
  target: { readonly gradeLevelId: string; readonly subjectId: string },
): T | null {
  const bothMatch = schemes.find(
    (s) => s.gradeLevelId === target.gradeLevelId && s.subjectId === target.subjectId,
  );
  if (bothMatch) return bothMatch;

  const subjectMatch = schemes.find((s) => s.gradeLevelId === null && s.subjectId === target.subjectId);
  if (subjectMatch) return subjectMatch;

  const gradeLevelMatch = schemes.find((s) => s.gradeLevelId === target.gradeLevelId && s.subjectId === null);
  if (gradeLevelMatch) return gradeLevelMatch;

  const base = schemes.find((s) => s.gradeLevelId === null && s.subjectId === null);
  return base ?? null;
}

/** Esquema mínimo utilizável, para testes e para o arranque de uma escola nova. */
export function baseScheme(
  overrides: Partial<AssessmentSchemeDefinition> = {},
): AssessmentSchemeDefinition {
  return {
    id: "scheme-base",
    version: 1,
    name: "Esquema base",
    regime: AssessmentRegime.WITH_ASSESSMENT,
    scaleMin: new Decimal(0),
    scaleMax: new Decimal(20),
    passMark: new Decimal(10),
    roundingMode: RoundingMode.HALF_UP,
    decimalPlaces: 2,
    components: [],
    hasExam: false,
    examWeight: ZERO,
    minGradeForExam: null,
    exemptionGrade: null,
    minExamGrade: null,
    ...overrides,
  };
}
