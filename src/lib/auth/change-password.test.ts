// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { changeOwnPassword } from "./change-password";
import { hashPassword, verifyPassword } from "./password";
import { credentialThrottleKeys, CREDENTIAL_LIMITS } from "./credential-throttle";
import { loadEffectiveSessionAccess } from "./session-access";

const oldPassword = "Synthetic original phrase!";
const nextPassword = "Synthetic changed phrase!";
const secret = "Synthetic-test-throttle-secret-at-least-32-characters";
let userId = "";
let schools: string[] = [];
let oldHash = "";
const budgetKey = () => credentialThrottleKeys(userId, secret, "password-change").identifier;

describe("own global credential change", () => {
  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    oldHash = await hashPassword(oldPassword);
    schools = await Promise.all(["A", "B"].map(async suffix => (await prisma.school.create({ data: { code: `PASSWORD-${suffix}-${randomUUID()}`, name: `Password test ${suffix}`, province: "Maputo", district: "KaMpfumu" } })).id));
    userId = (await prisma.user.create({ data: { name: "Synthetic credential holder", passwordHash: oldHash, memberships: { create: schools.map(schoolId => ({ schoolId, role: "GUARDIAN" })) } } })).id;
  });
  beforeEach(async () => {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: oldHash, authVersion: 0, isActive: true } });
    await prisma.authThrottle.deleteMany({ where: { key: budgetKey() } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.authSession.deleteMany({ where: { userId } });
  });
  afterAll(async () => {
    await prisma.authThrottle.deleteMany({ where: { key: budgetKey() } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.school.deleteMany({ where: { id: { in: schools } } });
    vi.unstubAllEnvs();
  });
  const input = () => ({ currentPassword: oldPassword, newPassword: nextPassword, confirmPassword: nextPassword });
  const identity = () => ({ userId, authVersion: 0 });

  it("changes the global hash and version atomically, removes adapter sessions and redacts audit", async () => {
    await prisma.session.create({ data: { userId, sessionToken: randomUUID(), expires: new Date(Date.now() + 60000) } });
    const registryId = "a".repeat(64);
    await prisma.authSession.create({ data: { id: registryId, userId, authVersion: 0, expiresAt: new Date(Date.now() + 60000) } });
    await changeOwnPassword(identity(), input());
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.authVersion).toBe(1);
    expect(await verifyPassword(nextPassword, user.passwordHash)).toBe(true);
    expect(await verifyPassword(oldPassword, user.passwordHash)).toBe(false);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: registryId } })).revokedAt).not.toBeNull();
    const memberships = await prisma.membership.findMany({ where: { userId } });
    expect(memberships).toHaveLength(2);
    expect(memberships.every(member => member.status === "ACTIVE")).toBe(true);
    expect((await loadEffectiveSessionAccess(userId, schools[0]))?.authVersion).toBe(1);
    expect((await loadEffectiveSessionAccess(userId, schools[1]))?.authVersion).toBe(1);
    const audits = await prisma.auditLog.findMany({ where: { actorUserId: userId } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ schoolId: null, action: "identity.password.change", before: null, after: { sessionsRevoked: true } });
    expect(JSON.stringify(audits)).not.toMatch(/Synthetic original|Synthetic changed|argon2|passwordHash/);
  });
  it("refuses a wrong current password without changing version or audit", async () => {
    await expect(changeOwnPassword(identity(), { ...input(), currentPassword: "incorrect" })).rejects.toMatchObject({ code: "currentPassword" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion).toBe(0);
    expect(await prisma.auditLog.count({ where: { actorUserId: userId } })).toBe(0);
  });
  it("does not create a local password on a Google-only account", async () => {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: null } });
    await expect(changeOwnPassword(identity(), input())).rejects.toMatchObject({ code: "currentPassword" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash).toBeNull();
  });
  it("rejects old sessions and disabled accounts even with the correct current password", async () => {
    await expect(changeOwnPassword({ userId, authVersion: 1 }, input())).rejects.toMatchObject({ code: "forbidden" });
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await expect(changeOwnPassword(identity(), input())).rejects.toMatchObject({ code: "forbidden" });
  });
  it("does not change the hash when confirmation or policy is invalid", async () => {
    await expect(changeOwnPassword(identity(), { ...input(), confirmPassword: "different phrase" })).rejects.toMatchObject({ code: "invalid" });
    await expect(changeOwnPassword(identity(), { currentPassword: oldPassword, newPassword: "short", confirmPassword: "short" })).rejects.toMatchObject({ code: "invalid" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash).toBe(oldHash);
  });
  it("refuses reuse of the current password", async () => {
    await expect(changeOwnPassword(identity(), { currentPassword: oldPassword, newPassword: oldPassword, confirmPassword: oldPassword })).rejects.toMatchObject({ code: "samePassword" });
  });
  it("allows only one of two concurrent changes using the same old credential", async () => {
    const results = await Promise.allSettled([changeOwnPassword(identity(), input()), changeOwnPassword(identity(), input())]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion).toBe(1);
    expect(await prisma.auditLog.count({ where: { actorUserId: userId } })).toBe(1);
  });
  it("enforces the persisted budget before checking a password", async () => {
    await prisma.authThrottle.create({ data: { key: budgetKey(), attempts: CREDENTIAL_LIMITS.identifier.attempts, expiresAt: new Date(Date.now() + 60000) } });
    await expect(changeOwnPassword(identity(), input())).rejects.toMatchObject({ code: "rateLimited" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash).toBe(oldHash);
  });
});
