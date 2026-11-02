// @vitest-environment node
import { describe, expect, it } from "vitest";

import { assertTestDatabaseUrl } from "./database-safety";

const safe = "mysql://edumoz_test_runner:private@127.0.0.1:3306/edumoz_test";

describe("test database safety", () => {
  it("accepts a dedicated local database distinct from development", () => {
    expect(assertTestDatabaseUrl(safe, "mysql://dev:secret@localhost/edumoz")).toBe(safe);
  });

  it.each([
    undefined, "not a url", safe.replace("mysql:", "postgresql:"),
    safe.replace("127.0.0.1", "school.example"),
    safe.replace("/edumoz_test", "/esagrada"),
    safe.replace("/edumoz_test", "/edumoz"),
    safe.replace("edumoz_test_runner:", "root:"),
    `${safe}?socketPath=/tmp/mysql.sock`, `${safe}#options`,
    safe.replace("/edumoz_test", "/edumoz_test/other"),
  ])("rejects unsafe or missing target %# without exposing credentials", (target) => {
    expect(() => assertTestDatabaseUrl(target)).toThrow();
    try { assertTestDatabaseUrl(target); } catch (error) {
      expect(String(error)).not.toContain("private");
    }
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("rejects the development database via %s", (host) => {
    expect(() => assertTestDatabaseUrl(safe, `mysql://dev:secret@${host}/edumoz_test`)).toThrow(/differ/);
  });

  it("rejects encoded aliases of the development database name", () => {
    expect(() => assertTestDatabaseUrl(safe, "mysql://dev:secret@localhost/%65dumoz_test")).toThrow(/differ/);
  });

  it("rejects an invalid development URL", () => {
    expect(() => assertTestDatabaseUrl(safe, "invalid")).toThrow(/isolation/);
  });
});
