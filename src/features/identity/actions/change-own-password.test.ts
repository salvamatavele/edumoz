// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/change-password", () => ({ changeOwnPassword: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
const { auth } = await import("@/lib/auth/config");
const { changeOwnPassword } = await import("@/lib/auth/change-password");
const { changeOwnPasswordAction } = await import("./change-own-password");
const { PasswordChangeError } = await import("@/features/identity/domain/change-password");
const input = { currentPassword: "old synthetic password", newPassword: "new synthetic password", confirmPassword: "new synthetic password" };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(changeOwnPassword).mockResolvedValue(undefined); });
it("requires an authenticated holder before reaching the DAL", async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  expect(await changeOwnPasswordAction(input)).toEqual({ status: "error", message: "errors.forbidden" });
  expect(changeOwnPassword).not.toHaveBeenCalled();
});
it("takes identity and version exclusively from auth, even without an active school", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder", authVersion: 3 }, schoolId: null } as never);
  await changeOwnPasswordAction({ ...input, userId: "victim", authVersion: 99 } as typeof input);
  expect(changeOwnPassword).toHaveBeenCalledWith({ userId: "holder", authVersion: 3 }, expect.objectContaining(input));
});
it("translates domain errors and hides unexpected error details", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "holder", authVersion: 0 } } as never);
  vi.mocked(changeOwnPassword).mockRejectedValueOnce(new PasswordChangeError("currentPassword"));
  expect(await changeOwnPasswordAction(input)).toEqual({ status: "error", message: "errors.currentPassword" });
  vi.mocked(changeOwnPassword).mockRejectedValueOnce(Error("private database credentials"));
  expect(await changeOwnPasswordAction(input)).toEqual({ status: "error", message: "errors.unavailable" });
});
