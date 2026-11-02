import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { loadMembershipRolesAction, searchMembershipRoleOptionsAction, saveMembershipRolesAction } from "../actions/membership-permission-roles";
import { MembershipRoleDialog } from "./membership-role-dialog";
vi.mock("../actions/membership-permission-roles", () => ({ loadMembershipRolesAction: vi.fn(), searchMembershipRoleOptionsAction: vi.fn(), saveMembershipRolesAction: vi.fn() }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const roleA = { id: "role-a", name: "Perfil A", revision: "2026-10-31T08:00:00.000Z", permissionCount: 1, isSystem: false };
const roleB = { ...roleA, id: "role-b", name: "Perfil B" };
const preview = { membershipId: "member-a", name: "Alice", baseRole: "TEACHER" as const, status: "ACTIVE" as const, accountState: "active" as const, revision: "a".repeat(64), mode: "configured" as const, selectedRoles: [roleA], options: { rows: [roleA], total: 21, page: 1, pageCount: 2 } };
const props = { schoolId: "a", membershipId: "member-a", accountName: "Alice" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadMembershipRolesAction).mockResolvedValue({ status: "success", preview });
  vi.mocked(searchMembershipRoleOptionsAction).mockResolvedValue({ status: "success", options: { rows: [roleB], total: 21, page: 2, pageCount: 2 } });
  vi.mocked(saveMembershipRolesAction).mockResolvedValue({ status: "success" });
});
async function open() {
  await userEvent.click(screen.getByRole("button", { name: "Gerir perfis de Alice" }));
  const button = await screen.findByRole("button", { name: "Guardar atribuições" });
  await waitFor(() => expect(button).toBeEnabled());
}
it("preserves off-page selections, exact role revisions and the opening school", async () => {
  const view = renderWithIntl(<MembershipRoleDialog {...props} />);
  await open();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><MembershipRoleDialog {...props} schoolId="b" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  const checkbox = await screen.findByRole("checkbox", { name: "Seleccionar Perfil B" });
  await waitFor(() => expect(checkbox).toBeEnabled());
  await userEvent.click(checkbox);
  expect(screen.getByRole("button", { name: "Retirar Perfil A da selecção" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
  expect(searchMembershipRoleOptionsAction).toHaveBeenCalledWith({ expectedSchoolId: "a", query: "", page: 2 });
  await waitFor(() => expect(saveMembershipRolesAction).toHaveBeenCalledWith({ expectedSchoolId: "a", membershipId: "member-a", revision: preview.revision, mode: "configured", roles: [roleA, roleB].map(role => ({ id: role.id, revision: role.revision })) }));
});
it("clears all profiles as an explicit empty restriction without resetting full access", async () => {
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Retirar Perfil A da selecção" }));
  expect(screen.getByText(/Esta configuração não repõe o acesso total/)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
  await waitFor(() => expect(saveMembershipRolesAction).toHaveBeenCalledWith(expect.objectContaining({ mode: "configured", roles: [] })));
});
it("requires an explicit access-type choice before resetting a manager to full access", async () => {
  vi.mocked(loadMembershipRolesAction).mockResolvedValue({ status: "success", preview: { ...preview, baseRole: "SCHOOL_MANAGER" } });
  renderWithIntl(<MembershipRoleDialog {...props} />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Manage roles for Alice" }));
  const mode = await screen.findByRole("combobox", { name: "Access type" });
  await waitFor(() => expect(mode).toBeEnabled());
  await userEvent.click(mode); await userEvent.click(screen.getByRole("option", { name: "Full school access" }));
  expect(screen.getByText(/removes administrative restrictions/)).toBeVisible();
  expect(saveMembershipRolesAction).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Restore full access" }));
  await waitFor(() => expect(saveMembershipRolesAction).toHaveBeenCalledWith(expect.objectContaining({ mode: "legacy", roles: [], revision: preview.revision })));
});
it("does not update selected role revisions silently during search", async () => {
  vi.mocked(searchMembershipRoleOptionsAction).mockResolvedValue({ status: "success", options: { ...preview.options, rows: [{ ...roleA, revision: "2026-11-01T09:00:00.000Z", permissionCount: 50 }] } });
  vi.mocked(saveMembershipRolesAction).mockResolvedValue({ status: "error", message: "Definition changed" });
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Procurar" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar atribuições" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
  await waitFor(() => expect(saveMembershipRolesAction).toHaveBeenCalledWith(expect.objectContaining({ roles: [{ id: roleA.id, revision: roleA.revision }] })));
  expect(await screen.findByRole("alert")).toHaveTextContent("Definition changed");
});
it("searches on Enter without submitting an assignment or losing selected profiles", async () => {
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  const input = screen.getByRole("textbox", { name: "Procurar perfis" });
  await userEvent.type(input, "Finance{Enter}");
  await waitFor(() => expect(searchMembershipRoleOptionsAction).toHaveBeenCalledWith({ expectedSchoolId: "a", query: "Finance", page: 1 }));
  expect(saveMembershipRolesAction).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Retirar Perfil A da selecção" })).toBeVisible();
});
it("blocks blind writes after an uncertain response and reconciles on close", async () => {
  vi.mocked(saveMembershipRolesAction).mockRejectedValue(new Error("Network"));
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("A resposta não foi confirmada");
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar atribuições" })).toBeDisabled());
  expect(screen.getByRole("checkbox", { name: "Seleccionar Perfil A" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(refresh).toHaveBeenCalledOnce();
});
it("enforces the selection limit without discarding an existing profile", async () => {
  const selected = Array.from({ length: 20 }, (_, index) => ({ ...roleA, id: `selected-${index}`, name: `Selected ${index}` }));
  vi.mocked(loadMembershipRolesAction).mockResolvedValue({ status: "success", preview: { ...preview, selectedRoles: selected, options: { ...preview.options, rows: [roleB] } } });
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  expect(screen.getByRole("checkbox", { name: "Seleccionar Perfil B" })).toBeDisabled();
  expect(screen.getByText(/20 perfis seleccionados/)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
  await waitFor(() => expect(saveMembershipRolesAction).toHaveBeenCalledWith(expect.objectContaining({ roles: selected.map(role => ({ id: role.id, revision: role.revision })) })));
});
it("closes a cancelled preview without a refresh and keeps protected own rows disabled", async () => {
  const view = renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(refresh).not.toHaveBeenCalled(); expect(saveMembershipRolesAction).not.toHaveBeenCalled();
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><MembershipRoleDialog {...props} disabled /></NextIntlClientProvider>);
  expect(screen.getByRole("button", { name: "Gerir perfis de Alice" })).toBeDisabled();
});

it("shows suspension and initial-credential protection without claiming activation", async () => {
  vi.mocked(loadMembershipRolesAction).mockResolvedValue({ status: "success", preview: { ...preview, status: "SUSPENDED", accountState: "initial" } });
  renderWithIntl(<MembershipRoleDialog {...props} />); await open();
  expect(screen.getByText(/guardados sem repor o acesso/)).toBeVisible();
  expect(screen.getByText(/alteração da palavra-passe continua obrigatória/)).toBeVisible();
});
