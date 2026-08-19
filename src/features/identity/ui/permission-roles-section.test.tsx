import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { assignPermissionRole } from "@/features/identity/actions/assign-permission-role";
import { createPermissionRole } from "@/features/identity/actions/create-permission-role";
import type {
  AssignableStaffRow,
  PermissionCatalogEntryRow,
  PermissionRoleRow,
} from "@/features/identity/data/permission-roles";
import { renderWithIntl } from "@/test/intl";

import { PermissionRolesSection } from "./permission-roles-section";

vi.mock("@/features/identity/actions/create-permission-role", () => ({
  createPermissionRole: vi.fn(),
}));
vi.mock("@/features/identity/actions/assign-permission-role", () => ({
  assignPermissionRole: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockCreatePermissionRole = vi.mocked(createPermissionRole);
const mockAssignPermissionRole = vi.mocked(assignPermissionRole);

const catalog: PermissionCatalogEntryRow[] = [
  { id: "perm-students-view", resource: "students", action: "view" },
  { id: "perm-students-delete", resource: "students", action: "delete" },
];

const roles: PermissionRoleRow[] = [
  { id: "role-1", name: "Director-adjunto", description: "Sem apagar", permissionIds: ["perm-students-view"], memberCount: 1 },
];

const staff: AssignableStaffRow[] = [
  { membershipId: "membership-1", userName: "Elsa Chirindza", userEmail: "elsa@escola.co.mz", permissionRoleId: null },
];

function renderSection() {
  renderWithIntl(<PermissionRolesSection roles={roles} catalog={catalog} staff={staff} />);
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

    await userEvent.type(screen.getByLabelText(/^Nome/), "Secretaria");
    await userEvent.click(screen.getByRole("checkbox", { name: "Alunos — Ver" }));

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockCreatePermissionRole).toHaveBeenCalledWith({
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

    expect(await screen.findByText("Indique um nome para o papel")).toBeInTheDocument();
    expect(mockCreatePermissionRole).not.toHaveBeenCalled();
  });

  it("atribui um papel a um gestor a partir do selector", async () => {
    mockAssignPermissionRole.mockResolvedValue({ status: "success" });
    renderSection();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Director-adjunto" }));

    await waitFor(() => {
      expect(mockAssignPermissionRole).toHaveBeenCalledWith({
        membershipId: "membership-1",
        permissionRoleId: "role-1",
      });
    });
    expect(refresh).toHaveBeenCalled();
  });
});
