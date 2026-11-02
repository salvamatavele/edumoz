// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionContext } from "../domain/access";
import { previewSchoolUserRemoval, removeSchoolUser } from "./school-user-removal";
import { changeSchoolUserStatus } from "./school-user-status";
import { listSchoolUsers } from "./school-users";
import { getEditableSchoolUser } from "./edit-school-user";
import { getSchoolUserTeacherLink } from "./school-user-teacher-link";
import { assignSchoolPermissionRole } from "./assign-permission-role";
import { acceptInvitations } from "./sign-in";
import { loadEffectiveSessionAccess } from "@/lib/auth/session-access";
const { prisma } = await import("@/lib/db/client");

describe("retiring a school association", () => {
  let schoolA = "", schoolB = "", actorId = "", targetId = "", foreignId = "", platformId = "", teacherId = "", staffId = "", invitationId = "";
  let context: SessionContext;
  beforeAll(async () => {
    const suffix = randomUUID();
    [schoolA, schoolB] = await Promise.all(["A", "B"].map(async code => (await prisma.school.create({ data: { code: `REMOVE-${code}-${suffix}`, name: `Synthetic retirement ${code}`, province: "Maputo", district: "KaMpfumu" } })).id));
    actorId = (await prisma.user.create({ data: { name: "Synthetic retirement manager", memberships: { create: { schoolId: schoolA, role: "SCHOOL_MANAGER" } } } })).id;
    targetId = (await prisma.user.create({ data: { name: "Synthetic shared retirement", email: `retirement-${suffix}@example.invalid`, memberships: { create: [{ schoolId: schoolA, role: "TEACHER" }, { schoolId: schoolA, role: "GUARDIAN" }, { schoolId: schoolB, role: "TEACHER" }] } } })).id;
    foreignId = (await prisma.user.create({ data: { name: "Synthetic foreign retirement", memberships: { create: { schoolId: schoolB, role: "GUARDIAN" } } } })).id;
    platformId = (await prisma.user.create({ data: { name: "Synthetic platform retirement", isPlatformAdmin: true } })).id;
    teacherId = (await prisma.teacher.create({ data: { schoolId: schoolA, userId: targetId, code: "RET-T01", firstName: "Synthetic", lastName: "Preserved" } })).id;
    staffId = (await prisma.staff.create({ data: { schoolId: schoolA, userId: targetId, code: "RET-F01", name: "Synthetic preserved staff", jobTitle: "Secretary" } })).id;
    context = { userId: actorId, authVersion: 0, schoolId: schoolA, role: "SCHOOL_MANAGER", memberships: [], isPlatformAdmin: false, permissionRoleId: null, permissions: [] };
  });
  beforeEach(async () => {
    await prisma.membership.updateMany({ where: { userId: { in: [actorId, targetId] }, schoolId: schoolA }, data: { status: "ACTIVE" } });
    await prisma.auditLog.deleteMany({ where: { schoolId: schoolA } });
    await prisma.invitation.deleteMany({ where: { schoolId: schoolA } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });
    invitationId = (await prisma.invitation.create({ data: { schoolId: schoolA, email: user.email!, role: "TEACHER", token: randomUUID(), invitedById: actorId, expiresAt: new Date(Date.now() + 3600000) } })).id;
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: [schoolA, schoolB] } } });
    await prisma.invitation.deleteMany({ where: { schoolId: { in: [schoolA, schoolB] } } });
    await prisma.staff.deleteMany({ where: { schoolId: schoolA } });
    await prisma.teacher.deleteMany({ where: { schoolId: schoolA } });
    await prisma.user.deleteMany({ where: { id: { in: [actorId, targetId, foreignId, platformId] } } });
    await prisma.school.deleteMany({ where: { id: { in: [schoolA, schoolB] } } });
    await prisma.$disconnect();
  });
  async function snapshot(userId = targetId) { return previewSchoolUserRemoval(context, { userId }); }
  it("retires only A while preserving account, profiles, B and one atomic redacted audit", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } });
    const staff = await prisma.staff.findUniqueOrThrow({ where: { id: staffId } });
    const membershipB = await prisma.membership.findFirstOrThrow({ where: { userId: targetId, schoolId: schoolB } });
    const preview = await snapshot();
    await removeSchoolUser(context, preview);
    await removeSchoolUser(context, preview);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: targetId } })).toEqual(before);
    expect(await prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } })).toEqual(teacher);
    expect(await prisma.staff.findUniqueOrThrow({ where: { id: staffId } })).toEqual(staff);
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: membershipB.id } })).toEqual(membershipB);
    expect((await prisma.membership.findMany({ where: { schoolId: schoolA, userId: targetId } })).every(row => row.status === "REMOVED")).toBe(true);
    expect((await listSchoolUsers(context, { q: "Synthetic shared retirement" })).rows).toHaveLength(0);
    const access = await loadEffectiveSessionAccess(targetId, schoolA);
    expect(access?.memberships.every(row => row.schoolId === schoolB)).toBe(true);
    const audits = await prisma.auditLog.findMany({ where: { schoolId: schoolA, action: "schoolUser.remove" } });
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain(before.email);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe("REVOKED");
  });
  it("refuses foreign, own and platform targets without exposing an editable snapshot", async () => {
    await expect(snapshot(foreignId)).rejects.toMatchObject({ code: "notFound" });
    await expect(snapshot(actorId)).rejects.toMatchObject({ code: "protectedAccount" });
    await expect(snapshot(platformId)).rejects.toMatchObject({ code: "notFound" });
    const membership = await prisma.membership.create({ data: { userId: platformId, schoolId: schoolA, role: "SCHOOL_MANAGER", status: "SUSPENDED" } });
    try { await expect(snapshot(platformId)).rejects.toMatchObject({ code: "protectedAccount" }); }
    finally { await prisma.membership.delete({ where: { id: membership.id } }); }
  });
  it("refuses stale revisions and a revoked actor", async () => {
    const preview = await snapshot();
    await prisma.membership.updateMany({ where: { userId: targetId, schoolId: schoolA }, data: { status: "SUSPENDED" } });
    await expect(removeSchoolUser(context, preview)).rejects.toMatchObject({ code: "removalConflict" });
    await prisma.membership.updateMany({ where: { userId: actorId }, data: { status: "SUSPENDED" } });
    await expect(removeSchoolUser(context, await previewSchoolUserRemoval({ ...context, userId: platformId, isPlatformAdmin: true }, { userId: targetId }))).rejects.toMatchObject({ code: "forbidden" });
  });
  it("preserves the last activated administrator even for a platform actor", async () => {
    const platform = { ...context, userId: platformId, isPlatformAdmin: true };
    const preview = await previewSchoolUserRemoval(platform, { userId: actorId });
    await expect(removeSchoolUser(platform, preview)).rejects.toMatchObject({ code: "lastManager" });
  });
  it("serializes two administrators removing each other and preserves a usable manager", async () => {
    const second = await prisma.user.create({ data: { name: "Synthetic second retirement manager", memberships: { create: { schoolId: schoolA, role: "SCHOOL_MANAGER" } } } });
    try {
      const secondContext = { ...context, userId: second.id };
      const firstSnapshot = await previewSchoolUserRemoval(context, { userId: second.id });
      const secondSnapshot = await previewSchoolUserRemoval(secondContext, { userId: actorId });
      const outcomes = await Promise.allSettled([removeSchoolUser(context, firstSnapshot), removeSchoolUser(secondContext, secondSnapshot)]);
      expect(outcomes.filter(row => row.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter(row => row.status === "rejected")).toHaveLength(1);
      expect(await prisma.membership.count({ where: { schoolId: schoolA, role: "SCHOOL_MANAGER", status: "ACTIVE", permissionRoleId: null, user: { isActive: true, passwordChangeRequired: false } } })).toBe(1);
    } finally { await prisma.user.delete({ where: { id: second.id } }); }
  });
  it("preserves an administrator when retirement races a configurable-role restriction", async () => {
    const second = await prisma.user.create({ data: { name: "Synthetic cross-mutation manager", memberships: { create: { schoolId: schoolA, role: "SCHOOL_MANAGER" } } } });
    const role = await prisma.permissionRole.create({ data: { schoolId: schoolA, name: "Synthetic restriction" } });
    try {
      const preview = await previewSchoolUserRemoval(context, { userId: second.id });
      const actorMembership = await prisma.membership.findFirstOrThrow({ where: { userId: actorId, schoolId: schoolA } });
      const platform = { ...context, userId: platformId, isPlatformAdmin: true };
      const results = await Promise.allSettled([
        removeSchoolUser(context, preview),
        assignSchoolPermissionRole(platform, { expectedSchoolId: schoolA, membershipId: actorMembership.id, permissionRoleId: role.id }),
      ]);
      expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
      expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
      expect(await prisma.membership.count({ where: { schoolId: schoolA, role: "SCHOOL_MANAGER", status: "ACTIVE", permissionRoleId: null, user: { isActive: true, passwordChangeRequired: false } } })).toBeGreaterThanOrEqual(1);
    } finally {
      await prisma.membership.updateMany({ where: { userId: actorId }, data: { permissionRoleId: null, status: "ACTIVE" } });
      await prisma.user.delete({ where: { id: second.id } });
      await prisma.permissionRole.delete({ where: { id: role.id } });
    }
  });
  it("does not allow an old activation, profile editor or professional link to reopen a retired account", async () => {
    await removeSchoolUser(context, await snapshot());
    await expect(changeSchoolUserStatus(context, { userId: targetId, status: "ACTIVE" })).rejects.toMatchObject({ code: "notFound" });
    await expect(getEditableSchoolUser(context, { userId: targetId })).rejects.toMatchObject({ code: "editUnavailable" });
    await expect(getSchoolUserTeacherLink(context, { userId: targetId })).rejects.toMatchObject({ code: "linkUnavailable" });
    await acceptInvitations(targetId, [invitationId]);
    expect((await prisma.membership.findMany({ where: { userId: targetId, schoolId: schoolA } })).every(row => row.status === "REMOVED")).toBe(true);
  });
  it("revalidates invitation holder, expiry and school email policy before any activation", async () => {
    await prisma.invitation.update({ where: { id: invitationId }, data: { email: "another-holder@example.invalid" } });
    await acceptInvitations(targetId, [invitationId]);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe("PENDING");
    const target = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });
    await prisma.invitation.update({ where: { id: invitationId }, data: { email: target.email!, expiresAt: new Date(0) } });
    await acceptInvitations(targetId, [invitationId]);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe("PENDING");
    await prisma.invitation.update({ where: { id: invitationId }, data: { expiresAt: new Date(Date.now() + 3600000) } });
    await prisma.school.update({ where: { id: schoolA }, data: { allowedEmailDomain: "restricted.example.invalid" } });
    try {
      await acceptInvitations(targetId, [invitationId]);
      expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe("PENDING");
    } finally { await prisma.school.update({ where: { id: schoolA }, data: { allowedEmailDomain: null } }); }
  });
  it("serializes concurrent retirement and acceptance of an earlier invitation", async () => {
    const preview = await snapshot();
    const results = await Promise.allSettled([removeSchoolUser(context, preview), acceptInvitations(targetId, [invitationId])]);
    expect(results[1].status).toBe("fulfilled");
    if (results[0].status === "rejected") {
      expect(results[0].reason).toMatchObject({ code: "removalConflict" });
      await removeSchoolUser(context, await snapshot());
    }
    await acceptInvitations(targetId, [invitationId]);
    expect((await prisma.membership.findMany({ where: { userId: targetId, schoolId: schoolA } })).every(row => row.status === "REMOVED")).toBe(true);
  });
});
