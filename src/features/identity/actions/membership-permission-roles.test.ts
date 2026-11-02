// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/membership-permission-roles", () => ({ loadSchoolMembershipRoles: vi.fn(), searchSchoolPermissionRoles: vi.fn(), saveSchoolMembershipRoles: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { loadSchoolMembershipRoles, searchSchoolPermissionRoles, saveSchoolMembershipRoles } from "../data/membership-permission-roles";
import { loadMembershipRolesAction, searchMembershipRoleOptionsAction, saveMembershipRolesAction } from "./membership-permission-roles";
const actions = [loadMembershipRolesAction, searchMembershipRoleOptionsAction, saveMembershipRolesAction];
const session = { user: { id: "actor", authVersion: 3 }, schoolId: "a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null, permissionsConfigured: false, permissions: [] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue(session as never); });
it.each(actions)("refuses a different opening school before data access", async action => {
  expect(await action({ expectedSchoolId: "b" } as never)).toMatchObject({ status: "error", message: "users.errors.schoolChanged" });
  expect(loadSchoolMembershipRoles).not.toHaveBeenCalled(); expect(searchSchoolPermissionRoles).not.toHaveBeenCalled(); expect(saveSchoolMembershipRoles).not.toHaveBeenCalled();
});
it.each(actions)("refuses configured empty restrictions even without a legacy bridge", async action => {
  vi.mocked(auth).mockResolvedValue({ ...session, permissionsConfigured: true } as never);
  expect(await action({ expectedSchoolId: "a" } as never)).toMatchObject({ status: "error", message: "users.errors.forbidden" });
  expect(loadSchoolMembershipRoles).not.toHaveBeenCalled(); expect(searchSchoolPermissionRoles).not.toHaveBeenCalled(); expect(saveSchoolMembershipRoles).not.toHaveBeenCalled();
});
it("forwards a verified holder/version and exact role revisions", async () => {
  const input = { expectedSchoolId: "a", membershipId: "target", revision: "a".repeat(64), mode: "configured" as const, roles: [{ id: "role", revision: "2026-10-31T08:00:00.000Z" }] };
  expect(await saveMembershipRolesAction(input)).toEqual({ status: "success" });
  expect(saveSchoolMembershipRoles).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", authVersion: 3, permissionsConfigured: false }), input);
});
