/**
 * Semeia o catálogo fixo de `Permission` — ao contrário de `seed.ts` (que só corre uma
 * vez, contra uma base vazia), este script é idempotente: pode correr em qualquer altura,
 * em qualquer ambiente, sem apagar nem duplicar nada. É o que faz sentido para um
 * catálogo que só cresce quando o próprio código ganha uma verificação nova.
 *
 * Correr com: pnpm db:seed:permissions
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSION_CATALOG } from "../src/features/identity/domain/permission-catalog";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
});

async function main() {
  const before = await prisma.permission.count();

  for (const entry of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: entry.resource, action: entry.action } },
      update: {},
      create: { resource: entry.resource, action: entry.action },
    });
  }

  const after = await prisma.permission.count();
  console.log(`Catálogo de permissões: ${PERMISSION_CATALOG.length} combinações, ${after - before} novas.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
