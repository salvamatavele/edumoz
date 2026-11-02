import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { PermissionGrid } from "./permission-grid";

it("keeps dormant historical grants visible but disabled and preserves them during active level changes", async () => {
  const change = vi.fn();
  renderWithIntl(<PermissionGrid catalog={[{ id: "view", resource: "students", action: "view" }, { id: "create", resource: "students", action: "create" }, { id: "dormant", resource: "students", action: "delete" }]} selected={new Set(["view", "dormant"])} onChange={change} disabled={false} />);
  await userEvent.click(screen.getByText("Ajustes detalhados"));
  expect(screen.getByRole("checkbox", { name: "Alunos — Apagar" })).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "Alunos — Apagar" })).toBeChecked();
  expect(screen.getByText("Configuração antiga preservada; função ainda indisponível")).toBeVisible();
  await userEvent.click(screen.getByRole("combobox", { name: "Acesso: Alunos" }));
  await userEvent.click(screen.getByRole("option", { name: "Alterar" }));
  await waitFor(() => expect(change).toHaveBeenCalledWith(new Set(["view", "create", "dormant"])));
});
it("does not present a dormant grades permission as control over the teacher's own workflow", async () => {
  renderWithIntl(<PermissionGrid catalog={[{ id: "grade", resource: "grades", action: "view" }]} selected={new Set()} onChange={vi.fn()} disabled={false} />);
  expect(screen.getByRole("combobox", { name: "Acesso: Notas" })).toBeDisabled();
  expect(screen.getByText(/ainda não estão disponíveis/)).toBeVisible();
});
