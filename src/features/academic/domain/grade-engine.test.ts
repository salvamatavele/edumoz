import { describe, expect, it } from "vitest";

import { AssessmentRegime, ComponentType, RoundingMode } from "@/types";

import { Decimal } from "@/features/shared/domain/numeric";

import type { AssessmentComponentDefinition, GradeEntry } from "./assessment";
import { baseScheme, computeSubjectResult, validateScheme } from "./grade-engine";

const d = (value: string) => new Decimal(value);

/** Os dois componentes do pedido: Média = (AC × 0.40) + (AT × 0.60). */
const AC: AssessmentComponentDefinition = {
  code: "AC",
  name: "Avaliação Contínua",
  type: ComponentType.CONTINUOUS,
  weight: d("0.40"),
  minGrade: null,
  order: 1,
};

const AT: AssessmentComponentDefinition = {
  code: "AT",
  name: "Avaliação Trimestral",
  type: ComponentType.TEST,
  weight: d("0.60"),
  minGrade: null,
  order: 2,
};

const standard = baseScheme({ components: [AC, AT] });

function grade(componentCode: string, score: string | null, weight = "1"): GradeEntry {
  return {
    componentCode,
    score,
    maxScore: "20",
    weight,
    isAbsent: score === null,
  };
}

describe("validateScheme", () => {
  it("aceita o esquema do pedido", () => {
    expect(validateScheme(standard)).toEqual([]);
  });

  it("rejeita pesos que não somam 1", () => {
    const scheme = baseScheme({
      components: [AC, { ...AT, weight: d("0.50") }],
    });

    expect(validateScheme(scheme)).toContainEqual({
      kind: "WEIGHTS_DO_NOT_SUM_TO_ONE",
      actual: "0.9",
    });
  });

  it("aceita 0.4 + 0.6 exactamente — em vírgula flutuante isto falharia", () => {
    // 0.1 + 0.2 !== 0.3 em binário. É por isto que os pesos são Decimal e a comparação
    // é feita em Decimal, e não com uma tolerância arbitrária.
    const scheme = baseScheme({
      components: [
        { ...AC, weight: d("0.1") },
        { ...AT, weight: d("0.2") },
        { ...AC, code: "X", weight: d("0.7") },
      ],
    });

    expect(validateScheme(scheme)).toEqual([]);
  });

  it("rejeita códigos de componente repetidos", () => {
    const scheme = baseScheme({
      components: [AC, { ...AT, code: "AC", weight: d("0.60") }],
    });

    expect(validateScheme(scheme)).toContainEqual({
      kind: "DUPLICATE_COMPONENT_CODE",
      code: "AC",
    });
  });

  it("rejeita um esquema com avaliação e sem componentes", () => {
    expect(validateScheme(baseScheme())).toContainEqual({ kind: "NO_COMPONENTS" });
  });

  it("aceita ausência de componentes quando o regime é sem avaliação", () => {
    const scheme = baseScheme({ regime: AssessmentRegime.WITHOUT_ASSESSMENT });
    expect(validateScheme(scheme)).toEqual([]);
  });

  it("rejeita nota de passagem fora da escala", () => {
    const scheme = baseScheme({ components: [AC, AT], passMark: d("25") });

    expect(validateScheme(scheme)).toContainEqual(
      expect.objectContaining({ kind: "INVALID_SCALE" }),
    );
  });

  it("rejeita peso de exame sem exame", () => {
    const scheme = baseScheme({ components: [AC, AT], examWeight: d("0.3") });

    expect(validateScheme(scheme)).toContainEqual({ kind: "EXAM_WEIGHT_WITHOUT_EXAM" });
  });

  it("rejeita limiares fora da escala", () => {
    const scheme = baseScheme({
      components: [AC, AT],
      hasExam: true,
      examWeight: d("0.3"),
      exemptionGrade: d("21"),
    });

    expect(validateScheme(scheme)).toContainEqual({
      kind: "THRESHOLD_OUT_OF_SCALE",
      field: "exemptionGrade",
    });
  });

  it("acumula todos os erros em vez de parar no primeiro", () => {
    const scheme = baseScheme({
      components: [{ ...AC, weight: d("0.9") }],
      passMark: d("99"),
      examWeight: d("0.5"),
    });

    expect(validateScheme(scheme).length).toBeGreaterThan(2);
  });
});

