import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma cru — SEM filtro de escola.
 *
 * Só deve ser importado dentro de `src/lib/db/` e pelo seed. O código de aplicação usa
 * `getTenantDb(schoolId)` de `./tenant`, que garante o isolamento entre escolas.
 * Ver docs/specs/domain-foundation.md §3.1.
 */
function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL não está definida. Copie .env.example para .env e preencha-a.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(url),
  });
}

/**
 * Em desenvolvimento o hot reload do Next recria os módulos a cada alteração; sem este
 * cache global abrir-se-ia uma pool de ligações nova de cada vez até esgotar o MariaDB.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
