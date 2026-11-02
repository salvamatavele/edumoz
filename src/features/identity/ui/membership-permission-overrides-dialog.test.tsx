import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { loadMembershipPermissionOverridesAction, saveMembershipPermissionOverridesAction } from "../actions/membership-permission-overrides";
import { MembershipPermissionOverridesDialog } from "./membership-permission-overrides-dialog";
import type { MembershipPermissionOverridesPreview } from "../domain/membership-permission-override-schema";
vi.mock("../actions/membership-permission-overrides", () => ({ loadMembershipPermissionOverridesAction: vi.fn(), saveMembershipPermissionOverridesAction: vi.fn() }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const preview: MembershipPermissionOverridesPreview = {
  membershipId: "member-a", name: "Alice", baseRole: "TEACHER", status: "ACTIVE", accountState: "active", revision: "a".repeat(64), legacyProfile: false,
  rows: [
    ...(["view", "create"] as const).map(action => ({ permissionId: `students-${action}`, resource: "students" as const, action, inherited: action === "view", override: null, reason: "", effective: action === "view", otherDenial: false })),
    { permissionId: "users-edit", resource: "users", action: "edit", inherited: false, override: null, reason: "", effective: false, otherDenial: false },
  ],
};
const props = { schoolId: "a", membershipId: "member-a", accountName: "Alice" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadMembershipPermissionOverridesAction).mockResolvedValue({ status: "success", preview });
  vi.mocked(saveMembershipPermissionOverridesAction).mockResolvedValue({ status: "success" });
});
async function open() {
  await userEvent.click(screen.getByRole("button", { name: "Gerir excepções de Alice" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar excepções" })).toBeEnabled());
}
function section(name: string) { return within(screen.getByRole("heading", { name }).closest("section")!); }
async function details(name: string) { await userEvent.click(section(name).getByText("Consultar e ajustar cada acção")); }
it("saves a resource denial with the exact revision and opening school", async () => {
  const view = renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Nível de Alunos" }), "none");
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><MembershipPermissionOverridesDialog {...props} schoolId="b" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(saveMembershipPermissionOverridesAction).toHaveBeenCalledWith({ expectedSchoolId: "a", membershipId: "member-a", revision: preview.revision, overrides: preview.rows.filter(row => row.resource === "students").map(row => ({ permissionId: row.permissionId, allowed: false, reason: "" })) });
});
it("permits an individual action with a bounded private reason", async () => {
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open(); await details("Utilizadores");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Excepção de Utilizadores — Editar" }), "allow");
  const reason = screen.getByRole("textbox", { name: "Motivo de Utilizadores — Editar (opcional)" });
  expect(reason).toHaveAttribute("maxlength", "300");
  await userEvent.type(reason, "Approved local duty");
  expect(section("Utilizadores").getByText("Resultado previsto: Permitido")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(saveMembershipPermissionOverridesAction).toHaveBeenCalledWith(expect.objectContaining({ overrides: [{ permissionId: "users-edit", allowed: true, reason: "Approved local duty" }] }));
});
it("removes an exception to restore inheritance instead of storing an implicit grant", async () => {
  vi.mocked(loadMembershipPermissionOverridesAction).mockResolvedValue({ status: "success", preview: { ...preview, rows: preview.rows.map(row => row.permissionId === "students-view" ? { ...row, override: false, reason: "Old exception", effective: false } : row) } });
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Nível de Alunos" }), "inherit");
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(saveMembershipPermissionOverridesAction).toHaveBeenCalledWith(expect.objectContaining({ overrides: [] }));
});
it("explains why another association's denial still wins over an individual allow", async () => {
  vi.mocked(loadMembershipPermissionOverridesAction).mockResolvedValue({ status: "success", preview: { ...preview, rows: preview.rows.map(row => row.permissionId === "users-edit" ? { ...row, otherDenial: true } : row) } });
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open(); await details("Utilizadores");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Excepção de Utilizadores — Editar" }), "allow");
  expect(section("Utilizadores").getByText("Resultado previsto: Negado")).toBeVisible();
  expect(screen.getByText(/Outra associação activa nega/)).toBeVisible();
});
it("searches without saving and retains changes to filtered-out resources", async () => {
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Nível de Alunos" }), "none");
  await userEvent.type(screen.getByRole("textbox", { name: "Procurar recurso" }), "Utilizadores{Enter}");
  expect(screen.queryByRole("heading", { name: "Alunos" })).not.toBeInTheDocument();
  expect(saveMembershipPermissionOverridesAction).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(saveMembershipPermissionOverridesAction).toHaveBeenCalledWith(expect.objectContaining({ overrides: expect.arrayContaining([{ permissionId: "students-view", allowed: false, reason: "" }]) }));
});
it("blocks retry after an uncertain write and refreshes on close", async () => {
  vi.mocked(saveMembershipPermissionOverridesAction).mockRejectedValue(new Error("Synthetic connection loss"));
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar a gravação");
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar excepções" })).toBeDisabled());
  expect(screen.getByRole("combobox", { name: "Nível de Alunos" })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(refresh).toHaveBeenCalledOnce();
});
it("keeps explicit server conflicts visible without losing the draft", async () => {
  vi.mocked(saveMembershipPermissionOverridesAction).mockResolvedValue({ status: "error", message: "Changed inheritance" });
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Nível de Alunos" }), "none");
  await userEvent.click(screen.getByRole("button", { name: "Guardar excepções" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Changed inheritance");
  expect(screen.getByRole("combobox", { name: "Nível de Alunos" })).toHaveValue("none");
});
it("shows suspended and legacy consequences without sending activation or profile changes", async () => {
  vi.mocked(loadMembershipPermissionOverridesAction).mockResolvedValue({ status: "success", preview: { ...preview, status: "SUSPENDED", legacyProfile: true } });
  renderWithIntl(<MembershipPermissionOverridesDialog {...props} />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Manage exceptions for Alice" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save exceptions" })).toBeEnabled());
  expect(screen.getByText(/Suspended association/)).toBeVisible();
  expect(screen.getByText(/removes unrestricted policy-management status/)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Save exceptions" }));
  expect(saveMembershipPermissionOverridesAction).toHaveBeenCalledWith({ expectedSchoolId: "a", membershipId: "member-a", revision: preview.revision, overrides: [] });
});
it("cancels without mutation or refresh and protects the current account trigger", async () => {
  const view = renderWithIntl(<MembershipPermissionOverridesDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(saveMembershipPermissionOverridesAction).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><MembershipPermissionOverridesDialog {...props} disabled /></NextIntlClientProvider>);
  expect(screen.getByRole("button", { name: "Gerir excepções de Alice" })).toBeDisabled();
});
