// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/features/academic/data/report-cards", () => ({ listReportCardFilters: vi.fn(), getReportCard: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn(() => { throw new Error("Unexpected redirect"); }) }));
const { auth } = await import("./config");
const { listReportCardFilters, getReportCard } = await import("@/features/academic/data/report-cards");
const Page = (await import("@/app/[locale]/(dashboard)/report-cards/page")).default;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listReportCardFilters).mockResolvedValue({ classGroups: [], subjects: [], terms: [] });
  vi.mocked(getReportCard).mockResolvedValue({ status: "not-found" });
});
it.each([false, true])("passes teacher ownership unless an administrative report grant exists: %s", async granted => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "teacher" }, schoolId: "school-a", role: "TEACHER", isPlatformAdmin: false, memberships: [], permissionsConfigured: true, permissions: granted ? [{ resource: "report-cards", action: "view" }] : [] } as never);
  await Page({ params: Promise.resolve({ locale: "pt" }), searchParams: Promise.resolve({ turma: "class", disciplina: "subject", periodo: "term" }) });
  const owner = granted ? undefined : "teacher";
  expect(listReportCardFilters).toHaveBeenCalledWith("school-a", owner);
  expect(getReportCard).toHaveBeenCalledWith("school-a", "class", "subject", "term", owner);
});
