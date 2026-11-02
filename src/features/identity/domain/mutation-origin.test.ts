import { describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "./mutation-origin";
describe("mutation origin", () => {
  it.each([null, "null", "https://school.example.invalid.evil.invalid", "https://user:password@school.example.invalid", "https://school.example.invalid/path", "https://school.example.invalid?x=1", "//school.example.invalid", "data:text/plain,hello"])("refuses an invalid origin %s", (origin) => {
    expect(isTrustedMutationOrigin(origin, "https://school.example.invalid")).toBe(false);
  });
  it("compares the public scheme, hostname and port", () => {
    expect(isTrustedMutationOrigin("https://school.example.invalid", "https://school.example.invalid/api/auth")).toBe(true);
    expect(isTrustedMutationOrigin("http://school.example.invalid", "https://school.example.invalid")).toBe(false);
    expect(isTrustedMutationOrigin("https://school.example.invalid:8443", "https://school.example.invalid")).toBe(false);
  });
});
