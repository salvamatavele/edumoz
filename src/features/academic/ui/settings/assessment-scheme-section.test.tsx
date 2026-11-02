import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { AssessmentSchemeSection } from "./assessment-scheme-section";
vi.mock("@/features/academic/actions/create-assessment-scheme", () => ({ createAssessmentScheme: vi.fn() }));

async function openForm() {
  renderWithIntl(<AssessmentSchemeSection rows={[]} academicYear="2026" options={{ gradeLevels: [], subjects: [], hasActiveAcademicYear: true }} />);
  await userEvent.click(screen.getByRole("button", { name: "Novo esquema" }));
}
describe("reactive assessment scheme fields", () => {
  it("reveals and hides exam settings when the checkbox changes", async () => {
    await openForm();
    expect(screen.queryByLabelText("Peso do exame")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Tem exame" }));
    expect(screen.getByLabelText("Peso do exame")).toBeVisible();
    await userEvent.click(screen.getByRole("checkbox", { name: "Tem exame" }));
    expect(screen.queryByLabelText("Peso do exame")).not.toBeInTheDocument();
  });
  it("updates component types independently after adding a second component", async () => {
    await openForm();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar componente" }));
    const types = screen.getAllByRole("combobox", { name: "Tipo" });
    expect(types).toHaveLength(2);
    await userEvent.click(types[1]);
    await userEvent.click(screen.getByRole("option", { name: "Oral" }));
    expect(types[1]).toHaveTextContent("Oral");
    expect(types[0]).not.toHaveTextContent("Oral");
  });
});
