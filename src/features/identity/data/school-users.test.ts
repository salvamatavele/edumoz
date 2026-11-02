// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionContext } from "@/features/identity/domain/access";
import { listSchoolUsers } from "./school-users";
import { changeSchoolUserStatus } from "./school-user-status";
const { prisma } = await import("@/lib/db/client");

describe("school user administration", () => {
  const schools: string[] = [], users: string[] = [];
  let actor: string, shared: string, foreign: string, protectedUser: string, disabled: string;
  let context: SessionContext;
  async function user(name: string, schoolId: string, role: "SCHOOL_MANAGER" | "TEACHER" = "TEACHER", extra = {}) {
    const u = await prisma.user.create({ data: { name, email: randomUUID()+"@example.invalid", passwordHash: "Never return this hash", ...extra } });
    users.push(u.id);
    await prisma.membership.create({ data: { userId: u.id, schoolId, role } });
    return u.id;
  }
  beforeAll(async () => {
    for (const letter of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: "M01TEST-"+letter+randomUUID(), name: "Synthetic "+letter, province: "Maputo", district: "KaMpfumu" } })).id);
    actor = await user("Manager A", schools[0], "SCHOOL_MANAGER");
    shared = await user("Shared person", schools[0]);
    await prisma.membership.create({ data: { userId: shared, schoolId: schools[0], role: "GUARDIAN" } });
    await prisma.membership.create({ data: { userId: shared, schoolId: schools[1], role: "GUARDIAN" } });
    await prisma.teacher.create({ data: { schoolId: schools[0], userId: shared, code: "A-PUBLIC", firstName: "Shared", lastName: "Teacher" } });
    await prisma.teacher.create({ data: { schoolId: schools[1], userId: shared, code: "B-SECRET-CODE", firstName: "Shared", lastName: "Other school" } });
    foreign = await user("Foreign B", schools[1]);
    protectedUser = await user("Platform", schools[0], "SCHOOL_MANAGER", { isPlatformAdmin: true });
    disabled = await user("Disabled", schools[0], "TEACHER", { isActive: false });
    context = { userId: actor, schoolId: schools[0], role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null };
    const bulk = Array.from({ length: 30 }, (_, i) => ({ id: randomUUID(), name: "Paged "+String(i).padStart(2,"0"), email: randomUUID()+"@example.invalid" }));
    users.push(...bulk.map(row => row.id));
    await prisma.user.createMany({ data: bulk });
    await prisma.membership.createMany({ data: bulk.map(row => ({ userId: row.id, schoolId: schools[0], role: "TEACHER" as const })) });
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.teacher.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.membership.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.school.deleteMany({ where: { id: { in: schools } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });
  it("does not grant user administration to an existing restricted role", async () => {
    const reader = { ...context, permissionRoleId: "restricted", permissions: [{ resource: "students" as const, action: "view" as const }] };
    await expect(listSchoolUsers(reader, {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(changeSchoolUserStatus(reader, { userId: shared, status: "SUSPENDED" })).rejects.toMatchObject({ code: "forbidden" });
  });
  it("returns one row per school account with only local profiles and no hashes", async () => {
    const result = await listSchoolUsers(context, { q: "Shared" });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ id: shared, roles: ["TEACHER", "GUARDIAN"], codes: ["A-PUBLIC"] });
    expect(JSON.stringify(result)).not.toContain("B-SECRET");
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("Never return");
    expect((await listSchoolUsers(context, { q: "Foreign B" })).rows).toEqual([]);
    expect((await listSchoolUsers(context, { q: "B-SECRET-CODE" })).rows).toEqual([]);
  });
  it("paginates unique users on the server and keeps a stable order", async () => {
    const first = await listSchoolUsers(context, { q: "Paged" });
    const second = await listSchoolUsers(context, { q: "Paged", page: 2 });
    expect(first.filtered).toBe(30); expect(first.rows).toHaveLength(25); expect(first.pageCount).toBe(2);
    expect(second.rows).toHaveLength(5);
    expect(new Set([...first.rows, ...second.rows].map(row => row.id)).size).toBe(30);
    expect((await listSchoolUsers(context, { q: "Paged", page: 999 })).page).toBe(2);
  });
  it("filters linked profiles and global disabled state separately", async () => {
    expect((await listSchoolUsers(context, { link: "teacher" })).rows.map(row => row.id)).toEqual([shared]);
    expect((await listSchoolUsers(context, { status: "DISABLED" })).rows.map(row => row.id)).toEqual([disabled]);
    expect((await listSchoolUsers(context, { q: "Shared", role: "STUDENT" })).rows).toEqual([]);
  });
  it("suspends all local roles, preserves B and global identity, and audits once", async () => {
    await changeSchoolUserStatus(context, { userId: shared, status: "SUSPENDED" });
    expect(await prisma.membership.count({ where: { userId: shared, schoolId: schools[0], status: "SUSPENDED" } })).toBe(2);
    expect(await prisma.membership.count({ where: { userId: shared, schoolId: schools[1], status: "ACTIVE" } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: shared } })).isActive).toBe(true);
    const { loadEffectiveSessionAccess } = await import("@/lib/auth/session-access");
    expect((await loadEffectiveSessionAccess(shared, schools[0]))?.schoolId).toBeNull();
    expect((await loadEffectiveSessionAccess(shared, schools[1]))?.schoolId).toBe(schools[1]);
    await changeSchoolUserStatus(context, { userId: shared, status: "SUSPENDED" });
    expect(await prisma.auditLog.count({ where: { schoolId: schools[0], entityId: shared, action: "schoolUser.suspend" } })).toBe(1);
    expect((await listSchoolUsers(context, { q: "Shared", status: "SUSPENDED" })).rows).toHaveLength(1);
    await changeSchoolUserStatus(context, { userId: shared, status: "ACTIVE" });
    expect(await prisma.membership.count({ where: { userId: shared, schoolId: schools[0], status: "ACTIVE" } })).toBe(2);
  });
  it("refuses foreign, platform and globally disabled targets without writes", async () => {
    for (const [userId, code] of [[foreign,"notFound"],[protectedUser,"protectedAccount"],[disabled,"disabledAccount"]]) {
      await expect(changeSchoolUserStatus(context, { userId, status: "ACTIVE" })).rejects.toMatchObject({ code });
      expect(await prisma.auditLog.count({ where: { entityId: userId } })).toBe(0);
    }
  });
  it("rereads a suspended actor rather than trusting its previously valid context", async () => {
    await prisma.membership.updateMany({ where: { userId: actor, schoolId: schools[0] }, data: { status: "SUSPENDED" } });
    try { await expect(changeSchoolUserStatus(context, { userId: shared, status: "SUSPENDED" })).rejects.toMatchObject({ code: "forbidden" }); }
    finally { await prisma.membership.updateMany({ where: { userId: actor, schoolId: schools[0] }, data: { status: "ACTIVE" } }); }
  });
  it("prevents concurrent removals of the final ordinary full managers", async () => {
    // The platform account is protected but must not conceal an absent school manager.
    await prisma.membership.updateMany({ where: { userId: protectedUser }, data: { status: "SUSPENDED" } });
    const second = await user("Manager A2", schools[0], "SCHOOL_MANAGER");
    const outcomes = await Promise.allSettled([
      changeSchoolUserStatus(context, { userId: actor, status: "SUSPENDED" }),
      changeSchoolUserStatus({ ...context, userId: second }, { userId: second, status: "SUSPENDED" }),
    ]);
    expect(outcomes.filter(value => value.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(value => value.status === "rejected")).toHaveLength(1);
    expect(await prisma.membership.count({ where: { schoolId: schools[0], role: "SCHOOL_MANAGER", status: "ACTIVE", permissionRoleId: null } })).toBe(1);
    await prisma.membership.updateMany({ where: { schoolId: schools[0], role: "SCHOOL_MANAGER" }, data: { status: "ACTIVE" } });
  });
  it("lets a delegated editor manage ordinary accounts without reactivating or suspending school managers", async () => {
    const editor = await user("Delegated editor", schools[0], "SCHOOL_MANAGER");
    const permission = await prisma.permission.upsert({ where: { resource_action: { resource: "users", action: "edit" } }, update: {}, create: { resource: "users", action: "edit" } });
    const role = await prisma.permissionRole.create({ data: { schoolId: schools[0], name: "Delegated editor", permissions: { create: { permissionId: permission.id } } } });
    await prisma.membership.updateMany({ where: { userId: editor, schoolId: schools[0] }, data: { permissionRoleId: role.id } });
    const delegated = { ...context, userId: editor, permissionRoleId: role.id, permissions: [{ resource: "users" as const, action: "edit" as const }] };
    await expect(changeSchoolUserStatus(delegated, { userId: actor, status: "SUSPENDED" })).rejects.toMatchObject({ code: "protectedAccount" });
    await changeSchoolUserStatus(delegated, { userId: shared, status: "SUSPENDED" });
    await changeSchoolUserStatus(delegated, { userId: shared, status: "ACTIVE" });
  });
  it.each([{ page: -1 }, { page: Infinity }, { q: "x".repeat(101) }, { status: "UNKNOWN" }])("rejects malformed read filters %j", async input => {
    await expect(listSchoolUsers(context, input)).rejects.toMatchObject({ code: "invalid" });
  });
});
