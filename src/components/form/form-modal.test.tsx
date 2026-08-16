import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { renderWithIntl } from "@/test/intl";

import type { FormActionResult, FormDefinition } from "./field-schema";
import { FormModal } from "./form-modal";

const schema = z.object({
  firstName: z.string().min(1, "Indique o nome"),
  code: z.string().min(4, "O número deve ter pelo menos 4 caracteres"),
  gender: z.string().min(1, "Escolha o sexo"),
  notes: z.string().optional(),
});

type Values = z.infer<typeof schema>;

const definition: FormDefinition<Values> = {
  schema,
  fields: [
    { name: "firstName", kind: "text", label: "Nome", required: true },
    { name: "code", kind: "text", label: "Número de aluno", required: true },
    {
      name: "gender",
      kind: "select",
      label: "Sexo",
      required: true,
      options: [
        { value: "FEMALE", label: "Feminino" },
        { value: "MALE", label: "Masculino" },
      ],
    },
    { name: "notes", kind: "textarea", label: "Observações" },
  ],
};

const defaults: Values = { firstName: "", code: "", gender: "", notes: "" };

function setup(
  onSubmit: (values: Values) => Promise<FormActionResult<Values>>,
  overrides: Partial<React.ComponentProps<typeof FormModal<Values>>> = {},
) {
  const onOpenChange = vi.fn();

  renderWithIntl(
    <FormModal
      open
      onOpenChange={onOpenChange}
      title="Novo aluno"
      description="Registe um aluno na escola."
      definition={definition}
      defaultValues={defaults}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onOpenChange };
}

describe("FormModal", () => {
  it("gera os campos a partir da definição", () => {
    setup(vi.fn());

    expect(screen.getByRole("dialog", { name: "Novo aluno" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de aluno/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Sexo/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Observações")).toBeInTheDocument();
  });

  it("valida com o esquema Zod e não chama a acção", async () => {
    const onSubmit = vi.fn();
    setup(onSubmit);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Indique o nome")).toBeInTheDocument();
    expect(screen.getByText("O número deve ter pelo menos 4 caracteres")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submete os valores validados", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: "success" });
    const { onOpenChange } = setup(onSubmit);

    await userEvent.type(screen.getByLabelText(/Nome/), "Ana");
    await userEvent.type(screen.getByLabelText(/Número de aluno/), "2026001");
    await userEvent.click(screen.getByRole("combobox", { name: /Sexo/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Feminino" }));

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Ana", code: "2026001", gender: "FEMALE" }),
      ),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("mapeia um erro do servidor ao campo que o causou", async () => {
    // O caso que justifica o canal `fieldErrors`: só a base de dados sabe que o número
    // já existe, e essa mensagem tem de aparecer junto ao campo e não solta no topo.
    const onSubmit = vi.fn().mockResolvedValue({
      status: "error",
      fieldErrors: { code: "Já existe um aluno com este número" },
    });
    setup(onSubmit);

    await userEvent.type(screen.getByLabelText(/Nome/), "Ana");
    await userEvent.type(screen.getByLabelText(/Número de aluno/), "2026001");
    await userEvent.click(screen.getByRole("combobox", { name: /Sexo/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Feminino" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Já existe um aluno com este número"),
    ).toBeInTheDocument();
    // Não duplica a mesma queixa numa mensagem geral no topo.
    expect(screen.queryByRole("alert")?.textContent).not.toContain(
      "Não foi possível guardar",
    );
  });

  it("mostra uma mensagem geral quando o erro não pertence a nenhum campo", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: "error",
      message: "A escola já não está activa",
    });
    setup(onSubmit);

    await userEvent.type(screen.getByLabelText(/Nome/), "Ana");
    await userEvent.type(screen.getByLabelText(/Número de aluno/), "2026001");
    await userEvent.click(screen.getByRole("combobox", { name: /Sexo/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Feminino" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A escola já não está activa");
  });

  it("não deixa o modal aberto a apanhar uma excepção da acção", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("rede"));
    setup(onSubmit);

    await userEvent.type(screen.getByLabelText(/Nome/), "Ana");
    await userEvent.type(screen.getByLabelText(/Número de aluno/), "2026001");
    await userEvent.click(screen.getByRole("combobox", { name: /Sexo/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Feminino" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível guardar. Tente de novo.",
    );
  });

  it("traduz a interface do formulário para inglês", () => {
    renderWithIntl(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="New student"
        definition={definition}
        defaultValues={defaults}
        onSubmit={vi.fn()}
      />,
      "en",
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
