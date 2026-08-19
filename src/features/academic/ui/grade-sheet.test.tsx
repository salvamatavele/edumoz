import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { recordGrades } from "@/features/academic/actions/record-grades";
import { renderWithIntl } from "@/test/intl";

import { GradeSheet, type SerializedScheme } from "./grade-sheet";

vi.mock("@/features/academic/actions/record-grades", () => ({
  recordGrades: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockRecordGrades = vi.mocked(recordGrades);

const scheme: SerializedScheme = {
  id: "scheme-1",
  version: 1,
  name: "Esquema base",
  regime: "WITH_ASSESSMENT",
  scaleMin: "0",
  scaleMax: "20",
  passMark: "10",
  roundingMode: "HALF_UP",
  decimalPlaces: 2,
  hasExam: false,
  examWeight: "0",
  minGradeForExam: null,
  exemptionGrade: null,
  minExamGrade: null,
  components: [
    { code: "AC", name: "Avaliação Contínua", type: "CONTINUOUS", weight: "0.4", minGrade: null, order: 1 },
    { code: "AT", name: "Avaliação Trimestral", type: "TEST", weight: "0.6", minGrade: null, order: 2 },
  ],
};

const assessment = { id: "assessment-1", name: "Teste 1", componentCode: "AT", maxScore: "20", weight: "1" };

const entries = [
  {
    enrollmentId: "e1",
    studentName: "Ana Matsinhe",
    score: null,
    isAbsent: false,
    otherEntries: [{ componentCode: "AC", score: "16", maxScore: "20", weight: "1", isAbsent: false }],
  },
  {
    enrollmentId: "e2",
    studentName: "Bruno Zandamela",
    score: null,
    isAbsent: false,
    otherEntries: [],
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof GradeSheet>> = {}) {
  return renderWithIntl(
    <GradeSheet
      assessment={assessment}
      teachingGroupName="10A"
      subjectName="Matemática"
      scheme={scheme}
      initialEntries={entries}
      {...overrides}
    />,
  );
}

describe("GradeSheet", () => {
  function averageFor(studentName: string): string {
    const row = screen.getByText(studentName).closest("li") as HTMLElement;
    return within(row).getByText(/^Média:/).textContent ?? "";
  }

  it("mostra os alunos e a média inicial calculada só com as outras notas", () => {
    setup();

    expect(screen.getByText("Ana Matsinhe")).toBeInTheDocument();
    // Ana só tem AC=16 lançado; sem AT ainda, a média renormaliza para 16.
    expect(averageFor("Ana Matsinhe")).toBe("Média: 16");
  });

  it("escrever uma nota actualiza a média ao vivo sem chamar o servidor", async () => {
    setup();

    const input = screen.getByLabelText("Nota de Ana Matsinhe");
    await userEvent.type(input, "10");

    expect(averageFor("Ana Matsinhe")).toBe("Média: 12.4");
    expect(mockRecordGrades).not.toHaveBeenCalled();
  });

  it("marcar falta desactiva o campo de nota", async () => {
    setup();

    const checkbox = screen.getAllByLabelText("Faltou")[1];
    await userEvent.click(checkbox);

    expect(screen.getByLabelText("Nota de Bruno Zandamela")).toBeDisabled();
  });

  it("submeter só envia as linhas alteradas", async () => {
    mockRecordGrades.mockResolvedValue({ status: "success" });
    setup();

    const input = screen.getByLabelText("Nota de Ana Matsinhe");
    await userEvent.type(input, "10");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockRecordGrades).toHaveBeenCalledWith({
        assessmentId: "assessment-1",
        changes: [{ enrollmentId: "e1", score: 10, isAbsent: false }],
      });
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("mostra o erro do servidor sem actualizar a página", async () => {
    mockRecordGrades.mockResolvedValue({ status: "error", message: "Falhou" });
    refresh.mockClear();
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falhou");
    expect(refresh).not.toHaveBeenCalled();
  });
});
