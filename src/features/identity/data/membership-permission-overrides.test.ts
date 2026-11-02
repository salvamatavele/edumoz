// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hasPermission, isUnrestrictedSchoolAdministrator, type SessionContext } from "../domain/access";
import { loadEffectiveSessionAccess } from "@/lib/auth/session-access";
import { loadSchoolMembershipPermissionOverrides, saveSchoolMembershipPermissionOverrides } from "./membership-permission-overrides";
import { loadSchoolMembershipRoles, saveSchoolMembershipRoles } from "./membership-permission-roles";
import { changeSchoolUserStatus } from "./school-user-status";
const { prisma } = await import("@/lib/db/client");

describe("school membership permission exceptions", () => {
  let a = "", b = "", actorId = "", actorMember = "", teacherId = "", teacherMember = "", foreignMember = "", managerId = "", managerMember = "", accumulatedMember = "", platformId = "", platformMember = "", roleId = "", studentView = "", usersEdit = "";
  const users: string[] = [];
  let context: SessionContext;
  beforeAll(async () => {
    [a, b] = await Promise.all(["A", "B"].map(async label => (await prisma.school.create({ data: { code: `OVERRIDE-${label}-${randomUUID()}`, name: `Synthetic exceptions ${label}`, province: "Maputo", district: "KaMpfumu" } })).id));
    async function account(name: string, role: "SCHOOL_MANAGER" | "TEACHER", platform = false) {
      const user = await prisma.user.create({ data: { name, isPlatformAdmin: platform, memberships: { create: { schoolId: a, role } } } });
      users.push(user.id); return user.id;
    }
    actorId = await account("Synthetic exception administrator", "SCHOOL_MANAGER");
    teacherId = await account("Synthetic exception teacher", "TEACHER");
    managerId = await account("Synthetic legacy target", "SCHOOL_MANAGER");
    platformId = await account("Synthetic platform actor", "TEACHER", true);
    actorMember = (await prisma.membership.findFirstOrThrow({ where: { userId: actorId } })).id;
    teacherMember = (await prisma.membership.findFirstOrThrow({ where: { userId: teacherId } })).id;
    managerMember = (await prisma.membership.findFirstOrThrow({ where: { userId: managerId } })).id;
    platformMember = (await prisma.membership.findFirstOrThrow({ where: { userId: platformId } })).id;
    accumulatedMember = (await prisma.membership.create({ data: { schoolId: a, userId: managerId, role: "TEACHER", status: "SUSPENDED" } })).id;
    foreignMember = (await prisma.membership.create({ data: { schoolId: b, userId: teacherId, role: "TEACHER" } })).id;
    for (const schoolId of [a, b]) await prisma.teacher.create({ data: { schoolId, userId: teacherId, code: `OVERRIDE-${schoolId}`, firstName: "Synthetic", lastName: "Teacher" } });
    studentView = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "students", action: "view" } } })).id;
    usersEdit = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "users", action: "edit" } } })).id;
    roleId = (await prisma.permissionRole.create({ data: { schoolId: a, name: "Synthetic inherited students", permissions: { create: { permissionId: studentView } } } })).id;
    context = { userId: actorId, authVersion: 0, schoolId: a, role: "SCHOOL_MANAGER", memberships: [], permissionRoleId: null, permissionsConfigured: false, permissions: [], isPlatformAdmin: false };
  });
  beforeEach(async () => {
    await prisma.membershipPermissionOverride.deleteMany({ where: { membership: { schoolId: a } } });
    await prisma.membershipPermissionRole.deleteMany({ where: { membership: { schoolId: a } } });
    await prisma.membership.updateMany({ where: { schoolId: a }, data: { status: "ACTIVE", permissionsConfigured: false, permissionRoleId: null } });
    await prisma.membership.update({ where: { id: accumulatedMember }, data: { status: "SUSPENDED" } });
    await prisma.membership.update({ where: { id: teacherMember }, data: { permissionsConfigured: true } });
    await prisma.membershipPermissionRole.create({ data: { membershipId: teacherMember, permissionRoleId: roleId } });
    await prisma.user.updateMany({ where: { id: { in: users } }, data: { isActive: true, passwordChangeRequired: false, authVersion: 0 } });
    await prisma.auditLog.deleteMany({ where: { schoolId: a } });
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: [a, b] } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.school.deleteMany({ where: { id: { in: [a, b] } } });
    await prisma.$disconnect();
  });
  const target = (membershipId: string) => ({ expectedSchoolId: a, membershipId });
  async function prepare(membershipId: string, overrides: Array<{ permissionId: string; allowed: boolean; reason?: string }>, actor = context) {
    const preview = await loadSchoolMembershipPermissionOverrides(actor, target(membershipId));
    return { ...target(membershipId), revision: preview.revision, overrides };
  }
  it("replaces inherited access, grants a specific action, preserves identity and school B, and redacts the audit", async () => {
    const beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: teacherId } });
    const beforeB = await prisma.membership.findUniqueOrThrow({ where: { id: foreignMember } });
    const profiles = await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } });
    const input = await prepare(teacherMember, [{ permissionId: studentView, allowed: false, reason: "Private reason never copied to audit" }, { permissionId: usersEdit, allowed: true }]);
    await saveSchoolMembershipPermissionOverrides(context, input);
    await saveSchoolMembershipPermissionOverrides(context, input);
    const access = (await loadEffectiveSessionAccess(teacherId, a))!;
    expect(hasPermission(access, "students", "view")).toBe(false);
    expect(hasPermission(access, "users", "edit")).toBe(true);
    expect(access).toMatchObject({ role: "TEACHER", isPlatformAdmin: false });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: teacherId } })).toEqual(beforeUser);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: foreignMember } })).toEqual(beforeB);
    expect(await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } })).toEqual(profiles);
    const audits = await prisma.auditLog.findMany({ where: { entityId: teacherMember } });
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain("Private reason");
    const preview = await loadSchoolMembershipPermissionOverrides(context, target(teacherMember));
    expect(preview.rows.find(row => row.permissionId === studentView)).toMatchObject({ inherited: true, override: false, effective: false, reason: "Private reason never copied to audit" });
  });
  it("restores inheritance when clearing an exception without clearing explicit profile configuration", async () => {
    await saveSchoolMembershipPermissionOverrides(context, await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]));
    await saveSchoolMembershipPermissionOverrides(context, await prepare(teacherMember, []));
    expect(hasPermission((await loadEffectiveSessionAccess(teacherId, a))!, "students", "view")).toBe(true);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: teacherMember } })).toMatchObject({ permissionsConfigured: true, role: "TEACHER" });
    expect(await prisma.membershipPermissionRole.count({ where: { membershipId: teacherMember } })).toBe(1);
  });
  it("restricts a legacy manager while preserving other inherited grants and profile-mode intent", async () => {
    await saveSchoolMembershipPermissionOverrides(context, await prepare(managerMember, [{ permissionId: studentView, allowed: false }]));
    const access = (await loadEffectiveSessionAccess(managerId, a))!;
    expect(hasPermission(access, "students", "view")).toBe(false);
    expect(hasPermission(access, "finance", "edit")).toBe(true);
    expect(isUnrestrictedSchoolAdministrator(access)).toBe(false);
    const profile = await loadSchoolMembershipRoles(context, target(managerMember));
    expect(profile.mode).toBe("legacy");
    await saveSchoolMembershipRoles(context, { ...target(managerMember), revision: profile.revision, mode: "legacy", roles: [] });
    expect(await prisma.membershipPermissionOverride.count({ where: { membershipId: managerMember } })).toBe(1);
  });
  it("does not let another active association override an explicit denial", async () => {
    await prisma.membership.update({ where: { id: accumulatedMember }, data: { status: "ACTIVE" } });
    await saveSchoolMembershipPermissionOverrides(context, await prepare(managerMember, [{ permissionId: studentView, allowed: true }]));
    await saveSchoolMembershipPermissionOverrides(context, await prepare(accumulatedMember, [{ permissionId: studentView, allowed: false }]));
    expect(hasPermission((await loadEffectiveSessionAccess(managerId, a))!, "students", "view")).toBe(false);
    expect((await loadSchoolMembershipPermissionOverrides(context, target(managerMember))).rows.find(row => row.permissionId === studentView)).toMatchObject({ override: true, effective: false, otherDenial: true });
  });
  it("rejects another school, unknown permissions, duplicate entries and an oversized reason", async () => {
    await expect(loadSchoolMembershipPermissionOverrides(context, target(foreignMember))).rejects.toMatchObject({ code: "notFound" });
    await expect(loadSchoolMembershipPermissionOverrides(context, { expectedSchoolId: b, membershipId: foreignMember })).rejects.toMatchObject({ code: "schoolChanged" });
    for (const overrides of [[{ permissionId: "missing", allowed: true }], [{ permissionId: studentView, allowed: true }, { permissionId: studentView, allowed: false }], [{ permissionId: studentView, allowed: false, reason: "x".repeat(301) }]]) {
      await expect(saveSchoolMembershipPermissionOverrides(context, await prepare(teacherMember, overrides))).rejects.toMatchObject({ code: "invalid" });
    }
    expect(await prisma.membershipPermissionOverride.count({ where: { membershipId: teacherMember } })).toBe(0);
    const dormant = await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "grades", action: "view" } } });
    await expect(saveSchoolMembershipPermissionOverrides(context, await prepare(teacherMember, [{ permissionId: dormant.id, allowed: false }]))).rejects.toMatchObject({ code: "invalid" });
    expect((await loadSchoolMembershipPermissionOverrides(context, target(teacherMember))).rows.some(row => row.resource === "grades")).toBe(false);
  });
  it("rejects stale membership and inherited profile revisions before changing exceptions", async () => {
    const old = await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]);
    await prisma.permissionRole.update({ where: { id: roleId }, data: { updatedAt: new Date(Date.now() + 1000) } });
    await expect(saveSchoolMembershipPermissionOverrides(context, old)).rejects.toMatchObject({ code: "conflict" });
    const current = await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]);
    await prisma.membership.update({ where: { id: teacherMember }, data: { updatedAt: new Date(Date.now() + 1000) } });
    await expect(saveSchoolMembershipPermissionOverrides(context, current)).rejects.toMatchObject({ code: "conflict" });
  });
  it("protects own/platform accounts and rereads actor revocation despite a forged context", async () => {
    for (const id of [actorMember, platformMember]) await expect(loadSchoolMembershipPermissionOverrides(context, target(id))).rejects.toMatchObject({ code: "protectedAccount" });
    const input = await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]);
    await prisma.membershipPermissionOverride.create({ data: { membershipId: actorMember, permissionId: studentView, allowed: false } });
    await expect(saveSchoolMembershipPermissionOverrides({ ...context, isPlatformAdmin: true }, input)).rejects.toMatchObject({ code: "forbidden" });
    expect(isUnrestrictedSchoolAdministrator((await loadEffectiveSessionAccess(actorId, a))!)).toBe(false);
  });
  it("protects the last unrestricted manager from an exception on any accumulated active association", async () => {
    await prisma.membership.update({ where: { id: actorMember }, data: { status: "SUSPENDED" } });
    await prisma.membership.update({ where: { id: accumulatedMember }, data: { status: "ACTIVE" } });
    const platform = { ...context, userId: platformId, isPlatformAdmin: true, role: "TEACHER" as const };
    for (const member of [managerMember, accumulatedMember]) await expect(saveSchoolMembershipPermissionOverrides(platform, await prepare(member, [{ permissionId: studentView, allowed: false }], platform))).rejects.toMatchObject({ code: "lastManager" });
    expect(await prisma.membershipPermissionOverride.count({ where: { membership: { userId: managerId } } })).toBe(0);
  });
  it("prepares suspended exceptions without activation and blocks later activation that removes the last policy administrator", async () => {
    await prisma.membership.update({ where: { id: actorMember }, data: { status: "SUSPENDED" } });
    const platform = { ...context, userId: platformId, isPlatformAdmin: true, role: "TEACHER" as const };
    await saveSchoolMembershipPermissionOverrides(platform, await prepare(accumulatedMember, [{ permissionId: studentView, allowed: false }], platform));
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: accumulatedMember } })).toMatchObject({ status: "SUSPENDED" });
    expect(isUnrestrictedSchoolAdministrator((await loadEffectiveSessionAccess(managerId, a))!)).toBe(true);
    await expect(changeSchoolUserStatus(platform, { userId: managerId, status: "ACTIVE" })).rejects.toMatchObject({ code: "lastManager" });
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: accumulatedMember } })).toMatchObject({ status: "SUSPENDED" });
  });
  it("serializes conflicting submissions and audits only the successful intent", async () => {
    const first = await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]);
    const second = { ...first, overrides: [{ permissionId: usersEdit, allowed: true }] };
    const results = await Promise.allSettled([saveSchoolMembershipPermissionOverrides(context, first), saveSchoolMembershipPermissionOverrides(context, second)]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { entityId: teacherMember } })).toBe(1);
  });
  it("rolls back exceptions and membership revision if the audit write fails", async () => {
    const input = await prepare(teacherMember, [{ permissionId: studentView, allowed: false }]);
    const before = await prisma.membership.findUniqueOrThrow({ where: { id: teacherMember } });
    const trigger = `override_audit_failure_${randomBytes(5).toString("hex")}`;
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON AuditLog FOR EACH ROW BEGIN IF NEW.entityId='${teacherMember}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic override audit failure'; END IF; END`);
    try { await expect(saveSchoolMembershipPermissionOverrides(context, input)).rejects.toThrow(); }
    finally { await prisma.$executeRawUnsafe(`DROP TRIGGER ${trigger}`); }
    expect(await prisma.membershipPermissionOverride.count({ where: { membershipId: teacherMember } })).toBe(0);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: teacherMember } })).toEqual(before);
    expect(await prisma.auditLog.count({ where: { entityId: teacherMember } })).toBe(0);
  });
});
