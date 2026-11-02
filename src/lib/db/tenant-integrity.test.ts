// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildIntegrity, parseModels, scopePath } from "../../../scripts/tenant-integrity-model";
import { prisma } from "./client";
import { createIntegrityFixture, removeIntegrityFixtures, type IntegrityFixture } from "./tenant-integrity-fixtures";
import { TENANT_MODEL_METADATA } from "./tenant-model-metadata";
import { getTenantDb } from "./tenant";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/config");
const { enrollStudent } = await import("@/features/academic/actions/enroll-student");

const schema = readFileSync("prisma/schema.prisma", "utf8");
const generated = buildIntegrity(schema);
const models = parseModels(schema);
interface Delegate { create(args: { data: Record<string, unknown> }): Promise<unknown>; }
function delegate(model: string) { return (prisma as unknown as Record<string, Delegate>)[model[0].toLowerCase() + model.slice(1)]; }
const foreignSchoolCases = Object.entries(models).flatMap(([model, metadata]) => {
  const scopedRelations = Object.values(metadata.relations).filter(relation => relation.field && relation.target !== "School" && scopePath(models, relation.target, "school"));
  return scopedRelations.length > 1 || metadata.fields.includes("schoolId") ? scopedRelations.map(relation => ({ model, relation })) : [];
}).filter(({ model }) => !["Invitation", "AuditLog"].includes(model));
const foreignYearCases = Object.entries(models).flatMap(([model, metadata]) => {
  const relations = Object.values(metadata.relations).filter(relation => relation.field && scopePath(models, relation.target, "year"));
  return relations.length > 1 ? relations.map(relation => ({ model, relation })) : [];
});

