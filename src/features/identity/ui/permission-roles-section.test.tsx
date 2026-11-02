vi.mock("../actions/membership-permission-overrides", () => ({ loadMembershipPermissionOverridesAction: vi.fn(), saveMembershipPermissionOverridesAction: vi.fn() }));
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadMembershipRolesAction, saveMembershipRolesAction } from "@/features/identity/actions/membership-permission-roles";
import { createPermissionRole } from "@/features/identity/actions/create-permission-role";
import type {
  AssignableStaffRow,
  PermissionCatalogEntryRow,
  PermissionRoleRow,
} from "@/features/identity/data/permission-roles";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";

import { PermissionRolesSection } from "./permission-roles-section";

vi.mock("@/features/identity/actions/install-system-roles", () => ({ installSystemRolesAction: vi.fn() }));
vi.mock("@/features/identity/actions/permission-role-management", () => ({ loadPermissionRoleAction: vi.fn(), savePermissionRoleAction: vi.fn(), deletePermissionRoleAction: vi.fn() }));
vi.mock("@/features/identity/actions/create-permission-role", () => ({
  createPermissionRole: vi.fn(),
}));
vi.mock("@/features/identity/actions/membership-permission-roles", () => ({ loadMembershipRolesAction: vi.fn(), searchMembershipRoleOptionsAction: vi.fn(), saveMembershipRolesAction: vi.fn() }));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockCreatePermissionRole = vi.mocked(createPermissionRole);
const mockAssignPermissionRole = vi.mocked(saveMembershipRolesAction);
beforeEach(() => { mockCreatePermissionRole.mockReset(); mockAssignPermissionRole.mockReset(); refresh.mockClear(); vi.mocked(loadMembershipRolesAction).mockResolvedValue({ status: "success", preview: { membershipId: "membership-1", name: "Elsa Chirindza", baseRole: "SCHOOL_MANAGER", status: "ACTIVE", accountState: "active", revision: "a".repeat(64), mode: "configured", selectedRoles: [], options: { rows: [{ id: "role-1", name: "Director-adjunto", revision: "2026-10-31T08:00:00.000Z", isSystem: false, permissionCount: 1 }], total: 1, page: 1, pageCount: 1 } } }); });

const catalog: PermissionCatalogEntryRow[] = [
  { id: "perm-students-view", resource: "students", action: "view" },
  { id: "perm-students-delete", resource: "students", action: "delete" },
];

const roles: PermissionRoleRow[] = [
  { id: "role-1", name: "Director-adjunto", description: "Sem apagar", permissionIds: ["perm-students-view"], memberCount: 1, isSystem: false },
];

const staff: AssignableStaffRow[] = [
  { membershipId: "membership-1", userName: "Elsa Chirindza", baseRole: "SCHOOL_MANAGER", status: "ACTIVE", mode: "legacy", assignedRoleCount: 0, isCurrentUser: false },
];

function renderSection() {
  renderWithIntl(<PermissionRolesSection schoolId="school-a" roles={roles} catalog={catalog} staff={staff} />);
}

describe("PermissionRolesSection", () => {
  afterEach(() => {
    mockCreatePermissionRole.mockClear();
    mockAssignPermissionRole.mockClear();
    refresh.mockClear();
  });

  it("abre o modal de criação e submete o nome com as permissões marcadas", async () => {
    mockCreatePermissionRole.mockResolvedValue({ status: "success" });
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Criar papel" }));
    expect(screen.getByRole("dialog", { name: "Criar papel configurável" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/^Nome/));
    await user.paste("Secretaria");
    await userEvent.click(screen.getByRole("combobox", { name: "Acesso: Alunos" }));
    await userEvent.click(screen.getByRole("option", { name: "Consultar" }));

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockCreatePermissionRole).toHaveBeenCalledWith({
        expectedSchoolId: "school-a", requestId: expect.any(String),
        name: "Secretaria",
        description: "",
        permissionIds: ["perm-students-view"],
      });
    });
  });

  it("mostra o erro de nome em falta sem chamar a Server Action", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Criar papel" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Indique um nome com 3 a 120 caracteres e pelo menos uma letra ou número.")).toBeInTheDocument();
    expect(mockCreatePermissionRole).not.toHaveBeenCalled();
  });

  it("requires an authoritative preview before assigning a role to a manager", async () => {
    mockAssignPermissionRole.mockResolvedValue({ status: "success" });
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: "Gerir perfis de Elsa Chirindza" }));
    const checkbox = await screen.findByRole("checkbox", { name: "Seleccionar Director-adjunto" });
    await waitFor(() => expect(checkbox).toBeEnabled());
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: "Guardar atribuições" }));
    await waitFor(() => expect(mockAssignPermissionRole).toHaveBeenCalledWith({ expectedSchoolId: "school-a", membershipId: "membership-1", revision: "a".repeat(64), mode: "configured", roles: [{ id: "role-1", revision: "2026-10-31T08:00:00.000Z" }] }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

it("keeps creation bound to the school where its form opened", async () => {
  mockCreatePermissionRole.mockResolvedValue({ status: "error", message: "School changed" });
  const view = renderWithIntl(<PermissionRolesSection schoolId="school-a" roles={roles} catalog={catalog} staff={staff} />);
  await userEvent.click(screen.getByRole("button", { name: "Criar papel" }));
  const user = userEvent.setup(); await user.click(screen.getByLabelText(/^Nome/)); await user.paste("Papel de Ensaio");
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><PermissionRolesSection schoolId="school-b" roles={roles} catalog={catalog} staff={staff} /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(mockCreatePermissionRole).toHaveBeenCalledWith(expect.objectContaining({ expectedSchoolId: "school-a", requestId: expect.any(String) })));
  expect(await screen.findByRole("alert")).toHaveTextContent("School changed");
});
it("reuses the request identity when retrying an uncertain creation", async () => {
  mockCreatePermissionRole.mockRejectedValueOnce(new Error("Network")).mockResolvedValueOnce({ status: "success" });
  renderSection();
  await userEvent.click(screen.getByRole("button", { name: "Criar papel" }));
  const user = userEvent.setup(); await user.click(screen.getByLabelText(/^Nome/)); await user.paste("Papel de Ensaio");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Pode repetir com os mesmos dados");
  await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(mockCreatePermissionRole).toHaveBeenCalledTimes(2));
  expect(mockCreatePermissionRole.mock.calls[0][0].requestId).toBe(mockCreatePermissionRole.mock.calls[1][0].requestId);
});
