// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/own-sessions", () => ({ revokeOwnSessions: vi.fn() }));
import { auth } from "@/lib/auth/config";
import { revokeOwnSessions } from "@/lib/auth/own-sessions";
import { revokeOwnSessionsAction } from "./own-sessions";
beforeEach(() => vi.resetAllMocks());
it("derives the owner exclusively from the verified session", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "owner", authVersion: 3, authSessionId: "current" } } as never);
  expect(await revokeOwnSessionsAction({ id: "target", userId: "forged" } as never)).toEqual({ status: "success" });
  expect(revokeOwnSessions).toHaveBeenCalledWith({ userId: "owner", authVersion: 3, authSessionId: "current" }, { id: "target", userId: "forged" });
});
it("allows cookie clearing for an already-invalid session but refuses management", async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  expect(await revokeOwnSessionsAction("current")).toEqual({ status: "success" });
  expect(await revokeOwnSessionsAction("others")).toMatchObject({ status: "error" });
  expect(revokeOwnSessions).not.toHaveBeenCalled();
});
it("does not report a failed database commit as success", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "owner", authVersion: 3, authSessionId: "current" } } as never);
  vi.mocked(revokeOwnSessions).mockRejectedValue(new Error("Database"));
  expect(await revokeOwnSessionsAction("current")).toMatchObject({ status: "error" });
});
