// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeAuthLogger } from "./safe-logger";

describe("redacted authentication logging", () => {
  afterEach(() => vi.restoreAllMocks());
  it("does not emit error messages, causes, database URLs or credentials", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(new Error("mysql://user:secret@db/private"), { name: "JWTSessionError", cause: { password: "private-password", token: "private-token" } });
    safeAuthLogger.error(failure);
    expect(error).toHaveBeenCalledWith("[auth] operation failed", "JWTSessionError");
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/private|mysql|secret/);
  });
  it("replaces unrecognized error names and warning contents", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    safeAuthLogger.error(Object.assign(new Error(), { name: "private-user@example.invalid" }));
    safeAuthLogger.warn("private-token");
    expect(error).toHaveBeenCalledWith("[auth] operation failed", "AuthError");
    expect(warn).toHaveBeenCalledWith("[auth] warning", "AuthWarning");
  });
});
