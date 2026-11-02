import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

import { config } from "dotenv";

import { assertTestDatabaseUrl } from "../src/test/database-safety";

config({ path: [".env.local", ".env"], quiet: true });
const developmentUrl = process.env.DATABASE_URL;
config({ path: ".env.test.local", quiet: true });

function prepare() {
  let testUrl = process.env.TEST_DATABASE_URL;

  if (!testUrl) {
    if (existsSync(".env.test.local")) {
      throw new Error("Existing .env.test.local has no TEST_DATABASE_URL; refusing to overwrite it.");
    }
    if (!developmentUrl) throw new Error("DATABASE_URL is required for local provisioning.");
    const admin = new URL(developmentUrl);
    if (admin.protocol !== "mysql:" || !["localhost", "127.0.0.1", "[::1]"].includes(admin.hostname)) {
      throw new Error("Provisioning requires a local MySQL development connection.");
    }
    const databaseName = "edumoz_test";
    const username = `edumoz_test_${randomBytes(6).toString("hex")}`;
    const password = randomBytes(32).toString("hex");
    const target = new URL(admin);
    target.username = username;
    target.password = password;
    target.pathname = `/${databaseName}`;
    target.search = "";
    target.hash = "";
    testUrl = assertTestDatabaseUrl(target.toString(), developmentUrl);

    const args = [
      "--protocol=TCP", "--host", admin.hostname.replace(/^\[|\]$/g, ""),
      "--port", admin.port || "3306", "--user", decodeURIComponent(admin.username),
      "--batch", "--skip-column-names",
    ];
    const env = { ...process.env, MYSQL_PWD: decodeURIComponent(admin.password) };
    const existing = execFileSync("mariadb", args, {
      input: "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'edumoz_test';",
      encoding: "utf8", env, stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (existing) {
      throw new Error("edumoz_test already exists without configured credentials; refusing to adopt or reset it.");
    }
    // Values below are fixed or random hex, never user-controlled SQL identifiers.
    execFileSync("mariadb", args, {
      input: `CREATE DATABASE edumoz_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON \`edumoz\\_test\`.* TO '${username}'@'localhost';`,
      env, stdio: ["pipe", "pipe", "pipe"],
    });
    writeFileSync(".env.test.local", `TEST_DATABASE_URL=${JSON.stringify(testUrl)}\n`, { flag: "wx", mode: 0o600 });
    console.log("Created edumoz_test with a random account restricted to that database.");
  }

  assertTestDatabaseUrl(testUrl, developmentUrl);
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl },
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) throw new Error("Test migrations failed; no development migrations were executed.");
  const seed = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed-permissions.ts"], {
    env: { ...process.env, DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl, NODE_ENV: "test" }, stdio: "inherit",
  });
  if (seed.error || seed.status !== 0) throw new Error("Test permission catalog initialization failed.");
  console.log("Local test database and permission catalog are ready. Development data was not changed.");
}

try {
  prepare();
} catch (error) {
  // Child-process errors can contain passwords in the SQL input: never print them.
  console.error(error instanceof Error && !("stderr" in error)
    ? error.message.replace(/mysql:\/\/\S+/g, "[database URL redacted]")
    : "Local test database preparation failed. Check MariaDB connectivity and provisioning privileges.");
  process.exitCode = 1;
}
