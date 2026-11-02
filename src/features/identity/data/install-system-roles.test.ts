// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionContext } from "../domain/access";
import { SYSTEM_ROLE_DEFINITIONS } from "../domain/system-role-catalog";
import { installSchoolSystemRoles } from "./install-system-roles";
const { prisma } = await import("@/lib/db/client");

describe("school system role defaults", () => {
  const schools: string[] = [], users: string[] = [];
  let schoolB = "";
  beforeAll(async () => { schoolB = (await fixture()).schoolId; });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.school.deleteMany({ where: { id: { in: schools } } });
    await prisma.$disconnect();
  });
  async function fixture(): Promise<SessionContext & { schoolId: string }> {
    const school = await prisma.school.create({ data: { code: `SYSTEM-DEFAULTS-${randomUUID()}`, name: "Synthetic defaults school", province: "Maputo", district: "KaMpfumu" } });
    schools.push(school.id);
    const actor = await prisma.user.create({ data: { name: "Synthetic defaults manager", memberships: { create: { schoolId: school.id, role: "SCHOOL_MANAGER" } } } });
    users.push(actor.id);
    return { userId: actor.id, schoolId: school.id, authVersion: 0, isPlatformAdmin: false, role: "SCHOOL_MANAGER", permissionRoleId: null, memberships: [], permissions: [] };
  }
  it("creates nine local protected defaults without assigning or changing people", async () => {
    const context = await fixture();
    const before = await prisma.membership.findMany({ where: { schoolId: context.schoolId } });
    expect(await installSchoolSystemRoles(context, context.schoolId)).toEqual({ created: 9 });
    const roles = await prisma.permissionRole.findMany({ where: { schoolId: context.schoolId }, orderBy: { sortOrder: "asc" } });
    expect(roles.map(row => row.name)).toEqual(SYSTEM_ROLE_DEFINITIONS.map(row => row.label));
    expect(roles.every(row => row.isSystem && row.key?.startsWith("system-"))).toBe(true);
    expect(await prisma.membership.findMany({ where: { schoolId: context.schoolId } })).toEqual(before);
    expect(await prisma.permissionRole.count({ where: { schoolId: schoolB } })).toBe(0);
  });
  it("preserves edits and removed grants on every repeat without reintroducing access", async () => {
    const context = await fixture(); await installSchoolSystemRoles(context, context.schoolId);
    const role = await prisma.permissionRole.findUniqueOrThrow({ where: { schoolId_key: { schoolId: context.schoolId, key: "system-direcao" } } });
    await prisma.permissionRole.update({ where: { id: role.id }, data: { name: "Adjusted synthetic direction", description: "School edited description" } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const before = await prisma.permissionRole.findMany({ where: { schoolId: context.schoolId }, include: { permissions: true }, orderBy: { id: "asc" } });
    expect(await installSchoolSystemRoles(context, context.schoolId)).toEqual({ created: 0 });
    expect(await prisma.permissionRole.findMany({ where: { schoolId: context.schoolId }, include: { permissions: true }, orderBy: { id: "asc" } })).toEqual(before);
    expect(await prisma.auditLog.count({ where: { schoolId: context.schoolId, action: "permissionRole.installSystemDefaults" } })).toBe(1);
  });
  it("serializes concurrent repeats into one installation and one audit", async () => {
    const context = await fixture();
    const results = await Promise.all(Array.from({ length: 4 }, () => installSchoolSystemRoles(context, context.schoolId)));
    expect(results.map(row => row.created).sort((a, b) => a - b)).toEqual([0, 0, 0, 9]);
    expect(await prisma.permissionRole.count({ where: { schoolId: context.schoolId } })).toBe(9);
    expect(await prisma.auditLog.count({ where: { schoolId: context.schoolId, action: "permissionRole.installSystemDefaults" } })).toBe(1);
  });
  it("rolls back a name collision instead of merging custom roles", async () => {
    const context = await fixture();
    const existing = await prisma.permissionRole.create({ data: { schoolId: context.schoolId, name: "Portaria e Acessos", key: "custom-collision" } });
    await expect(installSchoolSystemRoles(context, context.schoolId)).rejects.toMatchObject({ code: "duplicateName" });
    expect(await prisma.permissionRole.findMany({ where: { schoolId: context.schoolId } })).toEqual([existing]);
    expect(await prisma.auditLog.count({ where: { schoolId: context.schoolId } })).toBe(0);
  });
  it("refuses a custom role occupying a reserved key without adopting or rewriting it", async () => {
    const context = await fixture();
    const custom = await prisma.permissionRole.create({ data: { schoolId: context.schoolId, key: "system-direcao", name: "Synthetic reserved key", isSystem: false } });
    await expect(installSchoolSystemRoles(context, context.schoolId)).rejects.toMatchObject({ code: "protectedRole" });
    expect(await prisma.permissionRole.findMany({ where: { schoolId: context.schoolId } })).toEqual([custom]);
    expect(await prisma.auditLog.count({ where: { schoolId: context.schoolId } })).toBe(0);
  });
  it("rereads authority and refuses stale schools, revoked managers and forged platform status", async () => {
    const context = await fixture();
    await expect(installSchoolSystemRoles(context, schoolB)).rejects.toMatchObject({ code: "schoolChanged" });
    await prisma.membership.updateMany({ where: { userId: context.userId }, data: { status: "SUSPENDED" } });
    await expect(installSchoolSystemRoles({ ...context, isPlatformAdmin: true }, context.schoolId)).rejects.toMatchObject({ code: "forbidden" });
    expect(await prisma.permissionRole.count({ where: { schoolId: context.schoolId } })).toBe(0);
  });
  it("rolls back all defaults if the atomic audit write fails", async () => {
    const context = await fixture();
    const trigger = `synthetic_default_audit_${randomBytes(6).toString("hex")}`;
    if (!/^[a-z0-9]+$/.test(context.schoolId)) throw Error("Unsafe synthetic identifier");
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON AuditLog FOR EACH ROW BEGIN IF NEW.schoolId = '${context.schoolId}' AND NEW.action = 'permissionRole.installSystemDefaults' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SYNTHETIC_AUDIT_FAULT'; END IF; END`);
    try {
      await expect(installSchoolSystemRoles(context, context.schoolId)).rejects.toThrow();
      expect(await prisma.permissionRole.count({ where: { schoolId: context.schoolId } })).toBe(0);
      expect(await prisma.auditLog.count({ where: { schoolId: context.schoolId } })).toBe(0);
    } finally { await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger}`); }
  });
});
