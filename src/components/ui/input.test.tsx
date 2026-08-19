import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/intl";

import { Input } from "./input";

describe("Input", () => {
  it("associates the visible label with the field", () => {
    renderWithIntl(<Input label="Nome completo do aluno" />);

    expect(
      screen.getByLabelText("Nome completo do aluno"),
    ).toBeInTheDocument();
  });

  it("exposes helper text through aria-describedby", () => {
    renderWithIntl(
      <Input
        label="Número de matrícula"
        helperText="Como consta no assento de nascimento."
      />,
    );

    const field = screen.getByLabelText("Número de matrícula");
    const helper = screen.getByText("Como consta no assento de nascimento.");

    expect(field).toHaveAttribute("aria-describedby", helper.id);
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("replaces the helper text with an announced error", () => {
    renderWithIntl(
      <Input
        label="Número de matrícula"
        helperText="Como consta no assento de nascimento."
        error="Já existe um aluno com este número."
      />,
    );

    const field = screen.getByLabelText("Número de matrícula");
    const error = screen.getByRole("alert");

    expect(error).toHaveTextContent("Já existe um aluno com este número.");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", error.id);
    expect(
      screen.queryByText("Como consta no assento de nascimento."),
    ).not.toBeInTheDocument();
  });

  it("marks required fields for both sighted and screen reader users", () => {
    renderWithIntl(<Input label="Nome completo do aluno" required />);

    expect(screen.getByLabelText(/obrigatório/)).toBeRequired();
  });

  it("esconde a palavra-passe por omissão e revela-a ao clicar", async () => {
    renderWithIntl(<Input label="Palavra-passe" type="password" />);

    const field = screen.getByLabelText("Palavra-passe");
    expect(field).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar palavra-passe" }));
    expect(field).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Esconder palavra-passe" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("não mostra o botão de revelar num campo que não é de palavra-passe", () => {
    renderWithIntl(<Input label="Nome" type="text" />);

    expect(
      screen.queryByRole("button", { name: /palavra-passe/ }),
    ).not.toBeInTheDocument();
  });
});
