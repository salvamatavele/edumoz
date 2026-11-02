const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Validate a disposable local target without including credentials in errors. */
export function assertTestDatabaseUrl(
  testDatabaseUrl: string | undefined,
  developmentDatabaseUrl?: string,
): string {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required. Run npm run db:test:prepare first.");
  }

  let target: URL;
  try {
    target = new URL(testDatabaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid local MySQL URL.");
  }

  if (
    target.protocol !== "mysql:" ||
    !LOCAL_HOSTS.has(target.hostname) ||
    !/^\/edumoz_test(?:_[a-z0-9]+)*$/.test(target.pathname) ||
    !/^edumoz_test_[a-z0-9]+$/.test(target.username) ||
    target.search || target.hash
  ) {
    throw new Error(
      "Tests require a local edumoz_test database and a dedicated edumoz_test_* account without URL options.",
    );
  }

  if (developmentDatabaseUrl) {
    let development: URL;
    try {
      development = new URL(developmentDatabaseUrl);
    } catch {
      throw new Error("The development database URL is invalid; isolation cannot be verified.");
    }
    // All accepted hosts are loopback aliases; changing an alias must not bypass isolation.
    if (
      LOCAL_HOSTS.has(development.hostname) &&
      (development.port || "3306") === (target.port || "3306") &&
      decodeURIComponent(development.pathname).toLowerCase() === target.pathname.toLowerCase()
    ) {
      throw new Error("The test database must differ from the development database.");
    }
  }

  return testDatabaseUrl;
}