describe("persisted tenant integrity", () => {
  const fixtures: IntegrityFixture[] = [];
  const schoolIds: string[] = [];
  let a: IntegrityFixture, b: IntegrityFixture, nextYear: IntegrityFixture;
  beforeAll(async () => {
    const schools = await Promise.all(["A", "B"].map(letter => prisma.school.create({ data: { code: `INTEGRITY-${letter}-${randomUUID()}`, name: `Synthetic ${letter}`, province: "Maputo", district: "KaMpfumu" } })));
    schoolIds.push(...schools.map(school => school.id));
    a = await createIntegrityFixture(schools[0].id, 2026); fixtures.push(a);
    b = await createIntegrityFixture(schools[1].id, 2026); fixtures.push(b);
    nextYear = await createIntegrityFixture(schools[0].id, 2027); fixtures.push(nextYear);
  }, 30000);
  afterAll(async () => { if (fixtures.length) await removeIntegrityFixtures(fixtures); await prisma.school.deleteMany({ where: { id: { in: schoolIds } } }); });

  it("keeps the checked-in migration and runtime metadata synchronized with the schema", () => {
    const parsedForeignKeys = Object.values(models).flatMap(model => Object.values(model.relations)).filter(relation => relation.field);
    expect(parsedForeignKeys.length).toBe([...schema.matchAll(/@relation\([^\n]*fields:/g)].length);
    expect(Object.keys(models).filter(model => !scopePath(models, model, "school")).sort()).toEqual(["Account", "AuthSession", "AuthThrottle", "Permission", "Session", "User", "VerificationToken"]);
    expect(TENANT_MODEL_METADATA).toEqual(generated.metadata);
    const historicalSchema = schema.replace(/\nmodel MembershipPermissionOverride \{[\s\S]*?\n\}\n/, "\n").replace(/\nmodel MembershipPermissionRole \{[\s\S]*?\n\}\n/, "\n").replace(/\nmodel Staff \{[\s\S]*?\n\}\n/, "\n").replace(/^  staffProfiles Staff\[\]\n/gm, "");
    expect(readFileSync("prisma/migrations/20261028000000_enforce_tenant_integrity/migration.sql", "utf8")).toBe(buildIntegrity(historicalSchema).sql);
    const staffMigration = readFileSync("prisma/migrations/20261030000000_school_staff/migration.sql", "utf8");
    for (const statement of generated.statements.filter(statement => statement.startsWith("CREATE TRIGGER `tenant_Staff_"))) expect(staffMigration).toContain(statement + ";");
    const assignmentMigration = readFileSync("prisma/migrations/20261031010000_membership_permission_roles/migration.sql", "utf8");
    for (const statement of generated.statements.filter(statement => statement.startsWith("CREATE TRIGGER `tenant_MembershipPermissionRole_"))) expect(assignmentMigration).toContain(statement + ";");
    const overrideMigration = readFileSync("prisma/migrations/20261101010000_override_tenant_guards/migration.sql", "utf8");
    for (const statement of generated.statements.filter(statement => statement.startsWith("CREATE TRIGGER `tenant_MembershipPermissionOverride_"))) expect(overrideMigration).toContain(statement + ";");
  });
  it("installs all declared persistent guards", async () => {
    const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*) AS total FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME LIKE 'tenant_%'`;
    expect(Number(rows[0].total)).toBe(generated.statements.filter(statement => statement.startsWith("CREATE TRIGGER")).length);
  });
  it.each(foreignSchoolCases)("rejects a foreign school at $model.$relation.field even through raw Prisma", async ({ model, relation }) => {
    if (!a.rows[model] || !b.rows[relation.target]) throw Error(`Missing fixture ${model} or ${relation.target}`);
    const data = { ...a.rows[model], ...(models[model].fields.includes("id") ? { id: randomUUID() } : {}), [relation.field]: b.rows[relation.target][relation.reference] };
    await expect(delegate(model).create({ data })).rejects.toThrow(/TENANT_INTEGRITY/);
  });
  it.each(foreignYearCases)("rejects a foreign year at $model.$relation.field in the same school", async ({ model, relation }) => {
    const data = { ...a.rows[model], ...(models[model].fields.includes("id") ? { id: randomUUID() } : {}), [relation.field]: nextYear.rows[relation.target][relation.reference] };
    await expect(delegate(model).create({ data })).rejects.toThrow(/TENANT_INTEGRITY/);
  });
  it("scopes all school junction models and their aggregate counts through their parents", async () => {
    const db = getTenantDb(a.schoolId);
    for (const model of ["studentGuardian", "teachingGroupMember", "assessmentComponent", "attendanceRecord", "invoiceLine", "rolePermission", "membershipPermissionRole", "membershipPermissionOverride"]) {
      const rows = await (db as unknown as Record<string, { count(): Promise<number> }>)[model].count();
      expect(rows).toBe(2); // Two years of A, no rows from B.
    }
    await expect(db.assessmentComponent.findUnique({ where: { id: String(b.rows.AssessmentComponent.id) } })).resolves.toBeNull();
    await expect(db.assessmentComponent.create({ data: { schemeId: String(b.rows.AssessmentScheme.id), code: "blocked", name: "Blocked", weight: "1" } })).rejects.toThrow(/scoped parent/);
    await expect(db.membershipPermissionOverride.create({ data: { membershipId: String(b.rows.Membership.id), permissionId: String(b.rows.MembershipPermissionOverride.permissionId), allowed: false } })).rejects.toThrow(/scoped parent/);
    await expect(prisma.membershipPermissionOverride.update({ where: { id: String(a.rows.MembershipPermissionOverride.id) }, data: { membershipId: String(b.rows.Membership.id) } })).rejects.toThrow(/TENANT_INTEGRITY/);
  });
  it("scopes inverse relation counts from the shared permission catalog", async () => {
    const db = getTenantDb(a.schoolId);
    const permission = await db.permission.findUnique({ where: { resource_action: { resource: "students", action: "view" } }, select: { roles: true, membershipOverrides: true, _count: { select: { roles: true, membershipOverrides: true } } } });
    expect(permission?.roles).toHaveLength(2);
    expect(permission?._count.roles).toBe(2);
    expect(permission?.membershipOverrides).toHaveLength(2);
    expect(permission?._count.membershipOverrides).toBe(2);
  });
  it.each([
    ["studentId", "Student", "foreign-school"], ["classGroupId", "ClassGroup", "foreign-school"],
    ["studyPathId", "StudyPath", "foreign-school"], ["classGroupId", "ClassGroup", "foreign-year"],
    ["studyPathId", "StudyPath", "foreign-year"],
  ] as const)("returns field feedback for forged enrollment %s (%s/%s) without writing", async (field, model, kind) => {
    await prisma.academicYear.update({ where: { id: String(a.rows.AcademicYear.id) }, data: { isActive: true } });
    vi.mocked(auth).mockResolvedValue({ user: { id: a.rows.User.id }, schoolId: a.schoolId, role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
    const before = await prisma.enrollment.count({ where: { schoolId: a.schoolId } });
    const result = await enrollStudent({ studentId: String(a.rows.Student.id), classGroupId: String(a.rows.ClassGroup.id), studyPathId: String(a.rows.StudyPath.id), number: "forged", [field]: String((kind === "foreign-school" ? b : nextYear).rows[model].id) });
    expect(result).toMatchObject({ status: "error", fieldErrors: { [field]: expect.any(String) } });
    expect(await prisma.enrollment.count({ where: { schoolId: a.schoolId } })).toBe(before);
    expect(await prisma.auditLog.count({ where: { schoolId: a.schoolId } })).toBe(0);
  });
  it("rejects forged nested connect/create/update and rolls back their parent writes", async () => {
    const db = getTenantDb(a.schoolId);
    await expect(db.student.update({ where: { id: String(a.rows.Student.id) }, data: { firstName: "Changed", guardians: { create: { guardianId: String(b.rows.Guardian.id), relationship: "MOTHER" } } } })).rejects.toThrow(/TENANT_INTEGRITY/);
    expect((await prisma.student.findUnique({ where: { id: String(a.rows.Student.id) } }))?.firstName).toBe("Synthetic");
    await expect(db.student.update({ where: { id: String(a.rows.Student.id) }, data: { guardians: { update: { where: { studentId_guardianId: { studentId: String(a.rows.Student.id), guardianId: String(a.rows.Guardian.id) } }, data: { guardian: { connect: { id: String(b.rows.Guardian.id) } } } } } } })).rejects.toThrow();
    await expect(db.student.update({ where: { id: String(a.rows.Student.id) }, data: { schoolId: a.schoolId, guardians: { create: { guardianId: String(a.rows.Guardian.id), relationship: "MOTHER", student: { update: { schoolId: b.schoolId } } } } } as never })).rejects.toThrow(/schoolId/);
  });
  it("protects global identity while allowing safe related presentation", async () => {
    const db = getTenantDb(a.schoolId);
    await expect(db.membership.findMany({ include: { user: true } })).rejects.toThrow(/safe explicit select/);
    const rows = await db.membership.findMany({ select: { user: { select: { name: true, email: true } } } });
    expect(rows.length).toBe(2);
    await expect(db.membership.findMany({ select: { user: { select: { memberships: true } } } })).rejects.toThrow(/safe explicit select/);
    await expect(db.membership.update({ where: { id: String(a.rows.Membership.id) }, data: { user: { update: { isPlatformAdmin: true } } } })).rejects.toThrow(/Global relation/);
    expect(await db.school.count()).toBe(1);
    expect((await db.school.findMany())[0].id).toBe(a.schoolId);
  });
  it("prevents parent scope mutation during a concurrent reference creation", async () => {
    const results = await Promise.allSettled([
      prisma.subject.update({ where: { id: String(a.rows.Subject.id) }, data: { schoolId: b.schoolId } }),
      prisma.curriculumSubject.create({ data: { schoolId: a.schoolId, studyPathId: String(nextYear.rows.StudyPath.id), subjectId: String(a.rows.Subject.id), scope: "CORE" } }),
    ]);
    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("fulfilled");
    expect((await prisma.subject.findUnique({ where: { id: String(a.rows.Subject.id) } }))?.schoolId).toBe(a.schoolId);
    await expect(prisma.academicYear.update({ where: { id: String(a.rows.AcademicYear.id) }, data: { id: randomUUID() } })).rejects.toThrow(/TENANT_INTEGRITY/);
    await expect(prisma.studyPath.update({ where: { id: String(a.rows.StudyPath.id) }, data: { academicYearId: String(nextYear.rows.AcademicYear.id) } })).rejects.toThrow(/TENANT_INTEGRITY/);
  });
});
