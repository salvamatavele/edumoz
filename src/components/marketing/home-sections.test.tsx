import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/intl";

import { HomeSections } from "./home-sections";

describe("HomeSections em português", () => {
  it("apresenta um único título de primeiro nível", () => {
    renderWithIntl(<HomeSections />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "A secretaria, a sala de aula e a tesouraria no mesmo sítio",
    );
  });

  it("segue a ordem de secções do padrão Operations Landing", () => {
    renderWithIntl(<HomeSections />);

    const sections = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(sections).toEqual([
      "O que a direcção vê logo pela manhã",
      "Como funciona",
      "Quer ver o EduMoz com os dados da sua escola?",
    ]);
  });

  it("repete a chamada para acção no topo e no fim", () => {
    renderWithIntl(<HomeSections />);

    expect(
      screen.getAllByRole("button", { name: "Pedir demonstração" }),
    ).toHaveLength(2);
  });

  it("acompanha cada cor de estado com uma etiqueta de texto", () => {
    renderWithIntl(<HomeSections />);

    for (const label of ["Presente", "Atrasado", "Falta"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe("HomeSections em inglês", () => {
  it("traduz o título e a chamada para acção", () => {
    renderWithIntl(<HomeSections />, "en");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "The front office, the classroom and the treasury in one place",
    );
    expect(
      screen.getAllByRole("button", { name: "Request a demo" }),
    ).toHaveLength(2);
  });

  it("traduz os estados de presença", () => {
    renderWithIntl(<HomeSections />, "en");

    for (const label of ["Present", "Late", "Absent"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("não deixa texto português por traduzir na versão inglesa", () => {
    const { container } = renderWithIntl(<HomeSections />, "en");

    // Os nomes dos alunos da pré-visualização são propositadamente moçambicanos e ficam.
    // O que não pode ficar é interface: se uma chave faltar, o fallback marca-a com ⟦⟧.
    expect(container.textContent).not.toContain("⟦");
    expect(container.textContent).not.toContain("Pedir demonstração");
    expect(container.textContent).not.toContain("Como funciona");
  });
});