describe("computeSubjectResult — a fórmula do pedido", () => {
  it("calcula (AC × 0.40) + (AT × 0.60) como à mão", () => {
    // AC = 15, AT = 12  →  15 × 0.4 + 12 × 0.6 = 6 + 7.2 = 13.20
    const result = computeSubjectResult(standard, [grade("AC", "15"), grade("AT", "12")]);

    expect(result.average?.toString()).toBe("13.2");
    expect(result.finalScore?.toString()).toBe("13.2");
    expect(result.passed).toBe(true);
  });

  it("muda de resultado ao mudar os pesos, sem uma linha de código mudar", () => {
    // Os mesmos 15 e 12, com 0.6/0.4  →  15 × 0.6 + 12 × 0.4 = 9 + 4.8 = 13.80
    const inverted = baseScheme({
      components: [
        { ...AC, weight: d("0.60") },
        { ...AT, weight: d("0.40") },
      ],
    });

    const result = computeSubjectResult(inverted, [grade("AC", "15"), grade("AT", "12")]);

    expect(result.average?.toString()).toBe("13.8");
  });

  it("faz a média ponderada dentro do componente", () => {
    // AC: dois testes, pesos 1 e 3  →  (10×1 + 14×3) / 4 = 13
    // AT: 12  →  13 × 0.4 + 12 × 0.6 = 5.2 + 7.2 = 12.40
    const result = computeSubjectResult(standard, [
      grade("AC", "10", "1"),
      grade("AC", "14", "3"),
      grade("AT", "12"),
    ]);

    expect(result.components.find((c) => c.componentCode === "AC")?.average?.toString()).toBe(
      "13",
    );
    expect(result.average?.toString()).toBe("12.4");
  });

  it("normaliza uma avaliação noutra escala", () => {
    // Um teste sobre 100 com 80 vale 16 numa escala de 0–20.
    const result = computeSubjectResult(standard, [
      { componentCode: "AC", score: "80", maxScore: "100", weight: "1", isAbsent: false },
      grade("AT", "16"),
    ]);

    expect(result.components[0]?.average?.toString()).toBe("16");
    expect(result.average?.toString()).toBe("16");
  });

  it("conta a falta com nota atribuída, e ignora a falta sem nota", () => {
    const comZero = computeSubjectResult(standard, [
      { componentCode: "AC", score: "0", maxScore: "20", weight: "1", isAbsent: true },
      grade("AT", "10"),
    ]);
    expect(comZero.average?.toString()).toBe("6");

    const semNota = computeSubjectResult(standard, [grade("AC", null), grade("AT", "10")]);
    expect(semNota.average?.toString()).toBe("10");
  });
});

describe("computeSubjectResult — componentes sem notas", () => {
  it("renormaliza os pesos e regista o facto", () => {
    // Só há AT (peso 0.6). O peso é redistribuído: AT passa a valer 1, e a média é 12.
    // Sem renormalização daria 12 × 0.6 = 7.2, que reprovava um aluno sem razão.
    const result = computeSubjectResult(standard, [grade("AT", "12")]);

    expect(result.average?.toString()).toBe("12");
    expect(result.notes).toContainEqual({
      kind: "COMPONENT_WITHOUT_GRADES",
      componentCode: "AC",
    });
    expect(result.notes).toContainEqual({
      kind: "WEIGHTS_RENORMALISED",
      from: "0.6",
      to: "1",
    });
    expect(result.components.find((c) => c.componentCode === "AT")?.effectiveWeight.toString()).toBe(
      "1",
    );
  });

  it("devolve tudo nulo, e não zero, quando não há nota nenhuma", () => {
    const result = computeSubjectResult(standard, []);

    expect(result.average).toBeNull();
    expect(result.finalScore).toBeNull();
    expect(result.passed).toBeNull();
    expect(result.notes).toContainEqual({ kind: "NO_GRADES_AT_ALL" });
  });

  it("regime sem avaliação não produz números", () => {
    const scheme = baseScheme({
      regime: AssessmentRegime.WITHOUT_ASSESSMENT,
      components: [AC, AT],
    });

    const result = computeSubjectResult(scheme, [grade("AC", "15")]);

    expect(result.average).toBeNull();
    expect(result.passed).toBeNull();
  });
});

