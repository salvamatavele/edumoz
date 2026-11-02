// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/own-sessions", () => ({ listOwnSessions: vi.fn(async () => []) }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/features/identity/ui/own-sessions-panel", () => ({ OwnSessionsPanel: () => null }));
import { auth } from "./config";
import { listOwnSessions } from "./own-sessions";
import { redirect } from "@/i18n/navigation";
import SessionsPage from "@/app/[locale]/(dashboard)/account/sessions/page";
beforeEach(() => vi.clearAllMocks());
it("refuses anonymous access before reading the registry", async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  await SessionsPage({ params: Promise.resolve({ locale: "pt" }), searchParams: Promise.resolve({}) });
  expect(redirect).toHaveBeenCalledWith({ href: "/sign-in", locale: "pt" });
  expect(listOwnSessions).not.toHaveBeenCalled();
});
it("requires initial credential replacement before listing other sessions", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "owner", authSessionId: "signed" }, passwordChangeRequired: true } as never);
  await SessionsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });
  expect(redirect).toHaveBeenCalledWith({ href: "/account/password", locale: "en" });
  expect(listOwnSessions).not.toHaveBeenCalled();
});
