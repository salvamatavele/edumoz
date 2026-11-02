// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/academic/data/attendance", () => ({ findTeacherByUserId: vi.fn(), getAttendanceRoster: vi.fn(), todayInMaputo: () => new Date("2026-03-02") }));
vi.mock("@/features/academic/ui/attendance-sheet", () => ({ AttendanceSheet: () => null }));
const { auth } = await import("./config");
const { findTeacherByUserId, getAttendanceRoster } = await import("@/features/academic/data/attendance");
const Page = (await import("@/app/[locale]/(dashboard)/attendance/[scheduleEntryId]/page")).default;
beforeEach(() => {
  vi.mocked(findTeacherByUserId).mockResolvedValue(null);
  vi.mocked(getAttendanceRoster).mockReset();
});
it.each(["GUARDIAN", "STUDENT", "SCHOOL_MANAGER"])("refuses direct roster access for restricted %s before reading classmates", async (role) => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "viewer" }, schoolId: "school-a", role, isPlatformAdmin: false, memberships: [], permissionRoleId: "restricted", permissions: [] } as never);
  const page = await Page({ params: Promise.resolve({ locale: "pt", scheduleEntryId: "known-id" }), searchParams: Promise.resolve({}) });
  expect(renderToStaticMarkup(page)).toContain("auth.noAccess");
  expect(getAttendanceRoster).not.toHaveBeenCalled();
});
it("keeps an authorized manager read-only while allowing an explicit reopen grant", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "manager" }, schoolId: "school-a", role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null, permissions: [] } as never);
  vi.mocked(getAttendanceRoster).mockResolvedValue({ teachingGroupId: "group", teachingGroupName: "10A", subjectName: "Math", sessionId: "session", sessionStatus: "SUBMITTED", entries: [], isOwn: false });
  const page = await Page({ params: Promise.resolve({ locale: "pt", scheduleEntryId: "known-id" }), searchParams: Promise.resolve({}) });
  expect(page.props).toMatchObject({ readOnly: true, canReopen: true });
});
