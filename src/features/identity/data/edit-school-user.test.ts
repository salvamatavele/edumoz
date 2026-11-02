// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionContext } from "@/features/identity/domain/access";
import { editSchoolUser, getEditableSchoolUser } from "./edit-school-user";
import { listSchoolUsers } from "./school-users";
const { prisma } = await import("@/lib/db/client");
const schools: string[] = [];
const users: string[] = [];
let context: SessionContext;
let restricted: SessionContext;
let target = "", shared = "", foreign = "", platform = "";
async function makeUser(schoolId: string, data = {}) {
  const user = await prisma.user.create({ data: { name: "Synthetic edit account", memberships: { create: { schoolId, role: "TEACHER" } }, ...data } });
  users.push(user.id); return user.id;
}
const snapshot = (id: string) => getEditableSchoolUser(context, { userId: id });

describe("school-exclusive identity editing", () => {
  beforeAll(async () => {
    for (const letter of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: `EDIT-${letter}-${randomUUID()}`, name: `Synthetic edit ${letter}`, province: "Maputo", district: "KaMpfumu" } })).id);
    const actor = await makeUser(schools[0], { memberships: { create: { schoolId: schools[0], role: "SCHOOL_MANAGER" } } });
    context = { userId: actor, authVersion: 0, isPlatformAdmin: false, schoolId: schools[0], role: "SCHOOL_MANAGER", permissionRoleId: null, memberships: [] };
    target = await makeUser(schools[0], { email: `${randomUUID()}@example.invalid`, phone: `legacy-${randomUUID()}`, loginCode: `EDU-${randomUUID()}`, passwordHash: "preserved-synthetic-hash" });
    shared = await makeUser(schools[0]);
    await prisma.membership.create({ data: { userId: shared, schoolId: schools[1], role: "GUARDIAN", status: "SUSPENDED" } });
    foreign = await makeUser(schools[1]); platform = await makeUser(schools[0], { isPlatformAdmin: true });
    const permission = await prisma.permission.upsert({ where: { resource_action: { resource: "users", action: "edit" } }, update: {}, create: { resource: "users", action: "edit" } });
    const role = await prisma.permissionRole.create({ data: { schoolId: schools[0], name: "Synthetic edit delegate", permissions: { create: { permissionId: permission.id } } } });
    const delegated = await makeUser(schools[0], { memberships: { create: { schoolId: schools[0], role: "SCHOOL_MANAGER", permissionRoleId: role.id } } });
    restricted = { ...context, userId: delegated, permissionRoleId: role.id, permissions: [{ resource: "users", action: "edit" }] };
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.school.deleteMany({ where: { id: { in: schools } } });
  });
  it("returns a minimal snapshot without exposing login identifiers or credentials", async () => {
    expect(Object.keys(await snapshot(target)).sort()).toEqual(["email", "name", "phone", "revision", "userId"]);
    expect(await snapshot(target)).toMatchObject({ email: "", phone: "" });
  });
  it("normalizes communication contacts and preserves login, access and credentials even with forged fields", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: target } });
    await editSchoolUser(context, { ...await snapshot(target), name: " Corrected synthetic name ", email: " CONTACT@EXAMPLE.INVALID ", phone: "841234567", isPlatformAdmin: true, emailVerified: new Date(), authVersion: 99, loginCode: "ATTACK", passwordHash: "ATTACK", schoolId: schools[1], roles: ["SCHOOL_MANAGER"] });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: target } });
    expect(after).toMatchObject({ name: "Corrected synthetic name", contactEmail: "contact@example.invalid", contactPhone: "+258841234567", email: before.email, phone: before.phone, loginCode: before.loginCode, passwordHash: before.passwordHash, authVersion: before.authVersion, emailVerified: before.emailVerified, isPlatformAdmin: false });
    expect((await listSchoolUsers(context, { q: "Corrected synthetic name" })).rows[0]).toMatchObject({ email: "contact@example.invalid", phone: "+258841234567", roles: ["TEACHER"] });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: target, action: "schoolUser.update" } });
    expect(audit.after).toEqual({ changedFields: ["name", "contactEmail", "contactPhone"] });
    expect(JSON.stringify(audit)).not.toContain("contact@example.invalid"); expect(JSON.stringify(audit)).not.toContain(before.email);
  });
  it.each(["missing", "shared", "foreign", "platform"])("refuses %s with the same unavailable result for read and write", async kind => {
    const userId = ({ missing: "nonexistent", shared, foreign, platform })[kind]!;
    await expect(snapshot(userId)).rejects.toMatchObject({ code: "editUnavailable" });
    await expect(editSchoolUser(context, { userId, revision: new Date().toISOString(), name: "Forbidden synthetic edit" })).rejects.toMatchObject({ code: "editUnavailable" });
  });
  it("rejects stale forms and simultaneous writes instead of losing changes", async () => {
    const original = await snapshot(target);
    const results = await Promise.allSettled([editSchoolUser(context, { ...original, name: "Concurrent first" }), editSchoolUser(context, { ...original, name: "Concurrent second" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "editConflict" } });
    expect(new Date((await snapshot(target)).revision).getTime()).toBeGreaterThan(new Date(original.revision).getTime());
    await expect(editSchoolUser(context, { ...original, name: "Stale overwrite" })).rejects.toMatchObject({ code: "editConflict" });
  });
  it("allows a no-op without adding an audit event and clears communication contacts explicitly", async () => {
    const original = await snapshot(target);
    const count = await prisma.auditLog.count({ where: { entityId: target } });
    await editSchoolUser(context, original);
    expect(await prisma.auditLog.count({ where: { entityId: target } })).toBe(count);
    await editSchoolUser(context, { ...original, email: "", phone: "" });
    expect(await snapshot(target)).toMatchObject({ email: "", phone: "" });
  });
  it("does not use duplicate contacts to discover or bind an identity in another school", async () => {
    const email = `${randomUUID()}@example.invalid`;
    await prisma.user.update({ where: { id: foreign }, data: { contactEmail: email } });
    await editSchoolUser(context, { ...await snapshot(target), email });
    expect(await snapshot(target)).toMatchObject({ email });
    expect(await prisma.membership.count({ where: { userId: target, schoolId: schools[1] } })).toBe(0);
  });
  it("delegated editors can edit teachers but cannot edit a manager", async () => {
    await expect(getEditableSchoolUser(restricted, { userId: target })).resolves.toMatchObject({ userId: target });
    await editSchoolUser(restricted, { ...await snapshot(target), name: "Edited by delegated actor" });
    await expect(getEditableSchoolUser(restricted, { userId: context.userId })).rejects.toMatchObject({ code: "editUnavailable" });
  });
  it("rereads revoked authority, auth version, activation and initial credential obligations", async () => {
    const delegate = await prisma.membership.findFirstOrThrow({ where: { userId: restricted.userId } });
    for (const change of [{ authVersion: 1 }, { passwordChangeRequired: true }, { isActive: false }]) {
      await prisma.user.update({ where: { id: restricted.userId }, data: change });
      await expect(getEditableSchoolUser(restricted, { userId: target })).rejects.toMatchObject({ code: "forbidden" });
      await prisma.user.update({ where: { id: restricted.userId }, data: { authVersion: 0, passwordChangeRequired: false, isActive: true } });
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: delegate.permissionRoleId! } });
    await expect(editSchoolUser(restricted, { ...await snapshot(target), name: "Revoked overwrite" })).rejects.toMatchObject({ code: "forbidden" });
  });
  it("rejects invalid inputs and read-only sessions without changes", async () => {
    await expect(editSchoolUser(context, { ...await snapshot(target), phone: "123" })).rejects.toMatchObject({ code: "invalid" });
    await expect(getEditableSchoolUser({ ...context, role: "TEACHER" }, { userId: target })).rejects.toMatchObject({ code: "forbidden" });
    await expect(editSchoolUser({ ...context, schoolId: null }, {})).rejects.toMatchObject({ code: "forbidden" });
  });
});
