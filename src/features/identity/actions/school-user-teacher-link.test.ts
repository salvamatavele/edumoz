// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/identity/data/school-user-teacher-link", () => ({ getSchoolUserTeacherLink: vi.fn(), previewSchoolUserTeacherLink: vi.fn(), changeSchoolUserTeacherLink: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
const { auth } = await import("@/lib/auth/config");
const dal = await import("../data/school-user-teacher-link");
const actions = await import("./school-user-teacher-link");
const input = { userId: "shared", expectedSchoolId: "school-a", expectedRevision: "a".repeat(64), expectedTeacherId: null, expectedTeacherRevision: null, teacherId: null, teacherRevision: null, teacherCode: "CODE" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: "manager", authVersion: 2 }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never); });
it.each([actions.loadTeacherLinkAction, actions.previewTeacherLinkAction, actions.changeTeacherLinkAction])("refuses a different school before accessing data", async action => {
  expect(await action({ ...input, expectedSchoolId: "school-b" })).toEqual({ status: "error", message: "errors.schoolChanged" });
  for (const fn of Object.values(dal)) expect(fn).not.toHaveBeenCalled();
});
it("uses the authenticated scope and current auth version for all steps", async () => {
  await actions.loadTeacherLinkAction(input); await actions.previewTeacherLinkAction(input); await actions.changeTeacherLinkAction(input);
  for (const fn of Object.values(dal)) expect(fn).toHaveBeenCalledWith(expect.objectContaining({ schoolId: "school-a", userId: "manager", authVersion: 2 }), input);
});
it("does not expose a database error or foreign profile name", async () => {
  vi.mocked(dal.previewSchoolUserTeacherLink).mockRejectedValue(new Error("Private foreign teacher/code/query"));
  expect(await actions.previewTeacherLinkAction(input)).toEqual({ status: "error", message: "errors.linkUnavailable" });
});
