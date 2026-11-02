// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionContext } from "../domain/access";
import { getSchoolStaff, listSchoolStaff, saveSchoolStaff } from "./school-staff";
import { getTenantDb } from "@/lib/db/tenant";
const { prisma } = await import("@/lib/db/client");
const schools: string[] = [], users: string[] = [];
let context: SessionContext, restricted: SessionContext, staffId = "", foreignId = "";
const input = (extra = {}) => ({ requestId: randomUUID(), code: randomUUID(), name: "Synthetic employee", jobTitle: "Secretary", ...extra });
async function create(extra = {}) { const values = input(extra); await saveSchoolStaff(context, values); return prisma.staff.findFirstOrThrow({ where: { schoolId: context.schoolId!, code: values.code } }); }
describe("school staff profiles", () => {
  beforeAll(async () => {
    for (const letter of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: `STAFF-${letter}-${randomUUID()}`, name: `Synthetic staff ${letter}`, province: "Maputo", district: "KaMpfumu" } })).id);
    for (const id of schools) users.push((await prisma.user.create({ data: { memberships: { create: { schoolId: id, role: "SCHOOL_MANAGER" } } } })).id);
    context = { userId: users[0], schoolId: schools[0], authVersion: 0, role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [], permissionRoleId: null };
    const role = await prisma.permissionRole.create({ data: { schoolId: schools[0], name: "No staff permissions" } });
    const u = await prisma.user.create({ data: { memberships: { create: { schoolId: schools[0], role: "SCHOOL_MANAGER", permissionRoleId: role.id } } } }); users.push(u.id);
    restricted = { ...context, userId: u.id, permissionRoleId: role.id, permissions: [] };
    staffId = (await create({ code: "P001", documentNumber: "SYNTHETIC-BI", nuit: "123456789", birthDate: "1990-02-28", hireDate: "2020-01-01", gender: "FEMALE", email: "private@example.invalid", notes: "Synthetic private note", userId: users[1], schoolId: schools[1] })).id;
    foreignId = (await prisma.staff.create({ data: { schoolId: schools[1], code: "P001", name: "Foreign staff", jobTitle: "Guard" } })).id;
  });
  afterAll(async () => { await prisma.auditLog.deleteMany({ where: { schoolId: { in: schools } } }); await prisma.staff.deleteMany({ where: { schoolId: { in: schools } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.school.deleteMany({ where: { id: { in: schools } } }); });
  it("stores all professional fields without accepting userId or a foreign school", async () => {
    const row = await getSchoolStaff(context, staffId);
    expect(row).toMatchObject({ code: "P001", documentNumber: "SYNTHETIC-BI", nuit: "123456789", birthDate: "1990-02-28", hireDate: "2020-01-01", gender: "FEMALE", notes: "Synthetic private note" });
    expect((await prisma.staff.findUniqueOrThrow({ where: { id: staffId } })).userId).toBeNull();
    const page = await listSchoolStaff(context, { q: "P001" }); expect(page.rows).toHaveLength(1); expect(JSON.stringify(page)).not.toMatch(/SYNTHETIC-BI|123456789|Synthetic private note/);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: staffId } }); expect(JSON.stringify(audit)).not.toMatch(/SYNTHETIC-BI|123456789|private@example.invalid/);
  });
  it("paginates and filters in SQL and does not expose another school", async () => {
    await prisma.staff.createMany({ data: Array.from({ length: 30 }, (_, index) => ({ schoolId: schools[0], code: `PAGE-${index}`, name: `Paged staff ${index}`, jobTitle: "Synthetic job", isActive: index % 2 === 0 })) });
    const first = await listSchoolStaff(context, { q: "Paged" }); expect(first.rows).toHaveLength(25); expect(first.pageCount).toBe(2);
    expect((await listSchoolStaff(context, { q: "Paged", page: 999 })).rows).toHaveLength(5);
    expect((await listSchoolStaff(context, { q: "Paged", status: "INACTIVE" })).count).toBe(15);
    expect((await listSchoolStaff(context, { q: "Foreign staff" })).count).toBe(0);
    await expect(getSchoolStaff(context, foreignId)).rejects.toMatchObject({ code: "unavailable" });
  });
  it("makes creation retries idempotent and reports local duplicate codes", async () => {
    const values = input(); await Promise.all([saveSchoolStaff(context, values), saveSchoolStaff(context, values)]);
    expect(await prisma.staff.count({ where: { schoolId: schools[0], code: values.code } })).toBe(1);
    await expect(saveSchoolStaff(context, { ...values, name: "Changed uncertain request" })).rejects.toMatchObject({ code: "requestChanged" });
    await expect(saveSchoolStaff(context, input({ code: values.code }))).rejects.toMatchObject({ code: "duplicateCode" });
  });
  it("updates all fields with optimistic concurrency and preserves account linkage", async () => {
    const before = await getSchoolStaff(context, staffId);
    const results = await Promise.allSettled([saveSchoolStaff(context, input({ ...before, jobTitle: "Updated secretary", userId: users[1] })), saveSchoolStaff(context, input({ ...before, jobTitle: "Concurrent overwrite" }))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "conflict" } });
    expect((await prisma.staff.findUniqueOrThrow({ where: { id: staffId } })).userId).toBeNull();
    await expect(saveSchoolStaff(context, input({ ...before, isActive: false }))).rejects.toMatchObject({ code: "conflict" });
  });
  it("enforces runtime scope, persistent membership guards and immutable school/id", async () => {
    const scoped = getTenantDb(schools[0]); expect(await scoped.staff.findFirst({ where: { id: foreignId } })).toBeNull();
    await expect(prisma.staff.update({ where: { id: staffId }, data: { schoolId: schools[1] } })).rejects.toThrow(/TENANT_INTEGRITY/);
    await expect(prisma.staff.update({ where: { id: staffId }, data: { userId: users[1] } })).rejects.toThrow(/TENANT_INTEGRITY/);
  });
  it("does not grant the new resource to an existing restricted manager and rereads authority", async () => {
    await expect(listSchoolStaff(restricted, {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(saveSchoolStaff(restricted, input())).rejects.toMatchObject({ code: "forbidden" });
    await expect(saveSchoolStaff({ ...context, authVersion: 1 }, input())).rejects.toMatchObject({ code: "forbidden" });
    await expect(saveSchoolStaff(context, input({ birthDate: "2026-02-31" }))).rejects.toMatchObject({ code: "invalid" });
    await expect(saveSchoolStaff(context, input({ birthDate: "2999-01-01" }))).rejects.toMatchObject({ code: "invalid" });
  });
});
