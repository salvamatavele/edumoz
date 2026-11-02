// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionContext } from "@/features/identity/domain/access";
import { getSchoolUserTeacherLink, previewSchoolUserTeacherLink, changeSchoolUserTeacherLink } from "./school-user-teacher-link";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
const { prisma } = await import("@/lib/db/client");
const schools: string[] = [], users: string[] = [];
let context: SessionContext;
let shared = "", foreign = "", platform = "", noRole = "", restricted = "", permissionRoleId = "", foreignProfile = "";
async function user(schoolId: string, role: "TEACHER" | "GUARDIAN" | "SCHOOL_MANAGER" = "TEACHER", extra = {}) {
  const u = await prisma.user.create({ data: { name: "Synthetic teacher link", ...extra, memberships: { create: { schoolId, role } } } }); users.push(u.id); return u.id;
}
async function teacher(schoolId = schools[0], extra = {}) {
  return prisma.teacher.create({ data: { schoolId, code: randomUUID(), firstName: "Synthetic", lastName: "Teacher", ...extra } });
}
async function current(userId = shared) { return getSchoolUserTeacherLink(context, { userId }); }
async function prepare(code: string, userId = shared) {
  const link = await current(userId);
  return previewSchoolUserTeacherLink(context, { userId, expectedRevision: link.revision, expectedTeacherId: link.teacher?.id ?? null, expectedTeacherRevision: link.teacher?.revision ?? null, teacherCode: code });
}
function changeInput(p: Awaited<ReturnType<typeof prepare>>) {
  return { userId: p.userId, expectedRevision: p.revision, expectedTeacherId: p.teacher?.id ?? null, expectedTeacherRevision: p.teacher?.revision ?? null, teacherId: p.candidate?.id ?? null, teacherRevision: p.candidate?.revision ?? null };
}
describe("local teacher profile links", () => {
  beforeAll(async () => {
    for (const letter of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: `LINK-${letter}-${randomUUID()}`, name: `Synthetic links ${letter}`, province: "Maputo", district: "KaMpfumu" } })).id);
    context = { userId: await user(schools[0], "SCHOOL_MANAGER"), authVersion: 0, role: "SCHOOL_MANAGER", schoolId: schools[0], isPlatformAdmin: false, permissionRoleId: null, memberships: [] };
    shared = await user(schools[0]); await prisma.membership.create({ data: { userId: shared, schoolId: schools[1], role: "TEACHER" } });
    foreign = await user(schools[1]); platform = await user(schools[0], "TEACHER", { isPlatformAdmin: true }); noRole = await user(schools[0], "GUARDIAN");
    foreignProfile = (await teacher(schools[1], { userId: shared, code: "FOREIGN-ONLY-CODE" })).id;
    const permission = await prisma.permission.upsert({ where: { resource_action: { resource: "users", action: "edit" } }, create: { resource: "users", action: "edit" }, update: {} });
    permissionRoleId = (await prisma.permissionRole.create({ data: { schoolId: schools[0], name: "Link editor", permissions: { create: { permissionId: permission.id } } } })).id;
    restricted = await user(schools[0], "SCHOOL_MANAGER");
    await prisma.membership.updateMany({ where: { schoolId: schools[0], userId: restricted }, data: { permissionRoleId } });
  });
  afterAll(async () => {
    await withTransactionRetry(() => prisma.$transaction(async tx => {
      await tx.auditLog.deleteMany({ where: { schoolId: { in: schools } } });
      await tx.teacher.deleteMany({ where: { schoolId: { in: schools } } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
      await tx.school.deleteMany({ where: { id: { in: schools } } });
    }, { isolationLevel: "ReadCommitted" }));
  });
  it("links a shared identity only in A, with a named preview and no change to global identity or B", async () => {
    const t = await teacher(); const before = await prisma.user.findUniqueOrThrow({ where: { id: shared } });
    const p = await prepare(t.code); expect(p.teacher).toBeNull(); expect(p.candidate).toMatchObject({ id: t.id, name: "Synthetic Teacher", code: t.code });
    await changeSchoolUserTeacherLink(context, { ...changeInput(p), schoolId: schools[1], isPlatformAdmin: true, role: "SCHOOL_MANAGER" });
    expect(await findTeacherByUserId(schools[0], shared)).toMatchObject({ id: t.id });
    expect(await findTeacherByUserId(schools[1], shared)).toMatchObject({ id: foreignProfile });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: shared } })).toEqual(before);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: shared, action: "schoolUser.teacherLink.update" } });
    expect(audit.before).toEqual({ teacherId: null }); expect(audit.after).toEqual({ teacherId: t.id }); expect(JSON.stringify(audit)).not.toContain("FOREIGN-ONLY-CODE");
  });
  it("replaces and unlinks without deleting profiles or changing memberships' roles/status", async () => {
    const old = (await current()).teacher!; const t = await teacher();
    const before = await prisma.membership.findMany({ where: { userId: shared }, select: { schoolId: true, role: true, status: true } });
    await changeSchoolUserTeacherLink(context, changeInput(await prepare(t.code)));
    expect((await prisma.teacher.findUniqueOrThrow({ where: { id: old.id } })).userId).toBeNull();
    expect(await findTeacherByUserId(schools[0], shared)).toMatchObject({ id: t.id });
    await changeSchoolUserTeacherLink(context, changeInput(await prepare("")));
    expect(await findTeacherByUserId(schools[0], shared)).toBeNull(); expect(await prisma.teacher.findUnique({ where: { id: t.id } })).not.toBeNull();
    expect(await prisma.membership.findMany({ where: { userId: shared }, select: { schoolId: true, role: true, status: true } })).toEqual(before);
    expect(await findTeacherByUserId(schools[1], shared)).toMatchObject({ id: foreignProfile });
  });
  it("invalidates an old empty snapshot after a link/unlink cycle", async () => {
    const t = await teacher(); const stale = await prepare(t.code);
    await changeSchoolUserTeacherLink(context, changeInput(stale));
    await changeSchoolUserTeacherLink(context, changeInput(await prepare("")));
    await expect(changeSchoolUserTeacherLink(context, changeInput(stale))).rejects.toMatchObject({ code: "linkConflict" });
  });
  it("refuses unknown, foreign, occupied and inactive profiles without removing the existing link", async () => {
    const t = await teacher(); await changeSchoolUserTeacherLink(context, changeInput(await prepare(t.code)));
    const occupied = await teacher(schools[0], { userId: await user(schools[0]) }); const inactive = await teacher(schools[0], { isActive: false });
    for (const code of ["missing-code", "FOREIGN-ONLY-CODE", occupied.code, inactive.code]) await expect(prepare(code)).rejects.toMatchObject({ code: "linkUnavailable" });
    expect((await current()).teacher?.id).toBe(t.id);
  });
  it("rechecks candidate revision and occupancy after preview", async () => {
    const t = await teacher(); const p = await prepare(t.code); const original = (await current()).teacher;
    await prisma.teacher.update({ where: { id: t.id }, data: { userId: await user(schools[0]) } });
    await expect(changeSchoolUserTeacherLink(context, changeInput(p))).rejects.toMatchObject({ code: "linkUnavailable" });
    expect((await current()).teacher).toEqual(original);
  });
  it("does not assign roles implicitly and allows removal after the teacher role was suspended", async () => {
    const t = await teacher(); await expect(prepare(t.code, noRole)).rejects.toMatchObject({ code: "linkUnavailable" });
    const p = await prepare(t.code); await changeSchoolUserTeacherLink(context, changeInput(p));
    await prisma.membership.updateMany({ where: { schoolId: schools[0], userId: shared, role: "TEACHER" }, data: { status: "SUSPENDED" } });
    await expect(prepare((await teacher()).code)).rejects.toMatchObject({ code: "linkUnavailable" });
    await changeSchoolUserTeacherLink(context, changeInput(await prepare("")));
    await prisma.membership.updateMany({ where: { schoolId: schools[0], userId: shared }, data: { status: "ACTIVE" } });
  });
  it.each(["foreign", "platform", "missing"])("refuses %s targets without details", async kind => {
    await expect(current(({ foreign, platform, missing: "does-not-exist" })[kind]!)).rejects.toMatchObject({ code: "linkUnavailable" });
  });
  it("does not duplicate audit on an unchanged link", async () => {
    const t = await teacher(); await changeSchoolUserTeacherLink(context, changeInput(await prepare(t.code)));
    const count = await prisma.auditLog.count({ where: { entityId: shared } });
    await changeSchoolUserTeacherLink(context, changeInput(await prepare(t.code)));
    expect(await prisma.auditLog.count({ where: { entityId: shared } })).toBe(count);
  });
  it("serializes competing targets for the same profile", async () => {
    const t = await teacher(); const other = await user(schools[0]); const a = await prepare(t.code), b = await prepare(t.code, other);
    const result = await Promise.allSettled([changeSchoolUserTeacherLink(context, changeInput(a)), changeSchoolUserTeacherLink(context, changeInput(b))]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.teacher.count({ where: { id: t.id, userId: { in: [shared, other] } } })).toBe(1);
  });
  it("rereads permissions and protects managers from delegated editors", async () => {
    const delegated = { ...context, userId: restricted, permissionRoleId, permissions: [{ resource: "users" as const, action: "edit" as const }] };
    await expect(getSchoolUserTeacherLink(delegated, { userId: shared })).resolves.toMatchObject({ userId: shared });
    await expect(getSchoolUserTeacherLink(delegated, { userId: context.userId })).rejects.toMatchObject({ code: "linkUnavailable" });
    await prisma.rolePermission.deleteMany({ where: { roleId: permissionRoleId } });
    await expect(getSchoolUserTeacherLink(delegated, { userId: shared })).rejects.toMatchObject({ code: "forbidden" });
    await expect(getSchoolUserTeacherLink({ ...context, authVersion: 1 }, { userId: shared })).rejects.toMatchObject({ code: "forbidden" });
  });
});
