import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { enrollStudent } from "@/features/academic/actions/enroll-student";
import type { EnrollmentOptions } from "@/features/academic/data/enrollments";
import { renderWithIntl } from "@/test/intl";

import { EnrollStudentButton } from "./enroll-student-button";

vi.mock("@/features/academic/actions/enroll-student", () => ({
  enrollStudent: vi.fn(),
}));

const mockEnrollStudent = vi.mocked(enrollStudent);

const options: EnrollmentOptions = {
  academicYearId: "year-1",
  suggestedNumber: "2026/013",
  classGroups: [
    { id: "class-10a", name: "10A" },
    { id: "class-10b", name: "10B" },
  ],
  studyPaths: [
    { id: "path-ciencias", name: "10ª — Ciências" },
    { id: "path-letras", name: "10ª — Letras" },
  ],
};

describe("EnrollStudentButton", () => {
  it("mostra o gatilho e o nome do aluno no título do modal", async () => {
    renderWithIntl(
      <EnrollStudentButton studentId="student-1" studentName="Ana Matsinhe" options={options} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));

    expect(
      screen.getByRole("dialog", { name: "Matricular Ana Matsinhe" }),
    ).toBeInTheDocument();
  });

  it("apresenta só as turmas e percursos recebidos, e pré-preenche o número sugerido", async () => {
    renderWithIntl(
      <EnrollStudentButton studentId="student-1" studentName="Ana Matsinhe" options={options} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));

    expect(screen.getByLabelText(/Número de matrícula/)).toHaveValue("2026/013");

    await userEvent.click(screen.getByRole("combobox", { name: /Turma/ }));
    expect(await screen.findByRole("option", { name: "10A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10B" })).toBeInTheDocument();
  });

  it("submete studentId, turma, percurso e número escolhidos", async () => {
    mockEnrollStudent.mockResolvedValue({ status: "success" });

    renderWithIntl(
      <EnrollStudentButton studentId="student-1" studentName="Ana Matsinhe" options={options} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));

    await userEvent.click(screen.getByRole("combobox", { name: /Turma/ }));
    await userEvent.click(await screen.findByRole("option", { name: "10A" }));

    await userEvent.click(screen.getByRole("combobox", { name: /Percurso/ }));
    await userEvent.click(await screen.findByRole("option", { name: "10ª — Ciências" }));

    await userEvent.click(
      screen.getByRole("dialog").querySelector("button[type=submit]") as HTMLElement,
    );

    await waitFor(() =>
      expect(mockEnrollStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "student-1",
          classGroupId: "class-10a",
          studyPathId: "path-ciencias",
          number: "2026/013",
        }),
      ),
    );
  });

  it("mapeia um número de matrícula repetido ao campo", async () => {
    mockEnrollStudent.mockResolvedValue({
      status: "error",
      fieldErrors: { number: "Já existe uma matrícula com este número neste ano lectivo" },
    });

    renderWithIntl(
      <EnrollStudentButton studentId="student-1" studentName="Ana Matsinhe" options={options} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Matricular" }));
    await userEvent.click(screen.getByRole("combobox", { name: /Turma/ }));
    await userEvent.click(await screen.findByRole("option", { name: "10A" }));
    await userEvent.click(screen.getByRole("combobox", { name: /Percurso/ }));
    await userEvent.click(await screen.findByRole("option", { name: "10ª — Ciências" }));
    await userEvent.click(
      screen.getByRole("dialog").querySelector("button[type=submit]") as HTMLElement,
    );

    expect(
      await screen.findByText("Já existe uma matrícula com este número neste ano lectivo"),
    ).toBeInTheDocument();
  });
});
