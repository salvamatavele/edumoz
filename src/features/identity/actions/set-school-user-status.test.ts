// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/identity/data/school-user-status", () => ({ changeSchoolUserStatus: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
const { auth } = await import("@/lib/auth/config");
const { changeSchoolUserStatus } = await import("@/features/identity/data/school-user-status");
const { setSchoolUserStatus } = await import("./set-school-user-status");
const input = { expectedSchoolId: "school-a", userId: "shared-user", status: "SUSPENDED" as const };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(changeSchoolUserStatus).mockResolvedValue(undefined); });
it.each(["school-a", undefined])("refuses a stale or missing school context for a shared-user status change", async expectedSchoolId => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "manager" }, schoolId: "school-b", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  expect(await setSchoolUserStatus({ ...input, expectedSchoolId } as never)).toEqual({ status: "error", message: "errors.schoolChanged" });
  expect(changeSchoolUserStatus).not.toHaveBeenCalled();
});
it("allows a matching school context and still delegates persisted authorization", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "manager", authVersion: 2 }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  expect(await setSchoolUserStatus(input)).toEqual({ status: "success" });
  expect(changeSchoolUserStatus).toHaveBeenCalledWith(expect.objectContaining({ schoolId: "school-a", authVersion: 2 }), input);
});
