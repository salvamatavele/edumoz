import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { config } from "dotenv";

import { assertTestDatabaseUrl } from "../src/test/database-safety";

config({ path: [".env.local", ".env"], quiet: true });
const developmentUrl = process.env.DATABASE_URL;
config({ path: ".env.test.local", quiet: true });

function connectionArgs(url: URL) {
  return ["--protocol=TCP", "--host", url.hostname.replace(/^\[|\]$/g, ""),
    "--port", url.port || "3306", "--user", decodeURIComponent(url.username)];
}

function query(url: URL, database: string | null, sql: string): string {
  return execFileSync("mariadb", [
    ...connectionArgs(url), "--batch", "--skip-column-names",
    ...(database ? ["--database", database] : []),
  ], { input: sql, encoding: "utf8", env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
    stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
}

function verify() {
  const test = new URL(assertTestDatabaseUrl(process.env.TEST_DATABASE_URL, developmentUrl));
  if (!developmentUrl) throw new Error("Local provisioning credentials are required for the recovery rehearsal.");
  const admin = new URL(developmentUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(admin.hostname) || admin.protocol !== 'mysql:') {
    throw new Error("Recovery rehearsal requires local administrative access.");
  }
  assert.equal(admin.port || "3306", test.port || "3306", "Development and test servers must use the same local port.");
  const sourceName = test.pathname.slice(1);
  const suffix = randomBytes(8).toString("hex");
  const restoredName = `edumoz_test_restore_${suffix}`;
  const schoolId = `recovery-${suffix}`;
  const directory = `.local/recovery/${suffix}`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  query(test, sourceName, `INSERT INTO School (id,code,name,province,district,updatedAt)
VALUES ('${schoolId}','${schoolId}','Synthetic recovery fixture','Maputo','KaMpfumu',NOW());`);

  try {
    const dump = execFileSync("mariadb-dump", [
      ...connectionArgs(test), "--single-transaction", "--skip-add-drop-table", sourceName,
    ], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(test.password) },
      stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encryptedDump = Buffer.concat([cipher.update(dump), cipher.final()]);
    writeFileSync(`${directory}/database.aes`, Buffer.concat([iv, cipher.getAuthTag(), encryptedDump]), { mode: 0o600 });
    // A production backup must keep its key in a separate secrets store.
    writeFileSync(`${directory}/rehearsal.key`, key, { mode: 0o600 });
    const syntheticFile = Buffer.from(`Synthetic private attachment ${suffix}\n`);
    const fileIv = randomBytes(12);
    const fileCipher = createCipheriv("aes-256-gcm", key, fileIv);
    const encryptedFile = Buffer.concat([fileCipher.update(syntheticFile), fileCipher.final()]);
    writeFileSync(`${directory}/storage.aes`, Buffer.concat([fileIv, fileCipher.getAuthTag(), encryptedFile]), { mode: 0o600 });

    function decrypt(path: string) {
      const bytes = readFileSync(path);
      const decipher = createDecipheriv("aes-256-gcm", readFileSync(`${directory}/rehearsal.key`), bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    }
    assert.deepEqual(decrypt(`${directory}/storage.aes`), syntheticFile);
    writeFileSync(`${directory}/restored-attachment.txt`, decrypt(`${directory}/storage.aes`), { mode: 0o600 });

    query(admin, null, `CREATE DATABASE \`${restoredName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    query(admin, restoredName, decrypt(`${directory}/database.aes`).toString("utf8"));
    const tableQuery = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;";
    const tables = query(test, sourceName, tableQuery).trim().split("\n");
    assert.deepEqual(query(admin, restoredName, tableQuery).trim().split("\n"), tables);
    for (const table of tables) {
      assert.match(table, /^[a-zA-Z0-9_]+$/);
      const countSql = `SELECT COUNT(*) FROM \`${table}\`;`;
      assert.equal(query(admin, restoredName, countSql), query(test, sourceName, countSql));
    }
    const columnsQuery = "SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION;";
    assert.equal(query(admin, restoredName, columnsQuery), query(test, sourceName, columnsQuery));
    const fixtureSql = `SELECT id,code,name,province,district FROM School WHERE id='${schoolId}';`;
    assert.equal(query(admin, restoredName, fixtureSql), query(test, sourceName, fixtureSql));
    const report = { restoredDatabase: restoredName, tableCount: tables.length,
      rowCountsMatch: true, columnsMatch: true, syntheticFixtureMatch: true,
      encryptedDatabaseRestored: true, encryptedAttachmentRestored: true };
    writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ ...report, evidenceDirectory: directory }));
  } finally {
    query(test, sourceName, `DELETE FROM School WHERE id='${schoolId}';`);
  }
}

try { verify(); } catch {
  console.error("Synthetic recovery rehearsal failed. No development restore was attempted; inspect local configuration and privileges.");
  process.exitCode = 1;
}
