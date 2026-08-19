// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db/client");
const { loadMembershipPermissions } = await import("./permissions");

describe("loadMembershipPermissions", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let restrictedUserId = "";
  let unrestrictedUserId = "";
  let roleId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `PR-${suffix}`, name: "Escola de teste (permissões)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;

    const [viewPermission] = await Promise.all([
      prisma.permission.upsert({
        where: { resource_action: { resource: "students", action: "view" } },
        update: {},
        create: { resource: "students", action: "view" },
      }),
    ]);

    const role = await prisma.permissionRole.create({
      data: {
        schoolId,
        name: `Director-adjunto-${suffix}`,
        permissions: { create: [{ permissionId: viewPermission.id }] },
      },
    });
    roleId = role.id;

    const restrictedUser = await prisma.user.create({
      data: { name: "Gestor restrito", email: `gestor.restrito.${suffix}@edumoz.co.mz` },
    });
    restrictedUserId = restrictedUser.id;
    await prisma.membership.create({
      data: { userId: restrictedUserId, schoolId, role: "SCHOOL_MANAGER", permissionRoleId: roleId },
    });

    const unrestrictedUser = await prisma.user.create({
      data: { name: "Gestor sem papel", email: `gestor.sem.papel.${suffix}@edumoz.co.mz` },
    });
    unrestrictedUserId = unrestrictedUser.id;
    await prisma.membership.create({
      data: { userId: unrestrictedUserId, schoolId, role: "SCHOOL_MANAGER" },
    });
  });

  afterAll(async () => {
    await prisma.membership.deleteMany({ where: { userId: { in: [restrictedUserId, unrestrictedUserId] } } });
    await prisma.permissionRole.delete({ where: { id: roleId } });
    await prisma.user.deleteMany({ where: { id: { in: [restrictedUserId, unrestrictedUserId] } } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  it("devolve o papel e as permissões marcadas para um gestor restrito", async () => {
    const result = await loadMembershipPermissions(schoolId, restrictedUserId);

    expect(result.permissionRoleId).toBe(roleId);
    expect(result.permissions).toEqual([{ resource: "students", action: "view" }]);
  });

  it("devolve permissionRoleId nulo e lista vazia para um gestor sem papel atribuído", async () => {
    const result = await loadMembershipPermissions(schoolId, unrestrictedUserId);

    expect(result.permissionRoleId).toBeNull();
    expect(result.permissions).toEqual([]);
  });

  it("devolve permissionRoleId nulo para um utilizador sem Membership de gestor nesta escola", async () => {
    const result = await loadMembershipPermissions(schoolId, "utilizador-inexistente");

    expect(result.permissionRoleId).toBeNull();
    expect(result.permissions).toEqual([]);
  });
});
