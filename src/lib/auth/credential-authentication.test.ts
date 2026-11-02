// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/features/identity/data/sign-in", () => ({ findUserForCredentials: vi.fn() }));
vi.mock("./credential-throttle", () => ({ consumeCredentialAttempt: vi.fn(), resetCredentialAttempts: vi.fn() }));
vi.mock("./password", () => ({ hashPassword: vi.fn(async () => "dummy-argon2-hash"), verifyPassword: vi.fn() }));
vi.mock("./safe-logger", () => ({ safeAuthLogger: { error: vi.fn() } }));
const { authenticateCredentials } = await import("./credential-authentication");
const { consumeCredentialAttempt, resetCredentialAttempts } = await import("./credential-throttle");
const { findUserForCredentials } = await import("@/features/identity/data/sign-in");
const { verifyPassword } = await import("./password");
const { safeAuthLogger } = await import("./safe-logger");
const user = { id: "account", name: "Synthetic", email: null, image: null, passwordHash: "actual-argon2-hash", isPlatformAdmin: false, authVersion: 0, passwordChangeRequired: false, passwordExpiresAt: null };

describe("bounded credential verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consumeCredentialAttempt).mockResolvedValue(true);
    vi.mocked(findUserForCredentials).mockResolvedValue(user);
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });
  it("checks the budget before looking up the identity or hashing", async () => {
    vi.mocked(consumeCredentialAttempt).mockResolvedValue(false);
    expect(await authenticateCredentials({ identifier: "840000111", password: "Synthetic-Only!" })).toBeNull();
    expect(findUserForCredentials).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });
  it("performs a password check for a missing account without authorizing it", async () => {
    vi.mocked(findUserForCredentials).mockResolvedValue(null);
    expect(await authenticateCredentials({ identifier: "missing@example.invalid", password: "Synthetic-Only!" })).toBeNull();
    expect(verifyPassword).toHaveBeenCalledWith("Synthetic-Only!", "dummy-argon2-hash");
    expect(resetCredentialAttempts).not.toHaveBeenCalled();
  });
  it("refuses a bad password without clearing the budget", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    expect(await authenticateCredentials({ identifier: "840000111", password: "bad-password" })).toBeNull();
    expect(resetCredentialAttempts).not.toHaveBeenCalled();
  });
  it("returns a minimal phone-only identity and clears only its budget", async () => {
    expect(await authenticateCredentials({ identifier: "840000111", password: "Synthetic-Only!" })).toEqual({ id: "account", name: "Synthetic", email: null, image: null, authVersion: 0 });
    expect(resetCredentialAttempts).toHaveBeenCalledWith("840000111");
  });
  it("fails closed without logging a database error payload", async () => {
    vi.mocked(consumeCredentialAttempt).mockRejectedValue(Error("mysql://private:secret@host/db"));
    expect(await authenticateCredentials({ identifier: "840000111", password: "Synthetic-Only!" })).toBeNull();
    expect(findUserForCredentials).not.toHaveBeenCalled();
    expect(safeAuthLogger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "Credential authentication unavailable" }));
  });
  it.each([{ identifier: {}, password: "test" }, { identifier: "", password: "test" }, { identifier: "x".repeat(255), password: "test" }, { identifier: "840000111", password: "x".repeat(1025) }])("refuses malformed or oversized credentials before database work", async (credentials) => {
    expect(await authenticateCredentials(credentials)).toBeNull();
    expect(consumeCredentialAttempt).not.toHaveBeenCalled();
  });
});
