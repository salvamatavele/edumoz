// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/membership-permission-overrides", () => ({ loadSchoolMembershipPermissionOverrides: vi.fn(), saveSchoolMembershipPermissionOverrides: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { loadSchoolMembershipPermissionOverrides, saveSchoolMembershipPermissionOverrides } from "../data/membership-permission-overrides";
import { loadMembershipPermissionOverridesAction, saveMembershipPermissionOverridesAction } from "./membership-permission-overrides";
const actions = [loadMembershipPermissionOverridesAction, saveMembershipPermissionOverridesAction];
const session = { user: { id: "actor", authVersion: 3 }, schoolId: "a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null, permissionsConfigured: false, permissions: [] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue(session as never); });
it.each(actions)("refuses a different opening school before data access", async action => {
  expect(await action({ expectedSchoolId: "b" } as never)).toMatchObject({ status: "error", message: "users.errors.schoolChanged" });
  expect(loadSchoolMembershipPermissionOverrides).not.toHaveBeenCalled(); expect(saveSchoolMembershipPermissionOverrides).not.toHaveBeenCalled();
});
it.each(actions)("refuses exception-restricted policy managers", async action => {
  vi.mocked(auth).mockResolvedValue({ ...session, permissionsConfigured: true } as never);
  expect(await action({ expectedSchoolId: "a" } as never)).toMatchObject({ status: "error", message: "users.errors.forbidden" });
  expect(loadSchoolMembershipPermissionOverrides).not.toHaveBeenCalled(); expect(saveSchoolMembershipPermissionOverrides).not.toHaveBeenCalled();
});
it("forwards verified identity/version and the explicit exception intent", async () => {
  const input = { expectedSchoolId: "a", membershipId: "target", revision: "a".repeat(64), overrides: [{ permissionId: "permission", allowed: false, reason: "Private" }] };
  expect(await saveMembershipPermissionOverridesAction(input)).toEqual({ status: "success" });
  expect(saveSchoolMembershipPermissionOverrides).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", authVersion: 3 }), input);
});
