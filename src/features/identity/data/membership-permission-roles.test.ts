// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionContext } from "../domain/access";
import { hasPermission, isUnrestrictedSchoolAdministrator } from "../domain/access";
import { loadEffectiveSessionAccess } from "@/lib/auth/session-access";
import { loadSchoolMembershipRoles, saveSchoolMembershipRoles, searchSchoolPermissionRoles } from "./membership-permission-roles";
import { assignSchoolPermissionRole } from "./assign-permission-role";
import { loadSchoolPermissionRole, saveSchoolPermissionRole, deleteSchoolPermissionRole } from "./permission-role-management";
import { getProfessionalLink, changeProfessionalLink } from "./professional-link";
import { listAssignableStaff, listPermissionRoles } from "./permission-roles";
const { prisma } = await import("@/lib/db/client");

describe("multiple school profile assignments", () => {
  let a = "", b = "", actorId = "", actorMemberId = "", managerId = "", teacherId = "", managerMemberId = "", teacherMemberId = "", foreignMemberId = "", platformId = "", platformMemberId = "";
  let roleA = "", roleB = "", foreignRole = "", view = "", grades = "";
  const userIds: string[] = [];
  let context: SessionContext;
  beforeAll(async () => {
    [a, b] = await Promise.all(["A", "B"].map(async label => (await prisma.school.create({ data: { code: `MULTI-${label}-${randomUUID()}`, name: `Synthetic multiple roles ${label}`, province: "Maputo", district: "KaMpfumu" } })).id));
    const createUser = async (name: string, schoolId: string, role: "SCHOOL_MANAGER" | "TEACHER", platform = false) => {
      const user = await prisma.user.create({ data: { name, isPlatformAdmin: platform, memberships: { create: { schoolId, role } } } });
      userIds.push(user.id); return user.id;
    };
    actorId = await createUser("Synthetic profile administrator", a, "SCHOOL_MANAGER");
    managerId = await createUser("Synthetic target manager", a, "SCHOOL_MANAGER");
    teacherId = await createUser("Synthetic shared teacher", a, "TEACHER");
    platformId = await createUser("Synthetic protected platform holder", a, "TEACHER", true);
    foreignMemberId = (await prisma.membership.create({ data: { schoolId: b, userId: teacherId, role: "TEACHER" } })).id;
    for (const [userId, code] of [[teacherId, "TEACHER-A"]]) await prisma.teacher.create({ data: { schoolId: a, userId, code, firstName: "Synthetic", lastName: "Teacher" } });
    await prisma.teacher.create({ data: { schoolId: b, userId: teacherId, code: "TEACHER-B", firstName: "Synthetic", lastName: "Teacher" } });
    actorMemberId = (await prisma.membership.findFirstOrThrow({ where: { userId: actorId } })).id;
    managerMemberId = (await prisma.membership.findFirstOrThrow({ where: { userId: managerId } })).id;
    teacherMemberId = (await prisma.membership.findFirstOrThrow({ where: { userId: teacherId, schoolId: a } })).id;
    platformMemberId = (await prisma.membership.findFirstOrThrow({ where: { userId: platformId } })).id;
    view = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "students", action: "view" } } })).id;
    grades = (await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "grades", action: "view" } } })).id;
    roleA = (await prisma.permissionRole.create({ data: { schoolId: a, name: "Synthetic students profile" } })).id;
    roleB = (await prisma.permissionRole.create({ data: { schoolId: a, name: "Synthetic grades profile" } })).id;
    foreignRole = (await prisma.permissionRole.create({ data: { schoolId: b, name: "Foreign hidden profile" } })).id;
    context = { userId: actorId, authVersion: 0, schoolId: a, role: "SCHOOL_MANAGER", permissionsConfigured: false, permissionRoleId: null, memberships: [], permissions: [], isPlatformAdmin: false };
  });
  beforeEach(async () => {
    await prisma.membershipPermissionRole.deleteMany({ where: { membershipId: { in: [actorMemberId, managerMemberId, teacherMemberId] } } });
    await prisma.membership.updateMany({ where: { id: { in: [actorMemberId, managerMemberId, teacherMemberId] } }, data: { status: "ACTIVE", permissionRoleId: null, permissionsConfigured: false } });
    await prisma.user.update({ where: { id: actorId }, data: { authVersion: 0, isActive: true } });
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: [roleA, roleB] } } });
    await prisma.rolePermission.createMany({ data: [{ roleId: roleA, permissionId: view }, { roleId: roleB, permissionId: grades }] });
    await prisma.auditLog.deleteMany({ where: { schoolId: a } });
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: [a, b] } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.school.deleteMany({ where: { id: { in: [a, b] } } });
    await prisma.$disconnect();
  });
  const target = (membershipId: string) => ({ expectedSchoolId: a, membershipId });
  async function change(membershipId: string, ids: string[], mode: "configured" | "legacy" = "configured", actor = context) {
    const preview = await loadSchoolMembershipRoles(actor, target(membershipId));
    const rows = await prisma.permissionRole.findMany({ where: { id: { in: ids } }, select: { id: true, updatedAt: true } });
    const input = { ...target(membershipId), revision: preview.revision, mode, roles: rows.map(row => ({ id: row.id, revision: row.updatedAt.toISOString() })) };
    await saveSchoolMembershipRoles(actor, input); return input;
  }
  it("unions two explicit teacher profiles without changing identity, professional ownership or school B", async () => {
    const beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: teacherId } });
    const beforeB = await prisma.membership.findUniqueOrThrow({ where: { id: foreignMemberId } });
    const profiles = await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } });
    const input = await change(teacherMemberId, [roleA, roleB]);
    await saveSchoolMembershipRoles(context, input);
    const access = await loadEffectiveSessionAccess(teacherId, a);
    expect(access?.role).toBe("TEACHER");
    expect(hasPermission(access!, "students", "view")).toBe(true);
    expect(hasPermission(access!, "grades", "view")).toBe(true);
    expect(hasPermission(access!, "students", "edit")).toBe(false);
    expect(isUnrestrictedSchoolAdministrator(access!)).toBe(false);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: teacherId } })).toEqual(beforeUser);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: foreignMemberId } })).toEqual(beforeB);
    expect(await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } })).toEqual(profiles);
    expect(await prisma.auditLog.count({ where: { entityId: teacherMemberId, action: "membership.assignPermissionRoles" } })).toBe(1);
  });
  it("keeps configured empty restrictions denied and restores full access only through an explicit reset", async () => {
    await change(managerMemberId, []);
    let access = await loadEffectiveSessionAccess(managerId, a);
    expect(access).toMatchObject({ permissionsConfigured: true, permissionRoleId: null, permissions: [] });
    expect(hasPermission(access!, "students", "view")).toBe(false);
    await expect(assignSchoolPermissionRole(context, { ...target(managerMemberId), permissionRoleId: null })).rejects.toMatchObject({ code: "invalid" });
    await change(managerMemberId, [], "legacy");
    access = await loadEffectiveSessionAccess(managerId, a);
    expect(hasPermission(access!, "students", "create")).toBe(true);
    expect(isUnrestrictedSchoolAdministrator(access!)).toBe(true);
    expect(await prisma.auditLog.count({ where: { entityId: managerMemberId, action: "membership.assignPermissionRoles" } })).toBe(2);
  });
  it("prepares profiles while suspended without activating the association or changing school B", async () => {
    const beforeB = await prisma.membership.findUniqueOrThrow({ where: { id: foreignMemberId } });
    await prisma.membership.update({ where: { id: teacherMemberId }, data: { status: "SUSPENDED" } });
    const preview = await loadSchoolMembershipRoles(context, target(teacherMemberId));
    expect(preview.status).toBe("SUSPENDED");
    await change(teacherMemberId, [roleA]);
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: teacherMemberId } })).status).toBe("SUSPENDED");
    const access = await loadEffectiveSessionAccess(teacherId, a);
    expect(access?.schoolId).toBeNull();
    expect(hasPermission(access!, "students", "view")).toBe(false);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: foreignMemberId } })).toEqual(beforeB);
    await prisma.membership.update({ where: { id: teacherMemberId }, data: { status: "REMOVED" } });
    await expect(loadSchoolMembershipRoles(context, target(teacherMemberId))).rejects.toMatchObject({ code: "notFound" });
  });
  it("configures a suspended manager while preserving the sole active unrestricted manager", async () => {
    await prisma.membership.update({ where: { id: managerMemberId }, data: { status: "SUSPENDED" } });
    await change(managerMemberId, [roleA]);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: managerMemberId } })).toMatchObject({ status: "SUSPENDED", permissionsConfigured: true, permissionRoleId: roleA });
    expect(isUnrestrictedSchoolAdministrator((await loadEffectiveSessionAccess(actorId, a))!)).toBe(true);
    expect((await loadEffectiveSessionAccess(managerId, a))?.schoolId).toBeNull();
  });
  it("refuses a stale membership revision and a changed role definition", async () => {
    const old = await loadSchoolMembershipRoles(context, target(managerMemberId));
    await change(managerMemberId, [roleA]);
    const role = await prisma.permissionRole.findUniqueOrThrow({ where: { id: roleB } });
    await expect(saveSchoolMembershipRoles(context, { ...target(managerMemberId), revision: old.revision, mode: "configured", roles: [{ id: roleB, revision: role.updatedAt.toISOString() }] })).rejects.toMatchObject({ code: "conflict" });
    const fresh = await loadSchoolMembershipRoles(context, target(teacherMemberId));
    const before = await prisma.permissionRole.findUniqueOrThrow({ where: { id: roleA } });
    await prisma.permissionRole.update({ where: { id: roleA }, data: { updatedAt: new Date(before.updatedAt.getTime() + 1) } });
    await expect(saveSchoolMembershipRoles(context, { ...target(teacherMemberId), revision: fresh.revision, mode: "configured", roles: [{ id: roleA, revision: before.updatedAt.toISOString() }] })).rejects.toMatchObject({ code: "conflict" });
    expect(await prisma.membershipPermissionRole.count({ where: { membershipId: teacherMemberId } })).toBe(0);
  });
  it("refuses cross-school targets and profiles and does not enumerate another school's options", async () => {
    await expect(loadSchoolMembershipRoles(context, target(foreignMemberId))).rejects.toMatchObject({ code: "notFound" });
    const preview = await loadSchoolMembershipRoles(context, target(teacherMemberId));
    const role = await prisma.permissionRole.findUniqueOrThrow({ where: { id: foreignRole } });
    await expect(saveSchoolMembershipRoles(context, { ...target(teacherMemberId), revision: preview.revision, mode: "configured", roles: [{ id: role.id, revision: role.updatedAt.toISOString() }] })).rejects.toMatchObject({ code: "notFound" });
    await expect(searchSchoolPermissionRoles(context, { expectedSchoolId: b })).rejects.toMatchObject({ code: "schoolChanged" });
    expect((await searchSchoolPermissionRoles(context, { expectedSchoolId: a, query: "Foreign hidden" })).rows).toEqual([]);
  });
  it("protects own/platform accounts and rereads actor revocation despite forged context", async () => {
    for (const id of [actorMemberId, platformMemberId]) await expect(loadSchoolMembershipRoles(context, target(id))).rejects.toMatchObject({ code: "protectedAccount" });
    const preview = await loadSchoolMembershipRoles(context, target(teacherMemberId));
    await prisma.membership.update({ where: { id: actorMemberId }, data: { status: "SUSPENDED" } });
    await expect(saveSchoolMembershipRoles({ ...context, isPlatformAdmin: true }, { ...target(teacherMemberId), revision: preview.revision, mode: "configured", roles: [] })).rejects.toMatchObject({ code: "forbidden" });
    expect(await prisma.membershipPermissionRole.count({ where: { membershipId: teacherMemberId } })).toBe(0);
  });
  it("does not mistake a configured empty actor for an unrestricted manager", async () => {
    await prisma.membership.update({ where: { id: actorMemberId }, data: { permissionsConfigured: true } });
    await expect(loadSchoolMembershipRoles({ ...context, permissionsConfigured: false }, target(teacherMemberId))).rejects.toMatchObject({ code: "forbidden" });
  });
  it("protects the last usable unrestricted school manager even from a platform actor", async () => {
    await prisma.membership.update({ where: { id: actorMemberId }, data: { status: "SUSPENDED" } });
    expect(await prisma.membership.count({ where: { schoolId: a, role: "SCHOOL_MANAGER", status: "ACTIVE" } })).toBe(1);
    await expect(change(managerMemberId, [roleA], "configured", { ...context, userId: platformId, role: "TEACHER", isPlatformAdmin: true })).rejects.toMatchObject({ code: "lastManager" });
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: managerMemberId } })).permissionsConfigured).toBe(false);
  });
  it("deduplicates the bridge in counts and protects profiles referenced only by retired new links", async () => {
    await change(managerMemberId, [roleA]);
    let roles = await listPermissionRoles(a);
    expect(roles.find(row => row.id === roleA)?.memberCount).toBe(1);
    await change(managerMemberId, [roleA, roleB]);
    await prisma.membership.update({ where: { id: managerMemberId }, data: { status: "REMOVED" } });
    roles = await listPermissionRoles(a);
    expect(roles.find(row => row.id === roleA)?.memberCount).toBe(1);
    const record = await loadSchoolPermissionRole(context, { expectedSchoolId: a, id: roleA });
    expect(record.memberCount).toBe(1);
    await expect(deleteSchoolPermissionRole(context, { expectedSchoolId: a, id: roleA, revision: record.revision })).rejects.toMatchObject({ code: "roleInUse" });
    await expect(prisma.permissionRole.delete({ where: { id: roleA } })).rejects.toThrow();
  });
  it("rolls back the bridge, mode and new links if the audit write fails", async () => {
    const before = await prisma.membership.findUniqueOrThrow({ where: { id: managerMemberId } });
    const trigger = `synthetic_assignment_audit_${randomBytes(6).toString("hex")}`;
    if (!/^[a-z0-9]+$/.test(managerMemberId)) throw Error("Unsafe synthetic identifier");
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON AuditLog FOR EACH ROW BEGIN IF NEW.entityId='${managerMemberId}' AND NEW.action='membership.assignPermissionRoles' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_ASSIGNMENT_AUDIT_FAULT'; END IF; END`);
    try {
      await expect(change(managerMemberId, [roleA, roleB])).rejects.toThrow();
      expect(await prisma.membership.findUniqueOrThrow({ where: { id: managerMemberId } })).toEqual(before);
      expect(await prisma.membershipPermissionRole.count({ where: { membershipId: managerMemberId } })).toBe(0);
    } finally { await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger}`); }
  });
  it("serializes conflicting submissions without last-write-wins or duplicate audits", async () => {
    const preview = await loadSchoolMembershipRoles(context, target(managerMemberId));
    const records = await prisma.permissionRole.findMany({ where: { id: { in: [roleA, roleB] } } });
    const results = await Promise.allSettled(records.map(row => saveSchoolMembershipRoles(context, { ...target(managerMemberId), revision: preview.revision, mode: "configured", roles: [{ id: row.id, revision: row.updatedAt.toISOString() }] })));
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
    expect(await prisma.membershipPermissionRole.count({ where: { membershipId: managerMemberId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: managerMemberId, action: "membership.assignPermissionRoles" } })).toBe(1);
  });
  it("removes effective access on the next request after a profile's grant is revoked", async () => {
    await change(teacherMemberId, [roleA]);
    expect(hasPermission((await loadEffectiveSessionAccess(teacherId, a))!, "students", "view")).toBe(true);
    const record = await loadSchoolPermissionRole(context, { expectedSchoolId: a, id: roleA });
    await saveSchoolPermissionRole(context, { ...record, expectedSchoolId: a, permissionIds: [] });
    expect(hasPermission((await loadEffectiveSessionAccess(teacherId, a))!, "students", "view")).toBe(false);
  });
  it("does not let delegated teacher account-management grants change their own professional ownership", async () => {
    const userEdit = await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "users", action: "edit" } } });
    const adminRole = await prisma.permissionRole.create({ data: { schoolId: a, name: "Synthetic delegated teacher manager", permissions: { create: { permissionId: userEdit.id } } } });
    await change(teacherMemberId, [adminRole.id]);
    const actor = (await loadEffectiveSessionAccess(teacherId, a))!;
    expect(hasPermission(actor, "users", "edit")).toBe(true);
    const peer = await prisma.user.create({ data: { name: "Synthetic delegated peer", memberships: { create: { schoolId: a, role: "TEACHER" } } } });
    userIds.push(peer.id);
    expect(await getProfessionalLink(actor, peer.id, "teacher")).toMatchObject({ canLink: true, profile: null });
    const before = await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } });
    for (const kind of ["teacher", "staff"] as const) await expect(getProfessionalLink(actor, teacherId, kind)).rejects.toMatchObject({ code: "linkUnavailable" });
    const own = before.find(row => row.schoolId === a)!;
    await expect(changeProfessionalLink(actor, { userId: teacherId, expectedSchoolId: a, expectedRevision: "0".repeat(64), expectedProfileId: own.id, expectedProfileRevision: own.updatedAt.toISOString(), profileId: null, profileRevision: null }, "teacher")).rejects.toMatchObject({ code: "linkUnavailable" });
    expect(await prisma.teacher.findMany({ where: { userId: teacherId }, orderBy: { id: "asc" } })).toEqual(before);
    expect(await prisma.auditLog.count({ where: { entityId: teacherId, action: "schoolUser.teacherLink.update" } })).toBe(0);
  });
  it("bounds profile and staff search pages while preserving selected profiles separately", async () => {
    await prisma.permissionRole.createMany({ data: Array.from({ length: 25 }, (_, index) => ({ schoolId: a, name: `Synthetic page role ${String(index).padStart(2, "0")}` })) });
    const page = await searchSchoolPermissionRoles(context, { expectedSchoolId: a, query: "Synthetic page role", page: 2 });
    expect(page).toMatchObject({ total: 25, page: 2, pageCount: 2 }); expect(page.rows).toHaveLength(5);
    for (let index = 0; index < 25; index++) { const user = await prisma.user.create({ data: { name: `Synthetic paged staff ${index}`, memberships: { create: { schoolId: a, role: "TEACHER" } } } }); userIds.push(user.id); }
    const staff = await listAssignableStaff(a, actorId, { staffQuery: "Synthetic paged staff", staffPage: 2 });
    expect(staff).toMatchObject({ total: 25, page: 2, pageCount: 2 }); expect(staff.rows).toHaveLength(5);
    expect(staff.rows.every(row => row.baseRole === "TEACHER" && row.mode === "configured" && !row.isCurrentUser)).toBe(true);
  });
});
