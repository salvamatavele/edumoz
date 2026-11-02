// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/school-staff", () => ({ getSchoolStaff: vi.fn(), saveSchoolStaff: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
const { auth } = await import("@/lib/auth/config");
const { getSchoolStaff, saveSchoolStaff } = await import("../data/school-staff");
const { loadSchoolStaffAction, saveSchoolStaffAction } = await import("./school-staff");
const input = { requestId: "d98f7f8e-c394-4cfb-af3f-91ef9872d7c", code: "F001", name: "Synthetic staff", jobTitle: "Secretary", expectedSchoolId: "a" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: "manager", authVersion: 1 }, schoolId: "a", role: "SCHOOL_MANAGER", memberships: [], isPlatformAdmin: false } as never); });
it("refuses a changed school before creation or detail reads", async () => {
  expect(await saveSchoolStaffAction({ ...input, expectedSchoolId: "b" })).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(await loadSchoolStaffAction({ id: "staff", expectedSchoolId: "b" })).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(saveSchoolStaff).not.toHaveBeenCalled(); expect(getSchoolStaff).not.toHaveBeenCalled();
});
it("refuses edit and create for a view-only role", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "reader" }, schoolId: "a", role: "SCHOOL_MANAGER", memberships: [], isPlatformAdmin: false, permissionRoleId: "role", permissions: [{ resource: "school-staff", action: "view" }] } as never);
  expect(await saveSchoolStaffAction(input)).toMatchObject({ status: "error", message: "errors.forbidden" });
  expect(await saveSchoolStaffAction({ ...input, id: "staff", revision: "2026-10-30T08:00:00.000Z" })).toMatchObject({ status: "error", message: "errors.forbidden" });
  expect(await loadSchoolStaffAction({ id: "staff", expectedSchoolId: "a" })).toMatchObject({ status: "error", message: "errors.forbidden" }); expect(saveSchoolStaff).not.toHaveBeenCalled();
});
it("passes the authenticated context and redacts unexpected errors", async () => {
  expect(await saveSchoolStaffAction(input)).toEqual({ status: "success", data: null }); expect(saveSchoolStaff).toHaveBeenCalledWith(expect.objectContaining({ schoolId: "a", userId: "manager", authVersion: 1 }), input);
  vi.mocked(getSchoolStaff).mockRejectedValue(new Error("Private contact and SQL")); expect(await loadSchoolStaffAction({ id: "staff", expectedSchoolId: "a" })).toEqual({ status: "error", message: "errors.unavailable" });
});
