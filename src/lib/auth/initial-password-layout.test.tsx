// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
const { navigation } = vi.hoisted(() => ({ navigation: vi.fn() }));
vi.mock("@/components/layout/dashboard-shell", () => ({ DashboardShell: ({ children, navItems }: { children: ReactNode; navItems: { href: string; label: string }[] }) => { navigation(navItems); return <main>{children}</main>; } }));
vi.mock("@/features/identity/ui/change-password-form", () => ({ ChangePasswordForm: () => <form aria-label="Required password change" /> }));
const { auth } = await import("./config");
const { default: Layout } = await import("@/app/[locale]/(dashboard)/layout");
beforeEach(() => { vi.clearAllMocks(); });
it("replaces dashboard children with the mandatory form while the initial credential is in use", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: null, role: null, memberships: [], isPlatformAdmin: false, passwordChangeRequired: true } as never);
  const view = await Layout({ params: Promise.resolve({ locale: "en" }), children: <p>Protected dashboard data</p> });
  const html = renderToStaticMarkup(view);
  expect(html).toContain("Required password change");
  expect(html).toContain("passwordChange.initialRequired");
  expect(html).not.toContain("Protected dashboard data");
});
it("preserves the normal dashboard after the obligation is cleared", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: "school-a", role: "TEACHER", memberships: [], isPlatformAdmin: false, passwordChangeRequired: false } as never);
  const view = await Layout({ params: Promise.resolve({ locale: "pt" }), children: <p>Authorized dashboard data</p> });
  expect(renderToStaticMarkup(view)).toContain("Authorized dashboard data");
  expect(renderToStaticMarkup(view)).not.toContain("Required password change");
});

it("keeps teacher routes and adds only explicitly granted administrative navigation", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: "school-a", role: "TEACHER", memberships: [], isPlatformAdmin: false, passwordChangeRequired: false, permissionsConfigured: true, permissions: [{ resource: "users", action: "view" }] } as never);
  renderToStaticMarkup(await Layout({ params: Promise.resolve({ locale: "pt" }), children: <p>Teacher</p> }));
  const paths = navigation.mock.calls.at(-1)![0].map((item: { href: string }) => item.href);
  expect(paths).toEqual(expect.arrayContaining(["/attendance", "/grades", "/report-cards", "/my-timetable", "/users"]));
  expect(paths).not.toContain("/finance"); expect(paths).not.toContain("/settings");
  expect(new Set(paths).size).toBe(paths.length);
});
it("does not expose settings or users for configured empty restrictions without a legacy bridge", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: "school-a", role: "SCHOOL_MANAGER", memberships: [], isPlatformAdmin: false, passwordChangeRequired: false, permissionRoleId: null, permissionsConfigured: true, permissions: [] } as never);
  renderToStaticMarkup(await Layout({ params: Promise.resolve({ locale: "pt" }), children: <p>Restricted</p> }));
  expect(navigation.mock.calls.at(-1)![0].map((item: { href: string }) => item.href)).toEqual(["/account/password", "/account/sessions"]);
});
it("preserves owned teacher navigation when the holder also administers the platform", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder" }, schoolId: "school-a", role: "TEACHER", memberships: [], isPlatformAdmin: true, passwordChangeRequired: false, permissionsConfigured: false, permissions: [] } as never);
  renderToStaticMarkup(await Layout({ params: Promise.resolve({ locale: "pt" }), children: <p>Teacher</p> }));
  const paths = navigation.mock.calls.at(-1)![0].map((item: { href: string }) => item.href);
  expect(paths).toEqual(expect.arrayContaining(["/attendance", "/grades", "/users", "/settings"]));
  expect(new Set(paths).size).toBe(paths.length);
});
