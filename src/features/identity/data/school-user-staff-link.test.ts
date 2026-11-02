// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import type { SessionContext } from "../domain/access";
import { changeSchoolUserStaffLink, getSchoolUserStaffLink, previewSchoolUserStaffLink } from "./school-user-staff-link";
const { prisma } = await import("@/lib/db/client");
const schools: string[] = [], users: string[] = [];
let context: SessionContext, target = "", family = "", teacherA = "", staffB = "";
async function account(schoolId: string, role: "SCHOOL_MANAGER" | "TEACHER" | "STUDENT" = "TEACHER") { const u = await prisma.user.create({ data: { name: "Synthetic professional", memberships: { create: { schoolId, role } } } }); users.push(u.id); return u.id; }
async function staff(extra = {}) { return prisma.staff.create({ data: { schoolId: schools[0], code: randomUUID(), name: "Synthetic staff", jobTitle: "Secretary", ...extra } }); }
async function preview(code: string, userId = target) { const link = await getSchoolUserStaffLink(context, { userId }); return previewSchoolUserStaffLink(context, { userId, expectedRevision: link.revision, expectedProfileId: link.profile?.id ?? null, expectedProfileRevision: link.profile?.revision ?? null, profileCode: code }); }
const mutation = (p: Awaited<ReturnType<typeof preview>>) => ({ userId: p.userId, expectedRevision: p.revision, expectedProfileId: p.profile?.id ?? null, expectedProfileRevision: p.profile?.revision ?? null, profileId: p.candidate?.id ?? null, profileRevision: p.candidate?.revision ?? null });
describe("staff identity links and dual professional profiles", () => {
  beforeAll(async () => {
    for (const letter of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: `STAFF-LINK-${letter}-${randomUUID()}`, name: `Synthetic professional ${letter}`, province: "Maputo", district: "KaMpfumu" } })).id);
    context = { userId: await account(schools[0], "SCHOOL_MANAGER"), schoolId: schools[0], role: "SCHOOL_MANAGER", isPlatformAdmin: false, authVersion: 0, memberships: [], permissionRoleId: null };
    target = await account(schools[0]); await prisma.membership.create({ data: { userId: target, schoolId: schools[1], role: "TEACHER" } }); family = await account(schools[0], "STUDENT");
    teacherA = (await prisma.teacher.create({ data: { schoolId: schools[0], userId: target, code: "DUAL", firstName: "Synthetic", lastName: "Teacher" } })).id;
    staffB = (await staff({ schoolId: schools[1], userId: target, code: "OTHER-SCHOOL" })).id;
  });
  afterAll(async () => { await prisma.auditLog.deleteMany({ where: { schoolId: { in: schools } } }); await prisma.staff.deleteMany({ where: { schoolId: { in: schools } } }); await prisma.teacher.deleteMany({ where: { schoolId: { in: schools } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.school.deleteMany({ where: { id: { in: schools } } }); });
  it("links, replaces and unlinks Staff while preserving Teacher, B and global identity", async () => {
    const beforeTeacher = await prisma.teacher.findUniqueOrThrow({ where: { id: teacherA } }), beforeB = await prisma.staff.findUniqueOrThrow({ where: { id: staffB } }), beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: target } });
    const a = await staff(), b = await staff();
    const first = await preview(a.code); expect(first.candidate).toMatchObject({ id: a.id, name: "Synthetic staff" });
    await changeSchoolUserStaffLink(context, { ...mutation(first), schoolId: schools[1], role: "SCHOOL_MANAGER", isPlatformAdmin: true });
    await changeSchoolUserStaffLink(context, mutation(await preview(b.code)));
    expect((await prisma.staff.findUniqueOrThrow({ where: { id: a.id } })).userId).toBeNull();
    await changeSchoolUserStaffLink(context, mutation(await preview("")));
    expect((await prisma.staff.findUniqueOrThrow({ where: { id: b.id } })).userId).toBeNull();
    expect(await prisma.teacher.findUniqueOrThrow({ where: { id: teacherA } })).toEqual(beforeTeacher); expect(await prisma.staff.findUniqueOrThrow({ where: { id: staffB } })).toEqual(beforeB); expect(await prisma.user.findUniqueOrThrow({ where: { id: target } })).toEqual(beforeUser);
    const audits = await prisma.auditLog.findMany({ where: { entityId: target, action: "schoolUser.staffLink.update" } }); expect(audits).toHaveLength(3); expect(JSON.stringify(audits)).not.toContain("Synthetic staff"); expect(JSON.stringify(audits)).not.toContain("OTHER-SCHOOL");
  });
  it("rejects external, inactive and occupied profiles and direct forged foreign IDs", async () => {
    const a = await staff(); await changeSchoolUserStaffLink(context, mutation(await preview(a.code)));
    const inactive = await staff({ isActive: false }), occupied = await staff({ userId: await account(schools[0]) });
    for (const code of ["OTHER-SCHOOL", inactive.code, occupied.code, "missing-code"]) await expect(preview(code)).rejects.toMatchObject({ code: "linkUnavailable" });
    const p = await preview(""); const foreign = await prisma.staff.findUniqueOrThrow({ where: { id: staffB } });
    await expect(changeSchoolUserStaffLink(context, { ...mutation(p), profileId: foreign.id, profileRevision: foreign.updatedAt.toISOString() })).rejects.toMatchObject({ code: "linkUnavailable" });
    expect((await getSchoolUserStaffLink(context, { userId: target })).profile?.id).toBe(a.id);
  });
  it("rejects an outdated candidate and a stale empty snapshot without removing the existing link", async () => {
    const a = await staff(); const p = await preview(a.code); await prisma.staff.update({ where: { id: a.id }, data: { name: "Changed name" } });
    await expect(changeSchoolUserStaffLink(context, mutation(p))).rejects.toMatchObject({ code: "linkUnavailable" });
    await changeSchoolUserStaffLink(context, mutation(await preview("")));
    const stale = await preview(a.code); await changeSchoolUserStaffLink(context, mutation(stale)); await changeSchoolUserStaffLink(context, mutation(await preview("")));
    await expect(changeSchoolUserStaffLink(context, mutation(stale))).rejects.toMatchObject({ code: "linkConflict" });
  });
  it("does not turn a student into staff and rereads role status before confirmation", async () => {
    const a = await staff(); await expect(preview(a.code, family)).rejects.toMatchObject({ code: "linkUnavailable" });
    const p = await preview(a.code); await prisma.membership.updateMany({ where: { userId: target, schoolId: schools[0] }, data: { status: "SUSPENDED" } });
    await expect(changeSchoolUserStaffLink(context, mutation(p))).rejects.toMatchObject({ code: "linkConflict" });
    await prisma.membership.updateMany({ where: { userId: target, schoolId: schools[0] }, data: { status: "ACTIVE" } });
  });
  it("serializes competing accounts and preserves the losing account's previous link", async () => {
    const a = await staff(), other = await account(schools[0]); const p = await preview(a.code), q = await preview(a.code, other);
    const result = await Promise.allSettled([changeSchoolUserStaffLink(context, mutation(p)), changeSchoolUserStaffLink(context, mutation(q))]); expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(await prisma.staff.count({ where: { id: a.id, userId: { in: [target, other] } } })).toBe(1);
    await expect(getSchoolUserStaffLink({ ...context, authVersion: 1 }, { userId: target })).rejects.toMatchObject({ code: "forbidden" });
  });
});
