import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { loadPermissionRoleAction, savePermissionRoleAction, deletePermissionRoleAction } from "../actions/permission-role-management";
import { PermissionRoleManagementDialog } from "./permission-role-management-dialog";
vi.mock("../actions/permission-role-management", () => ({ loadPermissionRoleAction: vi.fn(), savePermissionRoleAction: vi.fn(), deletePermissionRoleAction: vi.fn() }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const record = { id: "role-a", name: "Papel confirmado", description: "Description", permissionIds: ["view"], revision: "2026-10-31T08:00:00.000Z", isSystem: false, memberCount: 0 };
const props = { schoolId: "a", roleId: "role-a", roleName: "Papel", catalog: [{ id: "view", resource: "students" as const, action: "view" as const }] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadPermissionRoleAction).mockResolvedValue({ status: "success", role: record }); vi.mocked(savePermissionRoleAction).mockResolvedValue({ status: "success" }); vi.mocked(deletePermissionRoleAction).mockResolvedValue({ status: "success" }); });
it("loads an authoritative snapshot and saves metadata/grants against its opening school", async () => {
  const view = renderWithIntl(<PermissionRoleManagementDialog {...props} mode="edit" />);
  await userEvent.click(screen.getByRole("button", { name: "Editar papel Papel" }));
  const field = await screen.findByRole("textbox", { name: /^Nome/ });
  await waitFor(() => expect(field).toBeEnabled());
  const user = userEvent.setup(); await user.click(field); await user.clear(field); await user.paste("Papel actualizado");
  await userEvent.click(screen.getByRole("combobox", { name: "Acesso: Alunos" }));
  await userEvent.click(screen.getByRole("option", { name: "Sem acesso" }));
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><PermissionRoleManagementDialog {...props} schoolId="b" mode="edit" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Guardar alterações" }));
  await waitFor(() => expect(savePermissionRoleAction).toHaveBeenCalledWith({ id: record.id, name: "Papel actualizado", description: record.description, permissionIds: [], revision: record.revision, expectedSchoolId: "a" }));
});
it("requires nominal confirmation before deleting an unused custom role", async () => {
  renderWithIntl(<PermissionRoleManagementDialog {...props} mode="delete" />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Delete role Papel" }));
  expect(await screen.findByText(record.name)).toBeVisible();
  expect(deletePermissionRoleAction).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
  await waitFor(() => expect(deletePermissionRoleAction).toHaveBeenCalledWith({ id: record.id, revision: record.revision, expectedSchoolId: "a" }));
});
it.each([{ isSystem: true, memberCount: 0 }, { isSystem: false, memberCount: 2 }])("does not allow deletion of protected server snapshots %j", async protection => {
  vi.mocked(loadPermissionRoleAction).mockResolvedValue({ status: "success", role: { ...record, ...protection } });
  renderWithIntl(<PermissionRoleManagementDialog {...props} mode="delete" />);
  await userEvent.click(screen.getByRole("button", { name: "Apagar papel Papel" }));
  await screen.findByText(record.name);
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar eliminação" })).toBeDisabled());
  expect(deletePermissionRoleAction).not.toHaveBeenCalled();
});
it("blocks blind retries after an uncertain write response", async () => {
  vi.mocked(savePermissionRoleAction).mockRejectedValue(new Error("Network"));
  renderWithIntl(<PermissionRoleManagementDialog {...props} mode="edit" />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Edit role Papel" }));
  await screen.findByRole("textbox", { name: /^Name/ });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("response did not arrive");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled());
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(refresh).toHaveBeenCalledOnce();
});

it("closes a cancelled preview without refreshing and discarding a subsequent dialog", async () => {
  renderWithIntl(<PermissionRoleManagementDialog {...props} mode="delete" />);
  await userEvent.click(screen.getByRole("button", { name: "Apagar papel Papel" }));
  await screen.findByText(record.name);
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(refresh).not.toHaveBeenCalled();
  expect(deletePermissionRoleAction).not.toHaveBeenCalled();
});