describe("computeSubjectResult — arredondamento", () => {
  it.each([
    [RoundingMode.HALF_UP, "13.46"],
    [RoundingMode.FLOOR, "13.45"],
    [RoundingMode.NONE, "13.456"],
  ])("%s dá %s", (roundingMode, expected) => {
    // AC = 13.2, AT = 13.626…  escolhidos para a média cair em 13.456
    const scheme = baseScheme({ components: [AC, AT], roundingMode });
    const result = computeSubjectResult(scheme, [
      grade("AC", "13.2"),
      grade("AT", "13.6266666666666666666666666667"),
    ]);

    expect(result.average?.toString().startsWith(expected)).toBe(true);
  });
});

describe("computeSubjectResult — mínimo por componente", () => {
  it("reprova com média positiva mas componente abaixo do mínimo", () => {
    const scheme = baseScheme({
      components: [{ ...AC, minGrade: d("8") }, AT],
    });

    // AC = 5 (abaixo do mínimo 8), AT = 18  →  média 12.8, positiva
    const result = computeSubjectResult(scheme, [grade("AC", "5"), grade("AT", "18")]);

    expect(result.average?.toString()).toBe("12.8");
    expect(result.passed).toBe(false);
    expect(result.notes).toContainEqual({
      kind: "BELOW_COMPONENT_MINIMUM",
      componentCode: "AC",
    });
  });
});

describe("computeSubjectResult — exame", () => {
  const withExam = baseScheme({
    components: [AC, AT],
    hasExam: true,
    examWeight: d("0.30"),
    minGradeForExam: d("7"),
    exemptionGrade: d("16"),
    minExamGrade: d("8"),
  });

  it("dispensa quem está acima da nota de dispensa", () => {
    const result = computeSubjectResult(withExam, [grade("AC", "17"), grade("AT", "17")]);

    expect(result.isExempt).toBe(true);
    expect(result.finalScore?.toString()).toBe("17");
    expect(result.passed).toBe(true);
    expect(result.notes).toContainEqual({ kind: "EXEMPT_FROM_EXAM" });
  });

  it("não admite a exame quem está abaixo da nota de frequência", () => {
    const result = computeSubjectResult(withExam, [grade("AC", "5"), grade("AT", "6")]);

    expect(result.isAdmittedToExam).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.notes).toContainEqual({ kind: "NOT_ADMITTED_TO_EXAM" });
  });

  it("fica pendente, e não reprovado, enquanto não houver nota de exame", () => {
    const result = computeSubjectResult(withExam, [grade("AC", "12"), grade("AT", "12")]);

    expect(result.isAdmittedToExam).toBe(true);
    expect(result.finalScore).toBeNull();
    expect(result.passed).toBeNull();
  });

  it("pesa o exame FORA da média das componentes", () => {
    // média 12, exame 16  →  12 × 0.7 + 16 × 0.3 = 8.4 + 4.8 = 13.20
    const result = computeSubjectResult(
      withExam,
      [grade("AC", "12"), grade("AT", "12")],
      "16",
    );

    expect(result.average?.toString()).toBe("12");
    expect(result.examScore?.toString()).toBe("16");
    expect(result.finalScore?.toString()).toBe("13.2");
    expect(result.passed).toBe(true);
  });

  it("reprova quem fica abaixo da nota mínima de exame, mesmo com final positiva", () => {
    // média 14, exame 6  →  14 × 0.7 + 6 × 0.3 = 9.8 + 1.8 = 11.60, positiva
    const result = computeSubjectResult(
      withExam,
      [grade("AC", "14"), grade("AT", "14")],
      "6",
    );

    expect(result.finalScore?.toString()).toBe("11.6");
    expect(result.passed).toBe(false);
    expect(result.notes).toContainEqual({ kind: "BELOW_EXAM_MINIMUM" });
  });

  it("ignora as regras de exame quando ficam nulas — o caso POR CONFIRMAR", () => {
    const semRegras = baseScheme({
      components: [AC, AT],
      hasExam: true,
      examWeight: d("0.30"),
    });

    const result = computeSubjectResult(semRegras, [grade("AC", "5"), grade("AT", "5")], "5");

    expect(result.isExempt).toBe(false);
    expect(result.isAdmittedToExam).toBe(true);
    expect(result.finalScore?.toString()).toBe("5");
    expect(result.passed).toBe(false);
  });
});
