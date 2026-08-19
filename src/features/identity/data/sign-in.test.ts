// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * `config.ts` (o `authConfig`/`jwt` callback que usa esta função) não corre sob Vitest —
 * `next-auth` importa `next/server`, que só existe dentro do runtime do Next. Por isso
 * `loadIsPlatformAdmin` é testada aqui, isolada, tal como `resolveActiveSchool` já é
 * testada em `access.test.ts` em vez de através do callback que a chama.
 */

const { prisma } = await import("@/lib/db/client");
const { loadIsPlatformAdmin } = await import("./sign-in");

describe("loadIsPlatformAdmin", () => {
  const suffix = `T${Date.now()}`;
  let adminUserId = "";
  let regularUserId = "";

  beforeAll(async () => {
    const adminUser = await prisma.user.create({
      data: { name: "Superadmin Teste", email: `superadmin.${suffix}@edumoz.co.mz`, isPlatformAdmin: true },
    });
    adminUserId = adminUser.id;

    const regularUser = await prisma.user.create({
      data: { name: "Utilizador Comum", email: `comum.${suffix}@edumoz.co.mz` },
    });
    regularUserId = regularUser.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, regularUserId] } } });
    await prisma.$disconnect();
  });

  it("devolve true para um utilizador com isPlatformAdmin", async () => {
    expect(await loadIsPlatformAdmin(adminUserId)).toBe(true);
  });

  it("devolve false para um utilizador comum", async () => {
    expect(await loadIsPlatformAdmin(regularUserId)).toBe(false);
  });

  it("devolve false para um utilizador inexistente, em vez de lançar", async () => {
    expect(await loadIsPlatformAdmin("utilizador-inexistente")).toBe(false);
  });
});
