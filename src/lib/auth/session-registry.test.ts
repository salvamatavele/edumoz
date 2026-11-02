// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { revokeSignedSession, validateRegisteredSession } from "./session-registry";

describe("signed JWT session registry", () => {
  let userId = "";
  const now = new Date("2026-10-30T10:00:00Z");
  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "synthetic-session-registry-test-secret-unique");
    userId = (await prisma.user.create({ data: { name: `Synthetic sessions ${randomUUID()}` } })).id;
  });
  afterAll(async () => { await prisma.user.delete({ where: { id: userId } }); await prisma.$disconnect(); vi.unstubAllEnvs(); });
  it("issues independent logins and rejects copied claims after signout", async () => {
    const claims = { userId, authVersion: 0 };
    const first = await validateRegisteredSession(claims, true, now);
    const second = await validateRegisteredSession(claims, true, now);
    expect(first?.authSessionId).not.toEqual(second?.authSessionId);
    expect(first?.sessionNonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const copied = { ...claims, sessionNonce: first!.sessionNonce };
    expect(await validateRegisteredSession(copied, false, now)).toEqual(first);
    await revokeSignedSession(copied, now);
    expect(await validateRegisteredSession(copied, false, now)).toBeNull();
    expect(await validateRegisteredSession({ ...claims, sessionNonce: second!.sessionNonce }, false, now)).toEqual(second);
    const stored = await prisma.authSession.findUniqueOrThrow({ where: { id: first!.authSessionId } });
    expect(JSON.stringify(stored)).not.toContain(first!.sessionNonce);
  });
  it("refuses an authentic encrypted JWT copy after its registry is revoked", async () => {
    const { encode, decode } = await import("next-auth/jwt");
    const issued = await validateRegisteredSession({ userId, authVersion: 0 }, true);
    const secret = process.env.AUTH_SECRET!;
    const salt = "authjs.session-token";
    const cookie = await encode({ token: { userId, authVersion: 0, sessionNonce: issued!.sessionNonce }, secret, salt, maxAge: 28800 });
    const copied = await decode({ token: cookie, secret, salt });
    expect(copied?.userId).toBe(userId);
    await revokeSignedSession(copied!);
    // Auth.js can still decrypt a copied cookie; persisted revocation must deny it.
    const stillSigned = await decode({ token: cookie, secret, salt });
    expect(stillSigned).not.toBeNull();
    expect(await validateRegisteredSession(stillSigned!)).toBeNull();
  });
  it("never recreates a missing issued session and does not accept another owner or version", async () => {
    const issued = await validateRegisteredSession({ userId, authVersion: 0 }, true, now);
    const claims = { userId, authVersion: 0, sessionNonce: issued!.sessionNonce };
    expect(await validateRegisteredSession({ ...claims, userId: "another-owner" }, false, now)).toBeNull();
    expect(await validateRegisteredSession({ ...claims, authVersion: 1 }, false, now)).toBeNull();
    await prisma.authSession.delete({ where: { id: issued!.authSessionId } });
    expect(await validateRegisteredSession(claims, false, now)).toBeNull();
  });
  it("adopts a legacy session consistently and cannot undo a logout tombstone", async () => {
    const claims = { userId, authVersion: 0, jti: randomUUID(), exp: now.getTime() / 1000 + 3600 };
    const issued = await validateRegisteredSession(claims, false, now);
    expect(await validateRegisteredSession(claims, false, now)).toEqual(issued);
    await revokeSignedSession(claims, now);
    expect(await validateRegisteredSession(claims, false, now)).toBeNull();
    const untouched = { ...claims, jti: randomUUID() };
    await revokeSignedSession(untouched, now);
    expect(await validateRegisteredSession(untouched, false, now)).toBeNull();
  });
  it("handles simultaneous legacy adoption and a racing logout without reactivation", async () => {
    const claims = { userId, authVersion: 0, jti: randomUUID(), exp: now.getTime() / 1000 + 3600 };
    const adopted = await Promise.all(Array.from({ length: 6 }, () => validateRegisteredSession(claims, false, now)));
    expect(new Set(adopted.map(row => row?.authSessionId)).size).toBe(1);
    await Promise.all([revokeSignedSession(claims, now), ...Array.from({ length: 4 }, () => validateRegisteredSession(claims, false, now))]);
    expect(await validateRegisteredSession(claims, false, now)).toBeNull();
  });
  it("refuses malformed or expired claims and registry expiration", async () => {
    for (const claims of [{ userId, authVersion: 0 }, { userId, authVersion: 0, sessionNonce: "invalid" }, { userId, authVersion: 0, jti: "expired", exp: now.getTime() / 1000 }]) expect(await validateRegisteredSession(claims, false, now)).toBeNull();
    const issued = await validateRegisteredSession({ userId, authVersion: 0 }, true, now);
    expect(await validateRegisteredSession({ userId, authVersion: 0, sessionNonce: issued!.sessionNonce }, false, new Date(now.getTime() + 9 * 3600000))).toBeNull();
  });
  it("throttles activity writes while preserving a sliding window", async () => {
    const issued = await validateRegisteredSession({ userId, authVersion: 0 }, true, now);
    const claims = { userId, authVersion: 0, sessionNonce: issued!.sessionNonce };
    await validateRegisteredSession(claims, false, new Date(now.getTime() + 60000));
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: issued!.authSessionId } })).lastSeenAt).toEqual(now);
    const later = new Date(now.getTime() + 300000);
    const refreshed = await Promise.all(Array.from({ length: 4 }, () => validateRegisteredSession(claims, false, later)));
    expect(refreshed.every(row => row?.authSessionId === issued!.authSessionId)).toBe(true);
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: issued!.authSessionId } })).lastSeenAt).toEqual(later);
  });
});
