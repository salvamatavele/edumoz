import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/intl";

import { DataTable, type DataTableColumn } from "./data-table";

type Student = { id: string; name: string; path: string; average: number };

const STUDENTS: Student[] = [
  { id: "1", name: "Ana Matsinhe", path: "Ciências", average: 15.2 },
  { id: "2", name: "Bruno Zandamela", path: "Ciências", average: 11.8 },
  { id: "3", name: "Délio Mabjaia", path: "Letras", average: 13.4 },
  { id: "4", name: "Elsa Chirindza", path: "Letras", average: 9.6 },
];

const columns: DataTableColumn<Student>[] = [
  { accessorKey: "name", header: "Nome", meta: { label: "Nome" } },
  { accessorKey: "path", header: "Percurso", meta: { label: "Percurso" } },
  { accessorKey: "average", header: "Média", meta: { label: "Média" } },
];

function setup(props: Partial<React.ComponentProps<typeof DataTable<Student>>> = {}) {
  return renderWithIntl(
    <DataTable
      label="Alunos"
      columns={columns}
      data={STUDENTS}
      getRowId={(row) => row.id}
      {...props}
    />,
  );
}

/** A tabela e a lista de cartões coexistem no DOM; o CSS decide qual se vê. */
function table() {
  return screen.getByRole("table", { name: "Alunos" });
}

describe("DataTable", () => {
  it("apresenta uma linha por registo, com cabeçalhos", () => {
    setup();

    expect(within(table()).getAllByRole("row")).toHaveLength(STUDENTS.length + 1);
    expect(within(table()).getByRole("columnheader", { name: /Nome/ })).toBeInTheDocument();
    expect(within(table()).getByText("Ana Matsinhe")).toBeInTheDocument();
  });

  it("exige um rótulo acessível para a tabela", () => {
    setup();
    expect(screen.getByRole("table", { name: "Alunos" })).toBeInTheDocument();
  });

  it("filtra pela pesquisa e anuncia quando nada corresponde", async () => {
    setup();

    const search = screen.getByRole("searchbox", { name: "Procurar" });
    await userEvent.type(search, "Letras");

    expect(within(table()).getByText("Délio Mabjaia")).toBeInTheDocument();
    expect(within(table()).queryByText("Ana Matsinhe")).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "Zimbábué");

    expect(screen.getAllByText(/Nenhum resultado para/).length).toBeGreaterThan(0);
  });

  it("distingue «sem registos» de «nada corresponde à pesquisa»", async () => {
    setup({ data: [] });

    // Sem dados: a mensagem convida a criar, não a corrigir a pesquisa.
    expect(screen.getAllByText("Sem registos").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nenhum resultado para/)).not.toBeInTheDocument();
  });

  it("ordena ao clicar no cabeçalho e expõe aria-sort", async () => {
    setup();

    const header = within(table()).getByRole("columnheader", { name: /Média/ });
    expect(header).toHaveAttribute("aria-sort", "none");

    await userEvent.click(within(header).getByRole("button"));

    expect(header).toHaveAttribute("aria-sort", "ascending");
    const firstRow = within(table()).getAllByRole("row")[1];
    expect(within(firstRow).getByText("9.6")).toBeInTheDocument();
  });

  it("selecciona linhas e conta-as com plural correcto", async () => {
    setup({ enableSelection: true });

    expect(screen.getByText("Nenhuma linha seleccionada")).toBeInTheDocument();

    const [firstRowCheckbox] = screen.getAllByRole("checkbox", { name: "Seleccionar linha" });
    await userEvent.click(firstRowCheckbox);

    expect(screen.getByText("1 linha seleccionada")).toBeInTheDocument();

    const [secondRowCheckbox] = screen
      .getAllByRole("checkbox", { name: "Seleccionar linha" })
      .slice(1);
    await userEvent.click(secondRowCheckbox);

    expect(screen.getByText("2 linhas seleccionadas")).toBeInTheDocument();
  });

  it("mostra o estado de carregamento e marca a tabela como ocupada", () => {
    setup({ isLoading: true });

    expect(table()).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText("A carregar…").length).toBeGreaterThan(0);
  });

  it("mostra o erro como alerta e permite tentar de novo", async () => {
    const onRetry = vi.fn();
    setup({ error: "Ligação perdida", onRetry });

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Não foi possível carregar os dados")).toBeInTheDocument();
    expect(within(alert).getByText("Ligação perdida")).toBeInTheDocument();

    // Em erro, a tabela não é mostrada: dados parciais seriam pior do que nenhuns.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("pagina quando há mais linhas do que cabem", async () => {
    setup({ pageSize: 2 });

    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(within(table()).queryByText("Délio Mabjaia")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Página seguinte" }));

    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(within(table()).getByText("Délio Mabjaia")).toBeInTheDocument();
  });

  it("não pagina quando tudo cabe numa página", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Página seguinte" })).not.toBeInTheDocument();
  });

  it("colapsa em cartões, com o mesmo conteúdo da tabela", () => {
    setup();

    // A lista existe sempre no DOM; abaixo de 768px é ela que fica visível. Cada cartão
    // repete o rótulo da coluna, porque sem cabeçalho de tabela o valor sozinho não diz nada.
    const cards = screen.getByRole("list", { name: "Alunos" });
    const items = within(cards).getAllByRole("listitem");

    expect(items).toHaveLength(STUDENTS.length);
    expect(within(items[0]).getByText("Percurso")).toBeInTheDocument();
    expect(within(items[0]).getByText("Ciências")).toBeInTheDocument();
  });

  it("esconde colunas pelo selector", async () => {
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Mostrar ou esconder colunas" }));
    await userEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Percurso" }),
    );

    expect(
      within(table()).queryByRole("columnheader", { name: /Percurso/ }),
    ).not.toBeInTheDocument();
  });

  it("traduz toda a interface para inglês", async () => {
    renderWithIntl(
      <DataTable label="Students" columns={columns} data={[]} enableSelection />,
      "en",
    );

    expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByText("No rows selected")).toBeInTheDocument();
    expect(screen.getAllByText("No records").length).toBeGreaterThan(0);
  });
});
