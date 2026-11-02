import { execFileSync } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { config } from "dotenv";
import { assertTestDatabaseUrl } from "../src/test/database-safety";
export interface MigrationRehearsal { sql(statement: string): string; apply(name: string): void; before(name: string): void; restoreRoundTrip(): { tableCount: number; columnsMatch: boolean; rowCountsMatch: boolean; encryptedRoundTrip: boolean }; }
/** All objects are created in a new random local test database and removed on exit. */
export async function withMigrationRehearsal<T>(label: "tenant" | "financial" | "staff" | "session" | "removal" | "roles" | "assignments" | "overrides", run: (database: MigrationRehearsal) => Promise<T>): Promise<T> {
  config({ path: [".env.local", ".env"], quiet: true });
  const development = process.env.DATABASE_URL;
  config({ path: ".env.test.local", quiet: true });
  const test = new URL(assertTestDatabaseUrl(process.env.TEST_DATABASE_URL, development));
  if (!development) throw Error("Local provisioning credentials required");
  const admin = new URL(development);
  if (admin.protocol !== "mysql:" || !["localhost", "127.0.0.1", "[::1]"].includes(admin.hostname) || (admin.port || "3306") !== (test.port || "3306")) throw Error("A matching local provisioning server is required");
  const name = `edumoz_test_${label}_${randomBytes(6).toString("hex")}`;
  const connection = ["--protocol=TCP", "--host", admin.hostname.replace(/^\[|\]$/g, ""), "--port", admin.port || "3306", "--user", decodeURIComponent(admin.username)];
  function sql(statement: string, useDatabase = true, databaseName = name): string {
    return execFileSync("mariadb", [...connection, "--batch", "--skip-column-names", ...(useDatabase ? ["--database", databaseName] : [])], {
      input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, MYSQL_PWD: decodeURIComponent(admin.password) }, maxBuffer: 16 * 1024 * 1024,
    });
  }
  function restoreRoundTrip() {
    // Only this disposable database's synthetic fixtures are copied, entirely in memory.
    const dump = execFileSync("mariadb-dump", [...connection, "--single-transaction", name], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(admin.password) }, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
    const key = randomBytes(32), iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(cipher.getAuthTag());
    const restored = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (!restored.equals(dump)) throw new Error("Synthetic encrypted backup differs");
    const restoredName = `${name}_restore`;
    sql(`CREATE DATABASE \`${restoredName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`, false);
    try {
      sql(restored.toString("utf8"), true, restoredName);
      const tableSql = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;";
      const tables = sql(tableSql).trim().split("\n");
      if (sql(tableSql, true, restoredName) !== sql(tableSql)) throw new Error("Restored synthetic tables differ");
      const columns = "SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION;";
      if (sql(columns, true, restoredName) !== sql(columns)) throw new Error("Restored synthetic columns differ");
      for (const table of tables) {
        if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid synthetic table name");
        const count = `SELECT COUNT(*) FROM \`${table}\`;`;
        if (sql(count, true, restoredName) !== sql(count)) throw new Error("Restored synthetic row counts differ");
      }
      return { tableCount: tables.length, columnsMatch: true, rowCountsMatch: true, encryptedRoundTrip: true };
    } finally { sql(`DROP DATABASE \`${restoredName}\`;`, false); }
  }
  function apply(migration: string): void {
    if (!/^\d{14}_[a-z0-9_]+$/.test(migration)) throw Error("Invalid migration name");
    const source = readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8");
    const executable = source.replace(/((?:CREATE PROCEDURE|CREATE TRIGGER)[\s\S]*?\nEND);/g, (_match, block: string) => `DELIMITER $$\n${block}$$\nDELIMITER ;`);
    sql(executable);
  }
  sql(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`, false);
  try {
    return await run({ sql, apply, restoreRoundTrip, before(migration) { for (const candidate of readdirSync("prisma/migrations").filter(candidate => /^\d/.test(candidate) && candidate < migration).sort()) apply(candidate); } });
  } finally { sql(`DROP DATABASE \`${name}\`;`, false); }
}
export function rehearsalFailed(message: string, error: unknown): void {
  // Never print child-process errors: they may include connection details or SQL.
  console.error(message);
  if (error instanceof Error && !("stderr" in error)) console.error(error.message.replace(/mysql:\/\/\S+/g, "[database URL redacted]"));
  process.exitCode = 1;
}
