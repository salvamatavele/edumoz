// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionContext } from "../domain/access";
import { loadSchoolPermissionRole, saveSchoolPermissionRole, deleteSchoolPermissionRole } from "./permission-role-management";
import { assignSchoolPermissionRole } from "./assign-permission-role";
const { prisma } = await import("@/lib/db/client");

describe("school permission role management", () => {
  let schoolA = "", schoolB = "", actorId = "", readerId = "", viewId = "", financeViewId = "", readerRoleId = "", memberId = "";
  let context: SessionContext;
  beforeAll(async () => {
    [schoolA, schoolB] = await Promise.all(["A", "B"].map(async label => (await prisma.school.create({ data: { code: `ROLE-CRUD-${label}-${randomUUID()}`, name: `Synthetic role CRUD ${label}`, province: "Maputo", district: "KaMpfumu" } })).id));
    actorId = (await prisma.user.create({ data: { name: "Synthetic role administrator", memberships: { create: { schoolId: schoolA, role: "SCHOOL_MANAGER" } } } })).id;
    readerRoleId = (await prisma.permissionRole.create({ data: { schoolId: schoolA, name: "Synthetic empty reader" } })).id;
    readerId = (await prisma.user.create({ data: { name: "Synthetic role reader", memberships: { create: { schoolId: schoolA, role: "SCHOOL_MANAGER", permissionRoleId: readerRoleId } } } })).id;
    memberId = (await prisma.membership.findFirstOrThrow({ where: { userId: readerId } })).id;
    viewId = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "students", action: "view" } } })).id;
    financeViewId = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "finance", action: "view" } } })).id;
    context = { userId: actorId, authVersion: 0, schoolId: schoolA, role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissions: [], permissionRoleId: null };
  });
  beforeEach(async () => {
    await prisma.membership.updateMany({ where: { userId: actorId }, data: { status: "ACTIVE" } });
    await prisma.membershipPermissionRole.deleteMany({ where: { membershipId: memberId } });
    await prisma.membership.update({ where: { id: memberId }, data: { status: "ACTIVE", permissionRoleId: readerRoleId, permissionsConfigured: true } });
    await prisma.membershipPermissionRole.create({ data: { membershipId: memberId, permissionRoleId: readerRoleId } });
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: [schoolA, schoolB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [actorId, readerId] } } });
    await prisma.school.deleteMany({ where: { id: { in: [schoolA, schoolB] } } });
    await prisma.$disconnect();
  });
  async function role(extra: { schoolId?: string; isSystem?: boolean } = {}) {
    return prisma.permissionRole.create({ data: { schoolId: extra.schoolId ?? schoolA, name: `Synthetic role ${randomUUID()}`, key: `synthetic-${randomUUID()}`, isSystem: extra.isSystem ?? false, permissions: { create: { permissionId: viewId } } } });
  }
  const target = (id: string) => ({ id, expectedSchoolId: schoolA });
  async function edit(id: string) { return { ...await loadSchoolPermissionRole(context, target(id)), expectedSchoolId: schoolA }; }
  it("atomically updates metadata and grants, preserves its stable identity and audits without description", async () => {
    const record = await role(); const input = await edit(record.id);
    const changed = { ...input, name: "Synthetic renamed role", description: "Private description must not enter audit", permissionIds: [financeViewId] };
    await saveSchoolPermissionRole(context, { ...changed, key: "forged", isSystem: true });
    await saveSchoolPermissionRole(context, changed);
    const after = await prisma.permissionRole.findUniqueOrThrow({ where: { id: record.id }, include: { permissions: true } });
    expect(after.key).toBe(record.key); expect(after.isSystem).toBe(false); expect(after.schoolId).toBe(schoolA);
    expect(after.name).toBe(changed.name); expect(after.permissions.map(row => row.permissionId)).toEqual([financeViewId]);
    expect(after.updatedAt.getTime()).toBeGreaterThan(record.updatedAt.getTime());
    const audit = await prisma.auditLog.findMany({ where: { entityId: record.id, action: "permissionRole.update" } });
    expect(audit).toHaveLength(1); expect(JSON.stringify(audit)).not.toContain(changed.description);
  });
  it("refuses another school, unknown permissions and stale snapshots without partial writes", async () => {
    const foreign = await role({ schoolId: schoolB }); const before = await prisma.permissionRole.findUniqueOrThrow({ where: { id: foreign.id } });
    await expect(loadSchoolPermissionRole(context, target(foreign.id))).rejects.toMatchObject({ code: "notFound" });
    const own = await role(); const input = await edit(own.id);
    await expect(saveSchoolPermissionRole(context, { ...input, expectedSchoolId: schoolB })).rejects.toMatchObject({ code: "schoolChanged" });
    await expect(saveSchoolPermissionRole(context, { ...input, name: "Do not save", permissionIds: ["unknown"] })).rejects.toMatchObject({ code: "invalid" });
    await saveSchoolPermissionRole(context, { ...input, name: "Current name" });
    await expect(saveSchoolPermissionRole(context, { ...input, name: "Stale name" })).rejects.toMatchObject({ code: "conflict" });
    await expect(deleteSchoolPermissionRole(context, input)).rejects.toMatchObject({ code: "conflict" });
    expect(await prisma.permissionRole.findUniqueOrThrow({ where: { id: foreign.id } })).toEqual(before);
  });
  it("preserves dormant historical grants but refuses adding a grant without a current consumer", async () => {
    const dormant = await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "grades", action: "view" } } });
    const record = await role();
    const input = await edit(record.id);
    await expect(saveSchoolPermissionRole(context, { ...input, permissionIds: [dormant.id] })).rejects.toMatchObject({ code: "invalid" });
    await prisma.rolePermission.create({ data: { roleId: record.id, permissionId: dormant.id } });
    const legacy = await edit(record.id);
    await saveSchoolPermissionRole(context, { ...legacy, name: "Preserved legacy configuration" });
    expect(await prisma.rolePermission.count({ where: { roleId: record.id, permissionId: dormant.id } })).toBe(1);
  });
  it("refuses a system role's deletion and preserves immutable metadata at the database boundary", async () => {
    const system = await role({ isSystem: true }); const input = await edit(system.id);
    await expect(deleteSchoolPermissionRole(context, { ...input, isSystem: false })).rejects.toMatchObject({ code: "protectedRole" });
    await expect(prisma.permissionRole.update({ where: { id: system.id }, data: { isSystem: false } })).rejects.toThrow();
    await expect(prisma.permissionRole.update({ where: { id: system.id }, data: { key: "changed" } })).rejects.toThrow();
    await saveSchoolPermissionRole(context, { ...input, name: "System label can be corrected" });
    expect((await prisma.permissionRole.findUniqueOrThrow({ where: { id: system.id } })).isSystem).toBe(true);
  });
  it("preserves a role referenced by a retired association, including against raw deletion", async () => {
    const record = await role();
    await prisma.membership.update({ where: { id: memberId }, data: { permissionRoleId: record.id, status: "REMOVED" } });
    const input = await edit(record.id);
    await expect(deleteSchoolPermissionRole(context, input)).rejects.toMatchObject({ code: "roleInUse" });
    await expect(prisma.permissionRole.delete({ where: { id: record.id } })).rejects.toThrow();
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: memberId } })).permissionRoleId).toBe(record.id);
  });
  it("deletes an unused custom role and its grants while keeping a redacted audit", async () => {
    const record = await role(); await deleteSchoolPermissionRole(context, await edit(record.id));
    expect(await prisma.permissionRole.findUnique({ where: { id: record.id } })).toBeNull();
    expect(await prisma.rolePermission.count({ where: { roleId: record.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { entityId: record.id, action: "permissionRole.delete" } })).toBe(1);
  });
  it("revalidates a revoked actor and refuses a reader despite forged context", async () => {
    const record = await role(); const input = await edit(record.id);
    await expect(saveSchoolPermissionRole({ ...context, userId: readerId }, { ...input, name: "Forbidden reader" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteSchoolPermissionRole({ ...context, userId: readerId, isPlatformAdmin: true }, input)).rejects.toMatchObject({ code: "forbidden" });
    await prisma.membership.updateMany({ where: { userId: actorId }, data: { status: "SUSPENDED" } });
    await expect(saveSchoolPermissionRole(context, { ...input, name: "Forbidden actor" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteSchoolPermissionRole(context, input)).rejects.toMatchObject({ code: "forbidden" });
  });
  it("serializes assignment and deletion without leaving an unrestricted membership", async () => {
    const record = await role(); const input = await edit(record.id);
    const results = await Promise.allSettled([deleteSchoolPermissionRole(context, input), assignSchoolPermissionRole(context, { membershipId: memberId, expectedSchoolId: schoolA, permissionRoleId: record.id })]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: memberId } })).permissionRoleId).not.toBeNull();
  });
  it("rolls back metadata, grants and deletion when the audit write fails", async () => {
    const record = await role(); const input = await edit(record.id);
    const before = await prisma.permissionRole.findUniqueOrThrow({ where: { id: record.id }, include: { permissions: true } });
    const trigger = `synthetic_role_audit_${randomBytes(6).toString("hex")}`;
    if (!/^[a-z0-9]+$/.test(record.id)) throw new Error("Unexpected fixture identifier");
    await prisma.$executeRawUnsafe(`CREATE TRIGGER \`${trigger}\` BEFORE INSERT ON AuditLog FOR EACH ROW BEGIN IF NEW.entityId='${record.id}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_ROLE_AUDIT_FAILURE'; END IF; END`);
    try {
      await expect(saveSchoolPermissionRole(context, { ...input, name: "Must roll back", permissionIds: [financeViewId] })).rejects.toThrow(/SYNTHETIC_ROLE_AUDIT_FAILURE/);
      await expect(deleteSchoolPermissionRole(context, input)).rejects.toThrow(/SYNTHETIC_ROLE_AUDIT_FAILURE/);
      expect(await prisma.permissionRole.findUniqueOrThrow({ where: { id: record.id }, include: { permissions: true } })).toEqual(before);
      expect(await prisma.auditLog.count({ where: { entityId: record.id } })).toBe(0);
    } finally { await prisma.$executeRawUnsafe(`DROP TRIGGER \`${trigger}\``); }
  });
});
