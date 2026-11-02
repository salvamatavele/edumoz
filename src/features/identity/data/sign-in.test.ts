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


describe("credential authorization for accounts without email", () => {
  let schoolId = "";
  let userId = "";
  beforeAll(async () => {
    const school = await prisma.school.create({ data: { code: `PHONE-${Date.now()}`, name: "Synthetic phone sign-in", province: "Maputo", district: "KaMpfumu", allowedEmailDomain: "school.example.invalid" } });
    schoolId = school.id;
    const user = await prisma.user.create({ data: { phone: `+25884${Date.now()}`, name: "Synthetic phone account", memberships: { create: { schoolId, role: "GUARDIAN" } } } });
    userId = user.id;
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });
  it("finds a phone-only account and authorizes its authenticated identity", async () => {
    const { authoriseSignIn, findUserForCredentials } = await import("./sign-in");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect((await findUserForCredentials(user.phone!))?.id).toBe(userId);
    expect(await authoriseSignIn({ userId, email: null, emailVerified: false, provider: "credentials" })).toEqual({ allow: true, acceptInvitationIds: [] });
  });
  it("does not authorize credentials by an email alone or invent an identity", async () => {
    const { authoriseSignIn } = await import("./sign-in");
    expect((await authoriseSignIn({ email: "someone@example.invalid", emailVerified: true, provider: "credentials" })).allow).toBe(false);
    expect((await authoriseSignIn({ userId: "missing-user", email: null, emailVerified: true, provider: "credentials" })).allow).toBe(false);
  });
  it("still refuses a Google identity without a verified email", async () => {
    const { authoriseSignIn } = await import("./sign-in");
    expect((await authoriseSignIn({ userId, email: null, emailVerified: false, provider: "google" })).allow).toBe(false);
  });
  it("refuses inactive accounts and schools despite a correct credential identity", async () => {
    const { authoriseSignIn } = await import("./sign-in");
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    expect((await authoriseSignIn({ userId, email: null, emailVerified: true, provider: "credentials" })).allow).toBe(false);
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    await prisma.school.update({ where: { id: schoolId }, data: { isActive: false } });
    expect((await authoriseSignIn({ userId, email: null, emailVerified: true, provider: "credentials" })).allow).toBe(false);
  });
});
