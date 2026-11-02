// @vitest-environment node
import { randomUUID, randomInt } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const { prisma } = await import("@/lib/db/client");
import type { SessionContext } from "@/features/identity/domain/access";
import { createSchoolUser, reissueInitialSchoolCredential } from "./create-school-user";
import { listSchoolUsers } from "./school-users";
import { changeSchoolUserStatus } from "./school-user-status";
import { findUserForCredentials, acceptInvitations } from "./sign-in";
import { verifyPassword } from "@/lib/auth/password";
import { changeOwnPassword } from "@/lib/auth/change-password";
import { loadEffectiveSessionAccess } from "@/lib/auth/session-access";
import { authenticateCredentials } from "@/lib/auth/credential-authentication";
import { credentialThrottleKeys } from "@/lib/auth/credential-throttle";

const secret = "m01-school-create-synthetic-secret-longer-than-32";
const schools: string[] = [];
let actor = "", restricted = "", roleId = "", foreignUser = "", teacherId = "", foreignTeacher = "";
let context: SessionContext;
const input = (extra = {}) => ({ requestId: randomUUID(), name: "Created synthetic person", email: "", phone: "", roles: ["TEACHER"], teacherCode: "", ...extra });
async function created(extra = {}) {
  const result = await createSchoolUser(context, input(extra));
  if (result.status !== "created") throw Error("Expected new credential");
  return result.credential;
}

