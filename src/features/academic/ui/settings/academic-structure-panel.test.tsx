import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createGradeLevel } from "@/features/academic/actions/create-grade-level";
import type { AcademicStructureOptions } from "@/features/academic/data/academic-structure";
import { renderWithIntl } from "@/test/intl";

import { AcademicStructurePanel } from "./academic-structure-panel";

vi.mock("@/features/academic/actions/create-grade-level", () => ({
  createGradeLevel: vi.fn(),
}));
vi.mock("@/features/academic/actions/create-section", () => ({ createSection: vi.fn() }));
vi.mock("@/features/academic/actions/create-study-path", () => ({ createStudyPath: vi.fn() }));
vi.mock("@/features/academic/actions/create-subject", () => ({ createSubject: vi.fn() }));
vi.mock("@/features/academic/actions/create-curriculum-subject", () => ({
  createCurriculumSubject: vi.fn(),
}));
vi.mock("@/features/academic/actions/create-class-group", () => ({ createClassGroup: vi.fn() }));
vi.mock("@/features/academic/actions/create-room", () => ({ createRoom: vi.fn() }));
vi.mock("@/features/academic/actions/create-time-slot", () => ({ createTimeSlot: vi.fn() }));

const mockCreateGradeLevel = vi.mocked(createGradeLevel);

const emptyOptions: AcademicStructureOptions = {
  gradeLevels: [],
  sections: [],
  studyPaths: [],
  subjects: [],
  teachers: [],
  hasActiveAcademicYear: false,
};

function renderPanel() {
  renderWithIntl(
    <AcademicStructurePanel
      gradeLevels={[]}
      sections={[]}
      studyPaths={{ rows: [], academicYear: null }}
      subjects={[]}
      curriculumSubjects={{ rows: [], academicYear: null }}
      classGroups={{ rows: [], academicYear: null }}
      rooms={[]}
      timeSlots={{ rows: [], academicYear: null }}
      options={emptyOptions}
    />,
  );
}

describe("AcademicStructurePanel — Classes", () => {
  it("abre o modal ao clicar em Adicionar classe", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Adicionar classe" }));

    expect(screen.getByRole("dialog", { name: "Nova classe" })).toBeInTheDocument();
  });

  it("submete código, nome, ordem, ciclo e exame nacional preenchidos", async () => {
    mockCreateGradeLevel.mockResolvedValue({ status: "success" });
    // Mais interacções do que `enroll-student-button.test.tsx` (dois campos de texto, um
    // número, um `Select` e um `Checkbox`) — sob a suite completa, com muitos ficheiros a
    // falar com a base de dados em paralelo, o tempo por omissão do Vitest fica apertado.

    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar classe" }));

    await userEvent.type(screen.getByLabelText(/Código/), "10C");
    await userEvent.type(screen.getByLabelText(/^Nome/), "10ª classe");
    await userEvent.clear(screen.getByLabelText(/Ordem/));
    await userEvent.type(screen.getByLabelText(/Ordem/), "10");

    await userEvent.click(screen.getByRole("combobox", { name: /Ciclo de ensino/ }));
    await userEvent.click(await screen.findByRole("option", { name: "1º ciclo do secundário" }));

    await userEvent.click(screen.getByRole("checkbox", { name: "Classe com exame nacional" }));

    await userEvent.click(screen.getByRole("dialog").querySelector("button[type=submit]") as HTMLElement);

    await waitFor(() =>
      expect(mockCreateGradeLevel).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "10C",
          name: "10ª classe",
          order: 10,
          cycle: "SECONDARY_FIRST_CYCLE",
          isExamLevel: true,
        }),
      ),
    );
  }, 20000);

  it("mapeia um código repetido ao campo", async () => {
    mockCreateGradeLevel.mockResolvedValue({
      status: "error",
      fieldErrors: { code: "Já existe uma classe com este código" },
    });

    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar classe" }));

    await userEvent.type(screen.getByLabelText(/Código/), "10C");
    await userEvent.type(screen.getByLabelText(/^Nome/), "10ª classe");
    await userEvent.click(screen.getByRole("combobox", { name: /Ciclo de ensino/ }));
    await userEvent.click(await screen.findByRole("option", { name: "1º ciclo do secundário" }));

    await userEvent.click(screen.getByRole("dialog").querySelector("button[type=submit]") as HTMLElement);

    expect(await screen.findByText("Já existe uma classe com este código")).toBeInTheDocument();
  });
});
