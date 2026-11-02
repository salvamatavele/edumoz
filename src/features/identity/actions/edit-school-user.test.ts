// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/identity/data/edit-school-user", () => ({ getEditableSchoolUser: vi.fn(), editSchoolUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
const { auth } = await import("@/lib/auth/config");
const { getEditableSchoolUser, editSchoolUser } = await import("@/features/identity/data/edit-school-user");
const { loadSchoolUserEditAction, editSchoolUserAction } = await import("./edit-school-user");
const { SchoolUserError } = await import("../domain/school-users");
const input = { userId: "exclusive", name: "Synthetic name", email: "", phone: "", revision: "2026-10-30T08:00:00.000Z", expectedSchoolId: "school-a" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { id: "manager", authVersion: 3 }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  vi.mocked(getEditableSchoolUser).mockResolvedValue(input); vi.mocked(editSchoolUser).mockResolvedValue(undefined);
});
it.each([loadSchoolUserEditAction, editSchoolUserAction])("refuses a stale school before reading or mutating", async action => {
  expect(await action({ ...input, expectedSchoolId: "school-b" })).toEqual({ status: "error", message: "errors.schoolChanged" });
  expect(getEditableSchoolUser).not.toHaveBeenCalled(); expect(editSchoolUser).not.toHaveBeenCalled();
});
it("loads and saves only with authenticated context, including the current version", async () => {
  expect(await loadSchoolUserEditAction(input)).toEqual({ status: "success", user: input });
  expect(await editSchoolUserAction(input)).toEqual({ status: "success" });
  expect(editSchoolUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "manager", authVersion: 3, schoolId: "school-a" }), input);
});
it("translates conflicts and never serializes unexpected database details", async () => {
  vi.mocked(editSchoolUser).mockRejectedValueOnce(new SchoolUserError("editConflict"));
  expect(await editSchoolUserAction(input)).toEqual({ status: "error", message: "errors.editConflict" });
  vi.mocked(getEditableSchoolUser).mockRejectedValueOnce(new Error("private SQL contact@example.invalid"));
  expect(await loadSchoolUserEditAction(input)).toEqual({ status: "error", message: "errors.editUnavailable" });
});
