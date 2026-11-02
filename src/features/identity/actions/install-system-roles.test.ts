// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/install-system-roles", () => ({ installSchoolSystemRoles: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { installSchoolSystemRoles } from "../data/install-system-roles";
import { installSystemRolesAction } from "./install-system-roles";
const session = { user: { id: "actor", authVersion: 3 }, schoolId: "a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null, permissions: [] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue(session as never); });
it("rejects a stale opening school before accessing data", async () => {
  expect(await installSystemRolesAction({ expectedSchoolId: "b" })).toMatchObject({ status: "error", message: "users.errors.schoolChanged" });
  expect(installSchoolSystemRoles).not.toHaveBeenCalled();
});
it("refuses a restricted actor before accessing data", async () => {
  vi.mocked(auth).mockResolvedValue({ ...session, permissionRoleId: "restricted" } as never);
  expect(await installSystemRolesAction({ expectedSchoolId: "a" })).toMatchObject({ status: "error", message: "users.errors.forbidden" });
  expect(installSchoolSystemRoles).not.toHaveBeenCalled();
});
it("forwards verified authority and the current school", async () => {
  vi.mocked(installSchoolSystemRoles).mockResolvedValue({ created: 9 });
  expect(await installSystemRolesAction({ expectedSchoolId: "a" })).toEqual({ status: "success", created: 9 });
  expect(installSchoolSystemRoles).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", authVersion: 3 }), "a");
});
