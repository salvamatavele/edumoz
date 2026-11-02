import { createHmac, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/client";
import { withTransactionRetry } from "@/lib/db/transaction-retry";

const SESSION_WINDOW_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_INTERVAL_MS = 5 * 60 * 1000;
export interface SessionClaims {
  userId?: string;
  authVersion?: number;
  sessionNonce?: string;
  jti?: string;
  exp?: number;
}

function digest(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("A strong AUTH_SECRET is required.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
function nonceForExisting(claims: SessionClaims, now: Date): string | null {
  if (claims.sessionNonce !== undefined) return /^[A-Za-z0-9_-]{43}$/.test(claims.sessionNonce) ? claims.sessionNonce : null;
  if (typeof claims.jti !== "string" || !claims.jti || claims.jti.length > 191 || !Number.isSafeInteger(claims.exp) || claims.exp! * 1000 <= now.getTime()) return null;
  return createHmac("sha256", digest("legacy-session-namespace")).update(JSON.stringify([claims.userId, claims.jti])).digest("base64url");
}
async function adoptLegacySession(data: { id: string; userId: string; authVersion: number; createdAt: Date; lastSeenAt: Date; expiresAt: Date; revokedAt?: Date }) {
  // Native atomic insertion avoids Prisma's concurrent read/create upsert race.
  // COALESCE preserves a tombstone when an older request adopts the same JWT.
  await withTransactionRetry(() => prisma.$executeRaw`
    INSERT INTO AuthSession (id, userId, authVersion, createdAt, lastSeenAt, expiresAt, revokedAt)
    VALUES (${data.id}, ${data.userId}, ${data.authVersion}, ${data.createdAt}, ${data.lastSeenAt}, ${data.expiresAt}, ${data.revokedAt ?? null})
    ON DUPLICATE KEY UPDATE revokedAt = COALESCE(revokedAt, VALUES(revokedAt))
  `);
}
function sessionId(userId: string, nonce: string): string {
  return digest(JSON.stringify(["auth-session", userId, nonce]));
}

/** Called only with claims already verified by Auth.js, never a client session update. */
export async function validateRegisteredSession(claims: SessionClaims, newLogin = false, now = new Date()): Promise<{ sessionNonce: string; authSessionId: string } | null> {
  if (!claims.userId || !Number.isSafeInteger(claims.authVersion) || claims.authVersion! < 0) return null;
  const nonce = newLogin ? randomBytes(32).toString("base64url") : nonceForExisting(claims, now);
  if (!nonce) return null;
  const id = sessionId(claims.userId, nonce);
  const expiresAt = new Date(now.getTime() + SESSION_WINDOW_MS + ACTIVITY_INTERVAL_MS);
  if (newLogin) {
    // Cleanup is bounded and runs only on login. Expired registries cannot authenticate.
    const expired = await prisma.authSession.findMany({ where: { expiresAt: { lte: now } }, select: { id: true }, take: 100, orderBy: { expiresAt: "asc" } });
    if (expired.length) await prisma.authSession.deleteMany({ where: { id: { in: expired.map(row => row.id) }, expiresAt: { lte: now } } });
    await prisma.authSession.create({ data: { id, userId: claims.userId, authVersion: claims.authVersion!, createdAt: now, lastSeenAt: now, expiresAt } });
  } else if (claims.sessionNonce === undefined) {
    // Adoption must preserve a logout tombstone from an earlier request.
    await adoptLegacySession({ id, userId: claims.userId, authVersion: claims.authVersion!, createdAt: now, lastSeenAt: now, expiresAt });
  }
  const row = await prisma.authSession.findUnique({ where: { id } });
  if (!row || row.userId !== claims.userId || row.authVersion !== claims.authVersion || row.revokedAt || row.expiresAt <= now) return null;
  if (row.lastSeenAt.getTime() <= now.getTime() - ACTIVITY_INTERVAL_MS) {
    const touched = await prisma.authSession.updateMany({ where: { id, userId: claims.userId, authVersion: claims.authVersion!, revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { lte: new Date(now.getTime() - ACTIVITY_INTERVAL_MS) } }, data: { lastSeenAt: now, expiresAt } });
    if (touched.count !== 1) {
      // A concurrent heartbeat can win. Recheck revocation instead of forcing logout.
      const current = await prisma.authSession.findUnique({ where: { id } });
      if (!current || current.revokedAt || current.expiresAt <= now || current.userId !== claims.userId || current.authVersion !== claims.authVersion) return null;
    }
  }
  return { sessionNonce: nonce, authSessionId: id };
}

/** Also handles a legacy JWT which has never reached the registry. */
export async function revokeSignedSession(claims: SessionClaims, now = new Date()): Promise<void> {
  if (!claims.userId || !Number.isSafeInteger(claims.authVersion ?? 0)) return;
  const nonce = nonceForExisting(claims, now);
  if (!nonce) return;
  const id = sessionId(claims.userId, nonce);
  await adoptLegacySession({ id, userId: claims.userId, authVersion: claims.authVersion ?? 0, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_WINDOW_MS + ACTIVITY_INTERVAL_MS), revokedAt: now });
}
