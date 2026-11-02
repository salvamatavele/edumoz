// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../data/school-user-removal", () => ({ previewSchoolUserRemoval: vi.fn(), removeSchoolUser: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { previewSchoolUserRemoval, removeSchoolUser } from "../data/school-user-removal";
import { previewSchoolUserRemovalAction, removeSchoolUserAction } from "./school-user-removal";
const session = { user: { id: "actor", authVersion: 0 }, schoolId: "a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissions: [], permissionRoleId: null };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue(session as never); });
it("refuses both actions for another opening school", async () => {
  const input = { userId: "target", revision: "a".repeat(64), expectedSchoolId: "b" };
  expect(await previewSchoolUserRemovalAction(input)).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(await removeSchoolUserAction(input)).toMatchObject({ status: "error", message: "errors.schoolChanged" });
  expect(previewSchoolUserRemoval).not.toHaveBeenCalled(); expect(removeSchoolUser).not.toHaveBeenCalled();
});
it("refuses a reader and an anonymous caller before accessing identity data", async () => {
  const input = { userId: "target", revision: "a".repeat(64), expectedSchoolId: "a" };
  vi.mocked(auth).mockResolvedValue({ ...session, permissionRoleId: "reader", permissions: [{ resource: "users", action: "view" }] } as never);
  expect(await removeSchoolUserAction(input)).toMatchObject({ status: "error", message: "errors.forbidden" });
  vi.mocked(auth).mockResolvedValue(null as never);
  expect(await previewSchoolUserRemovalAction(input)).toMatchObject({ status: "error", message: "errors.forbidden" });
  expect(previewSchoolUserRemoval).not.toHaveBeenCalled(); expect(removeSchoolUser).not.toHaveBeenCalled();
});
it("passes the authenticated actor and ignores a forged caller identity", async () => {
  await removeSchoolUserAction({ userId: "target", revision: "a".repeat(64), expectedSchoolId: "a", actorUserId: "forged" } as never);
  expect(removeSchoolUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", schoolId: "a" }), expect.objectContaining({ userId: "target" }));
});
