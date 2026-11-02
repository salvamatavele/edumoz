/** Idempotent reference data. Existing roles and grants are never changed. */
import { config } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSION_CATALOG } from "../src/features/identity/domain/permission-catalog";
import { seedPermissionCatalog } from "../src/lib/db/permission-catalog-seed";
import { assertTestDatabaseUrl } from "../src/test/database-safety";

config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("A database connection is required.");
  if (process.env.NODE_ENV === "test" && (assertTestDatabaseUrl(process.env.TEST_DATABASE_URL) !== url)) throw new Error("Test seeds must use the reserved test database.");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  try {
    await seedPermissionCatalog(prisma);
    console.log(`Permission catalog ready: ${PERMISSION_CATALOG.length} supported entries; no role grants changed.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Permission catalog initialization failed. No role grants were changed."); process.exitCode = 1; });
