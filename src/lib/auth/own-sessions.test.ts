// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { listOwnSessions, revokeOwnSessions } from "./own-sessions";
import { validateRegisteredSession } from "./session-registry";

describe("account holder session management", () => {
  let userId = "", foreignId = "";
  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "synthetic-own-sessions-test-secret-123456789");
    userId = (await prisma.user.create({ data: { name: "Synthetic session owner" } })).id;
    foreignId = (await prisma.user.create({ data: { name: "Synthetic other owner" } })).id;
  });
  beforeEach(async () => { await prisma.authSession.deleteMany({ where: { userId: { in: [userId, foreignId] } } }); await prisma.user.update({ where: { id: userId }, data: { passwordChangeRequired: false } }); });
  afterAll(async () => { await prisma.auditLog.deleteMany({ where: { actorUserId: userId } }); await prisma.user.deleteMany({ where: { id: { in: [userId, foreignId] } } }); await prisma.$disconnect(); vi.unstubAllEnvs(); });
  async function issue(id = userId) { return (await validateRegisteredSession({ userId: id, authVersion: 0 }, true))!; }
  it("lists only owned sessions and rejects foreign IDs without affecting their owner", async () => {
    const current = await issue(), other = await issue(), foreign = await issue(foreignId);
    const owner = { userId, authVersion: 0, authSessionId: current.authSessionId };
    expect((await listOwnSessions(owner)).map(row => row.id).sort()).toEqual([current.authSessionId, other.authSessionId].sort());
    expect(await revokeOwnSessions(owner, { id: foreign.authSessionId })).toBe(0);
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: foreign.authSessionId } })).revokedAt).toBeNull();
    expect(await revokeOwnSessions(owner, { id: other.authSessionId })).toBe(1);
    expect(await validateRegisteredSession({ userId, authVersion: 0, sessionNonce: other.sessionNonce })).toBeNull();
  });
  it("terminates all other sessions while retaining current and foreign sessions", async () => {
    const current = await issue(), other = await issue(), foreign = await issue(foreignId);
    const owner = { userId, authVersion: 0, authSessionId: current.authSessionId };
    expect(await revokeOwnSessions(owner, "others")).toBe(1);
    expect(await validateRegisteredSession({ userId, authVersion: 0, sessionNonce: current.sessionNonce })).toEqual(current);
    expect(await validateRegisteredSession({ userId: foreignId, authVersion: 0, sessionNonce: foreign.sessionNonce })).toEqual(foreign);
    expect(await validateRegisteredSession({ userId, authVersion: 0, sessionNonce: other.sessionNonce })).toBeNull();
    expect(await revokeOwnSessions(owner, "current")).toBe(1);
    await expect(listOwnSessions(owner)).rejects.toThrow();
    await expect(revokeOwnSessions(owner, "others")).rejects.toThrow();
  });
  it("permits an initial-credential holder to sign out but refuses other session management", async () => {
    const current = await issue();
    const owner = { userId, authVersion: 0, authSessionId: current.authSessionId };
    await prisma.user.update({ where: { id: userId }, data: { passwordChangeRequired: true } });
    await expect(listOwnSessions(owner)).rejects.toThrow();
    await expect(revokeOwnSessions(owner, "others")).rejects.toThrow();
    expect(await revokeOwnSessions(owner, "current")).toBe(1);
  });
  it("bounds the list and always includes the current session", async () => {
    const current = await issue();
    for (let i = 0; i < 26; i++) await issue();
    const rows = await listOwnSessions({ userId, authVersion: 0, authSessionId: current.authSessionId });
    expect(rows).toHaveLength(25); expect(rows[0]).toMatchObject({ id: current.authSessionId, current: true });
  });
});
