import { describe, expect, it } from "vitest";

import { hasSessionTokenCookie } from "./session-cookie";

describe("optimistic session cookie presence", () => {
  it.each(["authjs.session-token", "__Secure-authjs.session-token"])("accepts complete and chunked %s", (name) => {
    expect(hasSessionTokenCookie([name])).toBe(true);
    expect(hasSessionTokenCookie([`${name}.0`, `${name}.1`])).toBe(true);
  });

  it("ignores unrelated cookies and incomplete chunk sets", () => {
    expect(hasSessionTokenCookie([])).toBe(false);
    expect(hasSessionTokenCookie(["other-session", "authjs.session-token.1", "authjs.session-token.invalid"])).toBe(false);
  });
});
