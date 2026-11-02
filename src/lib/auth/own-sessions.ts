import { prisma } from "@/lib/db/client";
import { withTransactionRetry } from "@/lib/db/transaction-retry";

export interface SessionOwner { userId: string; authVersion: number; authSessionId: string; }
export class SessionManagementError extends Error {}

/** The holder's global sessions are independent of school administration grants. */
export async function listOwnSessions(owner: SessionOwner) {
  const current = await prisma.authSession.findFirst({ where: { id: owner.authSessionId, userId: owner.userId, authVersion: owner.authVersion, revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true, authVersion: owner.authVersion, passwordChangeRequired: false } }, select: { id: true, createdAt: true, lastSeenAt: true } });
  if (!current) throw new SessionManagementError();
  const rows = await prisma.authSession.findMany({ where: { id: { not: owner.authSessionId }, userId: owner.userId, authVersion: owner.authVersion, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 24, select: { id: true, createdAt: true, lastSeenAt: true } });
  return [current, ...rows].map(row => ({ id: row.id, current: row.id === owner.authSessionId, createdAt: row.createdAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString() }));
}

export async function revokeOwnSessions(owner: SessionOwner, target: "current" | "others" | { id: string }) {
  if (!owner.userId || !/^[a-f0-9]{64}$/.test(owner.authSessionId) || (typeof target === "object" && !/^[a-f0-9]{64}$/.test(target.id))) throw new SessionManagementError();
  return withTransactionRetry(() => prisma.$transaction(async tx => {
    // Serialize against credential rotation, whose CAS writes the same User row.
    const users = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM User WHERE id = ${owner.userId} AND authVersion = ${owner.authVersion} AND isActive = TRUE FOR UPDATE`;
    if (users.length !== 1) throw new SessionManagementError();
    const current = await tx.authSession.findFirst({ where: { id: owner.authSessionId, userId: owner.userId, authVersion: owner.authVersion, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, user: { select: { passwordChangeRequired: true } } } });
    if (!current || (target !== "current" && current.user.passwordChangeRequired)) throw new SessionManagementError();
    const now = new Date();
    const result = await tx.authSession.updateMany({ where: { userId: owner.userId, revokedAt: null, ...(target === "current" ? { id: owner.authSessionId } : target === "others" ? { id: { not: owner.authSessionId } } : { id: target.id === owner.authSessionId ? "" : target.id }) }, data: { revokedAt: now } });
    if (result.count) await tx.auditLog.create({ data: { actorUserId: owner.userId, entity: "AuthSession", entityId: owner.authSessionId, action: "identity.sessions.revoke", after: { scope: typeof target === "object" ? "other" : target, count: result.count } } });
    return result.count;
  }, { isolationLevel: "ReadCommitted" }));
}