describe("new school account and initial credential", () => {
  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    for (const suffix of ["A", "B"]) schools.push((await prisma.school.create({ data: { code: `CREATE-M01-${suffix}-${randomUUID()}`, name: `Synthetic creation ${suffix}`, province: "Maputo", district: "KaMpfumu" } })).id);
    actor = (await prisma.user.create({ data: { name: "Creator", memberships: { create: { schoolId: schools[0], role: "SCHOOL_MANAGER" } } } })).id;
    foreignUser = (await prisma.user.create({ data: { name: "Foreign identity", email: `${randomUUID()}@example.invalid`, memberships: { create: { schoolId: schools[1], role: "TEACHER" } } } })).id;
    const permission = await prisma.permission.upsert({ where: { resource_action: { resource: "users", action: "create" } }, update: {}, create: { resource: "users", action: "create" } });
    roleId = (await prisma.permissionRole.create({ data: { schoolId: schools[0], name: "Account creator", permissions: { create: { permissionId: permission.id } } } })).id;
    restricted = (await prisma.user.create({ data: { name: "Delegated creator", memberships: { create: { schoolId: schools[0], role: "SCHOOL_MANAGER", permissionRoleId: roleId } } } })).id;
    teacherId = (await prisma.teacher.create({ data: { schoolId: schools[0], code: "LINK-LOCAL", firstName: "Local", lastName: "Teacher" } })).id;
    foreignTeacher = (await prisma.teacher.create({ data: { schoolId: schools[1], code: "LINK-FOREIGN", firstName: "Foreign", lastName: "Teacher" } })).id;
    context = { userId: actor, authVersion: 0, schoolId: schools[0], role: "SCHOOL_MANAGER", isPlatformAdmin: false, permissionRoleId: null, memberships: [] };
  });
  beforeEach(async () => {
    for (const id of [actor, restricted]) await prisma.authThrottle.deleteMany({ where: { key: credentialThrottleKeys(id, secret, "school-user-create").identifier } });
  });
  afterAll(async () => {
    const members = await prisma.membership.findMany({ where: { schoolId: { in: schools } }, select: { userId: true } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ schoolId: { in: schools } }, { actorUserId: { in: members.map(m => m.userId) } }] } });
    await prisma.invitation.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.teacher.deleteMany({ where: { schoolId: { in: schools } } });
    await prisma.user.deleteMany({ where: { id: { in: members.map(m => m.userId) } } });
    await prisma.school.deleteMany({ where: { id: { in: schools } } });
    vi.unstubAllEnvs();
  });
  it("creates without contact details, stores only the hash, local roles and redacted audit", async () => {
    const credential = await created({ roles: ["TEACHER", "GUARDIAN"], isPlatformAdmin: true, passwordChangeRequired: false, schoolId: schools[1], passwordHash: "attacker-supplied-hash" });
    expect(credential.loginCode).toMatch(/^EDU-[A-F0-9]{24}$/);
    expect(credential.password).toHaveLength(43);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: credential.userId } });
    expect(user.email).toBeNull(); expect(user.phone).toBeNull();
    expect(user.passwordChangeRequired).toBe(true);
    expect(user.isPlatformAdmin).toBe(false);
    expect(await prisma.membership.count({ where: { userId: user.id, schoolId: schools[1] } })).toBe(0);
    expect(user.passwordExpiresAt!.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(await verifyPassword(credential.password, user.passwordHash)).toBe(true);
    expect(user.passwordHash).not.toBe(credential.password);
    expect((await findUserForCredentials(credential.loginCode.toLowerCase()))?.id).toBe(user.id);
    const rows = await listSchoolUsers(context, { q: credential.loginCode });
    expect(rows.rows[0]).toMatchObject({ id: user.id, loginCode: credential.loginCode, passwordChangeRequired: true });
    expect(JSON.stringify(rows)).not.toContain(credential.password);
    const audit = await prisma.auditLog.findMany({ where: { entityId: user.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0].after).toEqual({ roles: ["TEACHER", "GUARDIAN"], teacherId: null, initialPasswordRequired: true });
    expect(JSON.stringify(audit)).not.toMatch(/argon2|passwordHash|creationKey/);
    expect(JSON.stringify(audit)).not.toContain(credential.password);
  });
  it("links only an available local teacher atomically", async () => {
    const c = await created({ teacherCode: "LINK-LOCAL" });
    expect((await prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } })).userId).toBe(c.userId);
    await expect(createSchoolUser(context, input({ teacherCode: "LINK-LOCAL" }))).rejects.toMatchObject({ code: "creationUnavailable" });
    const count = await prisma.user.count({ where: { memberships: { some: { schoolId: schools[0] } } } });
    await expect(createSchoolUser(context, input({ teacherCode: "LINK-FOREIGN" }))).rejects.toMatchObject({ code: "creationUnavailable" });
    expect(await prisma.user.count({ where: { memberships: { some: { schoolId: schools[0] } } } })).toBe(count);
    expect((await prisma.teacher.findUniqueOrThrow({ where: { id: foreignTeacher } })).userId).toBeNull();
  });
  it("creates the same independent result for a contact already used in another school without linking or disclosing that identity", async () => {
    const email = (await prisma.user.findUniqueOrThrow({ where: { id: foreignUser } })).email!;
    const c = await created({ email });
    expect(c.userId).not.toBe(foreignUser);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(user.email).toBeNull();
    expect(user.contactEmail).toBe(email);
    expect((await findUserForCredentials(email))?.id).toBe(foreignUser);
    expect(await prisma.membership.count({ where: { userId: foreignUser, schoolId: schools[0] } })).toBe(0);
  });
  it("replays a request without a second account or recoverable credential", async () => {
    const request = input();
    const result = await createSchoolUser(context, request);
    expect(result.status).toBe("created");
    const repeated = await createSchoolUser(context, request);
    expect(repeated.status).toBe("alreadyCreated");
    expect(repeated).not.toHaveProperty("credential");
  });
  it("serializes concurrent duplicates and emits a secret only once", async () => {
    const request = input();
    const results = await Promise.all([createSchoolUser(context, request), createSchoolUser(context, request)]);
    expect(results.map(r => r.status).sort()).toEqual(["alreadyCreated", "created"]);
  });
  it("uses actual delegated grants and refuses management escalation", async () => {
    const delegated: SessionContext = { ...context, userId: restricted, permissionRoleId: roleId, permissions: [{ resource: "users", action: "create" }] };
    expect((await createSchoolUser(delegated, input())).status).toBe("created");
    await expect(createSchoolUser(delegated, input({ roles: ["SCHOOL_MANAGER"] }))).rejects.toMatchObject({ code: "protectedAccount" });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    try { await expect(createSchoolUser(delegated, input())).rejects.toMatchObject({ code: "forbidden" }); }
    finally { const p = await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource: "users", action: "create" } } }); await prisma.rolePermission.create({ data: { roleId, permissionId: p.id } }); }
  });
  it("refuses a stale actor after password revocation or suspension", async () => {
    await prisma.user.update({ where: { id: actor }, data: { authVersion: 1 } });
    try { await expect(createSchoolUser(context, input())).rejects.toMatchObject({ code: "forbidden" }); }
    finally { await prisma.user.update({ where: { id: actor }, data: { authVersion: 0 } }); }
    await prisma.membership.updateMany({ where: { userId: actor }, data: { status: "SUSPENDED" } });
    try { await expect(createSchoolUser(context, input())).rejects.toMatchObject({ code: "forbidden" }); }
    finally { await prisma.membership.updateMany({ where: { userId: actor }, data: { status: "ACTIVE" } }); }
  });
  it("exposes only the password-change session before activation and denies school mutations", async () => {
    const c = await created({ roles: ["SCHOOL_MANAGER"] });
    const pending = await loadEffectiveSessionAccess(c.userId, schools[0]);
    expect(pending).toMatchObject({ schoolId: null, role: null, memberships: [], permissions: [], isPlatformAdmin: false, passwordChangeRequired: true });
    await expect(changeSchoolUserStatus({ ...context, userId: c.userId }, { userId: actor, status: "SUSPENDED" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(createSchoolUser({ ...context, userId: c.userId }, input())).rejects.toMatchObject({ code: "forbidden" });
    const newPassword = "A new private synthetic phrase";
    await changeOwnPassword({ userId: c.userId, authVersion: 0 }, { currentPassword: c.password, newPassword, confirmPassword: newPassword });
    const activated = await loadEffectiveSessionAccess(c.userId, schools[0]);
    expect(activated).toMatchObject({ schoolId: schools[0], role: "SCHOOL_MANAGER", passwordChangeRequired: false, authVersion: 1 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(user.passwordExpiresAt).toBeNull();
    expect(await verifyPassword(c.password, user.passwordHash)).toBe(false);
  });
  it("rejects expired initial credentials in login, session and password change", async () => {
    const c = await created();
    await prisma.user.update({ where: { id: c.userId }, data: { passwordExpiresAt: new Date(Date.now() - 1) } });
    expect(await authenticateCredentials({ identifier: c.loginCode, password: c.password })).toBeNull();
    expect(await loadEffectiveSessionAccess(c.userId, schools[0])).toBeNull();
    await expect(changeOwnPassword({ userId: c.userId, authVersion: 0 }, { currentPassword: c.password, newPassword: "A new private phrase", confirmPassword: "A new private phrase" })).rejects.toMatchObject({ code: "forbidden" });
  });
  it("does not count an unactivated manager as the last usable administrative path", async () => {
    const schoolId = (await prisma.school.create({ data: { code: `LAST-INITIAL-${randomUUID()}`, name: "Synthetic last manager", province: "Maputo", district: "KaMpfumu" } })).id;
    schools.push(schoolId);
    const owner = (await prisma.user.create({ data: { name: "Only usable manager", memberships: { create: { schoolId, role: "SCHOOL_MANAGER" } } } })).id;
    const local = { ...context, schoolId, userId: owner };
    const pending = await createSchoolUser(local, input({ roles: ["SCHOOL_MANAGER"] }));
    if (pending.status !== "created") throw Error("Expected initial manager");
    await expect(changeSchoolUserStatus(local, { userId: owner, status: "SUSPENDED" })).rejects.toMatchObject({ code: "lastManager" });
    await changeSchoolUserStatus(local, { userId: pending.credential.userId, status: "SUSPENDED" });
    expect((await loadEffectiveSessionAccess(owner, schoolId))?.role).toBe("SCHOOL_MANAGER");
  });
  it("selects the manager role deterministically regardless of membership creation order", async () => {
    const c = await created({ roles: ["GUARDIAN", "TEACHER", "SCHOOL_MANAGER"] });
    await prisma.user.update({ where: { id: c.userId }, data: { passwordChangeRequired: false, passwordExpiresAt: null } });
    expect((await loadEffectiveSessionAccess(c.userId, schools[0]))?.role).toBe("SCHOOL_MANAGER");
  });
  it("reissues an expired initial credential and invalidates the old secret and session version", async () => {
    const c = await created();
    await prisma.user.update({ where: { id: c.userId }, data: { passwordExpiresAt: new Date(Date.now() - 1) } });
    const result = await reissueInitialSchoolCredential(context, { userId: c.userId, requestId: randomUUID() });
    if (result.status !== "created") throw Error("Expected reissued credential");
    expect(result.credential.loginCode).toBe(c.loginCode);
    expect(result.credential.password).not.toBe(c.password);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(user.authVersion).toBe(1);
    expect(await verifyPassword(c.password, user.passwordHash)).toBe(false);
    expect(await verifyPassword(result.credential.password, user.passwordHash)).toBe(true);
    expect(user.passwordChangeRequired).toBe(true);
    expect(user.passwordExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });
  it("retains reissue idempotency after another reissue and never recovers a previous secret", async () => {
    const c = await created();
    const first = { userId: c.userId, requestId: randomUUID() };
    await reissueInitialSchoolCredential(context, first);
    await reissueInitialSchoolCredential(context, { userId: c.userId, requestId: randomUUID() });
    const replay = await reissueInitialSchoolCredential(context, first);
    expect(replay).toEqual({ status: "alreadyCreated", userId: c.userId });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: c.userId } })).authVersion).toBe(2);
    expect(await prisma.auditLog.count({ where: { entityId: c.userId, action: "schoolUser.initialCredential.reissue" } })).toBe(2);
  });
  it("does not reissue an activated or shared account", async () => {
    const c = await created();
    await prisma.membership.create({ data: { userId: c.userId, schoolId: schools[1], role: "GUARDIAN" } });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    await expect(reissueInitialSchoolCredential(context, { userId: c.userId, requestId: randomUUID() })).rejects.toMatchObject({ code: "creationUnavailable" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: c.userId } })).passwordHash).toBe(before.passwordHash);
    const active = await created();
    await prisma.user.update({ where: { id: active.userId }, data: { passwordChangeRequired: false, passwordExpiresAt: null } });
    await expect(reissueInitialSchoolCredential(context, { userId: active.userId, requestId: randomUUID() })).rejects.toMatchObject({ code: "creationUnavailable" });
  });
  it("does not attach another school through an invitation before initial password replacement", async () => {
    const c = await created();
    const invitation = await prisma.invitation.create({ data: { schoolId: schools[1], email: `${randomUUID()}@example.invalid`, role: "TEACHER", expiresAt: new Date(Date.now() + 60000), invitedById: actor, token: randomUUID() } });
    await acceptInvitations(c.userId, [invitation.id]);
    expect(await prisma.membership.count({ where: { userId: c.userId, schoolId: schools[1] } })).toBe(0);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } })).status).toBe("PENDING");
    await prisma.invitation.delete({ where: { id: invitation.id } });
  });
  it("allows only activation or initial reissue to win a concurrent old-secret request", async () => {
    const c = await created();
    const newPassword = "New private synthetic phrase";
    const results = await Promise.allSettled([
      changeOwnPassword({ userId: c.userId, authVersion: 0 }, { currentPassword: c.password, newPassword, confirmPassword: newPassword }),
      reissueInitialSchoolCredential(context, { userId: c.userId, requestId: randomUUID() }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: c.userId } })).authVersion).toBe(1);
  });
  it("stores canonical communication contacts without treating them as verified login identifiers", async () => {
    const phone = `86${randomInt(1000000, 9999999)}`;
    const email = `${randomUUID()}@example.invalid`;
    const c = await created({ phone, email });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(user).toMatchObject({ email: null, phone: null, contactEmail: email, contactPhone: `+258${phone}` });
    expect(await findUserForCredentials(phone)).toBeNull();
    expect(await findUserForCredentials(email)).toBeNull();
    expect((await findUserForCredentials(c.loginCode))?.id).toBe(c.userId);
    const second = await created({ phone, email });
    expect(second.userId).not.toBe(c.userId);
    expect((await listSchoolUsers(context, { q: email })).filtered).toBe(2);
  });
  it("refuses ambiguous legacy login phones without probing them during new-account creation", async () => {
    const phone = `87${randomInt(1000000, 9999999)}`;
    const legacy = [];
    for (const value of [phone, `+258${phone}`]) legacy.push((await prisma.user.create({ data: { name: "Ambiguous synthetic", phone: value, memberships: { create: { schoolId: schools[1], role: "TEACHER" } } } })).id);
    expect(await findUserForCredentials(phone)).toBeNull();
    const c = await created({ phone });
    expect(legacy).not.toContain(c.userId);
    expect(await prisma.membership.count({ where: { userId: { in: legacy }, schoolId: schools[0] } })).toBe(0);
  });
  it("bounds creation attempts persistently", async () => {
    const key = credentialThrottleKeys(actor, secret, "school-user-create").identifier;
    await prisma.authThrottle.create({ data: { key, attempts: 10, expiresAt: new Date(Date.now() + 60000) } });
    await expect(createSchoolUser(context, input())).rejects.toMatchObject({ code: "rateLimited" });
  });
});
