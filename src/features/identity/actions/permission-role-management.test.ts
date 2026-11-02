// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/permission-role-management", () => ({ loadSchoolPermissionRole: vi.fn(), saveSchoolPermissionRole: vi.fn(), deleteSchoolPermissionRole: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { loadSchoolPermissionRole, saveSchoolPermissionRole, deleteSchoolPermissionRole } from "../data/permission-role-management";
import { loadPermissionRoleAction, savePermissionRoleAction, deletePermissionRoleAction } from "./permission-role-management";
const actions = [loadPermissionRoleAction, savePermissionRoleAction, deletePermissionRoleAction];
const session = { user: { id: "actor", authVersion: 3 }, schoolId: "a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null, permissions: [] };
const input = { id: "role", expectedSchoolId: "a", revision: "2026-10-31T08:00:00.000Z", name: "Role", description: "", permissionIds: [] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue(session as never); });
it.each(actions)("refuses another opening school before data access", async action => {
  expect(await action({ ...input, expectedSchoolId: "b" })).toMatchObject({ status: "error", message: "users.errors.schoolChanged" });
  expect(loadSchoolPermissionRole).not.toHaveBeenCalled(); expect(saveSchoolPermissionRole).not.toHaveBeenCalled(); expect(deleteSchoolPermissionRole).not.toHaveBeenCalled();
});
it.each(actions)("refuses restricted managers before data access", async action => {
  vi.mocked(auth).mockResolvedValue({ ...session, permissionRoleId: "reader" } as never);
  expect(await action(input)).toMatchObject({ status: "error", message: "users.errors.forbidden" });
  expect(loadSchoolPermissionRole).not.toHaveBeenCalled(); expect(saveSchoolPermissionRole).not.toHaveBeenCalled(); expect(deleteSchoolPermissionRole).not.toHaveBeenCalled();
});
it("passes the verified actor and credential version to mutations", async () => {
  expect(await savePermissionRoleAction(input)).toEqual({ status: "success" });
  expect(saveSchoolPermissionRole).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", authVersion: 3, schoolId: "a" }), input);
});
