// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/tenant", () => ({ getTenantDb: vi.fn(() => { throw new Error("Unauthorized page attempted a database read"); }) }));
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("Unexpected redirect"); }),
  getPathname: ({ href }: { href: string }) => href,
  useRouter: () => ({ refresh: vi.fn() }),
  Link: () => null,
}));

const { auth } = await import("./config");
const { getTenantDb } = await import("@/lib/db/tenant");
const pages = [
  ["users", (await import("@/app/[locale]/(dashboard)/users/page")).default],
  ["students", (await import("@/app/[locale]/(dashboard)/students/page")).default],
  ["report cards", (await import("@/app/[locale]/(dashboard)/report-cards/page")).default],
  ["academic structure", (await import("@/app/[locale]/(dashboard)/academic/page")).default],
  ["staff", (await import("@/app/[locale]/(dashboard)/staff/page")).default],
  ["teachers", (await import("@/app/[locale]/(dashboard)/teachers/page")).default],
  ["assessment", (await import("@/app/[locale]/(dashboard)/assessment/page")).default],
  ["attendance report", (await import("@/app/[locale]/(dashboard)/attendance-report/page")).default],
  ["finance", (await import("@/app/[locale]/(dashboard)/finance/page")).default],
  ["receipt", (await import("@/app/[locale]/(dashboard)/finance/receipt/[id]/page")).default],
  ["timetables", (await import("@/app/[locale]/(dashboard)/timetables/page")).default],
  ["settings", (await import("@/app/[locale]/(dashboard)/settings/page")).default],
] as const;

describe("direct management page requests", () => {
  beforeEach(() => {
    vi.mocked(getTenantDb).mockClear();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "reader" }, schoolId: "school-a", isPlatformAdmin: false,
      role: "SCHOOL_MANAGER", permissionRoleId: "empty-role", permissions: [], memberships: [],
    } as never);
  });

  it.each(pages)("refuses %s before fetching protected data", async (_name, page) => {
    const result = await page({ params: Promise.resolve({ locale: "pt", id: "receipt" }), searchParams: Promise.resolve({}) } as never);
    expect(renderToStaticMarkup(result)).toMatch(/auth\.noAccess|forbidden/);
    expect(getTenantDb).not.toHaveBeenCalled();
  });
  it.each(pages)("refuses %s for an initial-password session before fetching protected data", async (_name, page) => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "new-holder" }, schoolId: null, isPlatformAdmin: false, role: null, permissionRoleId: null, permissions: [], memberships: [], passwordChangeRequired: true } as never);
    const result = await page({ params: Promise.resolve({ locale: "pt", id: "receipt" }), searchParams: Promise.resolve({}) } as never);
    expect(renderToStaticMarkup(result)).toMatch(/auth\.noAccess|forbidden/);
    expect(getTenantDb).not.toHaveBeenCalled();
  });
  it("refuses a teacher's direct student directory request without an administrative grant", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "teacher" }, schoolId: "school-a", isPlatformAdmin: false, role: "TEACHER", permissionsConfigured: true, permissions: [], memberships: [] } as never);
    const page = pages.find(([name]) => name === "students")![1];
    const result = await page({ params: Promise.resolve({ locale: "pt" }), searchParams: Promise.resolve({}) } as never);
    expect(renderToStaticMarkup(result)).toContain("auth.noAccess");
    expect(getTenantDb).not.toHaveBeenCalled();
  });
  it.each([
    { periodYear: "not-a-year" },
    { periodYear: "1e999" },
    { periodYear: "2026.5" },
    { periodYear: "1999" },
    { periodYear: "2026", periodMonth: "13" },
    { periodYear: "2026", periodMonth: "NaN" },
  ])("rejects malformed financial filters before any database read: %j", async (query) => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "manager" }, schoolId: "school-a", isPlatformAdmin: false, role: "SCHOOL_MANAGER", permissionRoleId: null, permissions: [], memberships: [] } as never);
    const page = pages.find(([name]) => name === "finance")![1];
    await expect(page({ params: Promise.resolve({ locale: "pt" }), searchParams: Promise.resolve({ turma: "class-a", ...query }) } as never)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(getTenantDb).not.toHaveBeenCalled();
  });

});
