// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hasPermission } from "@/features/identity/domain/access";

const { prisma } = await import("@/lib/db/client");
const { loadEffectiveSessionAccess } = await import("./session-access");

describe("effective session access", () => {
  let schoolA = "";
  let schoolB = "";
  let userId = "";
  let membershipId = "";
  let roleId = "";
  let foreignRoleId = "";
  let viewId = "";

  beforeAll(async () => {
    const suffix = randomUUID();
    const schools = await Promise.all(["A", "B"].map((code) => prisma.school.create({
      data: { code: `ACCESS-${code}-${suffix}`, name: `Synthetic school ${code}`, province: "Maputo", district: "KaMpfumu" },
    })));
    [schoolA, schoolB] = schools.map((school) => school.id);
    const user = await prisma.user.create({ data: { name: "Synthetic manager" } });
    userId = user.id;
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource: "students", action: "view" } }, update: {},
      create: { resource: "students", action: "view" },
    });
    viewId = permission.id;
    roleId = (await prisma.permissionRole.create({ data: { schoolId: schoolA, name: "Reader" } })).id;
    foreignRoleId = (await prisma.permissionRole.create({
      data: { schoolId: schoolB, name: "Foreign reader", permissions: { create: { permissionId: viewId } } },
    })).id;
    membershipId = (await prisma.membership.create({
      data: { userId, schoolId: schoolA, role: "SCHOOL_MANAGER", permissionRoleId: roleId },
    })).id;
  });

  beforeEach(async () => {
    await prisma.user.update({ where: { id: userId }, data: { isActive: true, isPlatformAdmin: false } });
    await prisma.school.update({ where: { id: schoolA }, data: { isActive: true } });
    await prisma.membership.update({ where: { id: membershipId }, data: { status: "ACTIVE", permissionRoleId: roleId } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.create({ data: { roleId, permissionId: viewId } });
  });

  afterAll(async () => {
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.school.deleteMany({ where: { id: { in: [schoolA, schoolB] } } });
    await prisma.$disconnect();
  });

  it("loads current permissions and selects the initial school", async () => {
    const access = await loadEffectiveSessionAccess(userId);
    expect(access?.schoolId).toBe(schoolA);
    expect(access?.permissions).toEqual([{ resource: "students", action: "view" }]);
    expect(hasPermission(access!, "students", "create")).toBe(false);
  });

  it("rejects inactive or missing accounts", async () => {
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    expect(await loadEffectiveSessionAccess(userId, schoolA)).toBeNull();
    expect(await loadEffectiveSessionAccess("missing", schoolA)).toBeNull();
    expect(await loadEffectiveSessionAccess("", schoolA)).toBeNull();
  });

  it("revokes a suspended membership on the next read", async () => {
    expect((await loadEffectiveSessionAccess(userId, schoolA))?.schoolId).toBe(schoolA);
    await prisma.membership.update({ where: { id: membershipId }, data: { status: "SUSPENDED" } });
    const access = await loadEffectiveSessionAccess(userId, schoolA);
    expect(access?.schoolId).toBeNull();
    expect(access?.role).toBeNull();
    expect(access?.memberships).toEqual([]);
  });

  it("revokes a deactivated school on the next read", async () => {
    await prisma.school.update({ where: { id: schoolA }, data: { isActive: false } });
    expect((await loadEffectiveSessionAccess(userId, schoolA))?.schoolId).toBeNull();
  });

  it("reloads permission removal without a new login", async () => {
    expect(hasPermission((await loadEffectiveSessionAccess(userId, schoolA))!, "students", "view")).toBe(true);
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    expect(hasPermission((await loadEffectiveSessionAccess(userId, schoolA))!, "students", "view")).toBe(false);
  });

  it("rejects persisted permission roles from another school", async () => {
    await expect(prisma.membership.update({ where: { id: membershipId }, data: { permissionRoleId: foreignRoleId } })).rejects.toThrow(/TENANT_INTEGRITY/);
    const access = await loadEffectiveSessionAccess(userId, schoolA);
    expect(access?.permissionRoleId).toBe(roleId);
  });

  it("preserves unrestricted access for a valid manager without a configured role", async () => {
    await prisma.membership.update({ where: { id: membershipId }, data: { permissionRoleId: null } });
    expect(hasPermission((await loadEffectiveSessionAccess(userId, schoolA))!, "students", "create")).toBe(true);
  });

  it("does not switch to another school when the requested school is unauthorized", async () => {
    const access = await loadEffectiveSessionAccess(userId, schoolB);
    expect(access?.schoolId).toBeNull();
    expect(access?.role).toBeNull();
    expect(access?.permissions).toEqual([]);
  });

  it("allows a current platform administrator without membership and immediately reflects revocation", async () => {
    await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: true } });
    const access = await loadEffectiveSessionAccess(userId, schoolB);
    expect(access?.schoolId).toBe(schoolB);
    expect(access?.role).toBeNull();
    expect(hasPermission(access!, "students", "create")).toBe(true);
    await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
    const revoked = await loadEffectiveSessionAccess(userId, schoolB);
    expect(revoked?.schoolId).toBeNull();
    expect(revoked?.isPlatformAdmin).toBe(false);
  });

  it("does not grant a platform administrator a missing or inactive school", async () => {
    await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: true } });
    await prisma.school.update({ where: { id: schoolA }, data: { isActive: false } });
    expect((await loadEffectiveSessionAccess(userId, schoolA))?.schoolId).toBeNull();
    expect((await loadEffectiveSessionAccess(userId, "missing"))?.schoolId).toBeNull();
  });
});
