import { changePasswordSchema, PasswordChangeError } from "@/features/identity/domain/change-password";
import { prisma } from "@/lib/db/client";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { consumeAccountMutationAttempt } from "./credential-throttle";
import { hashPassword, verifyPassword } from "./password";

/** Only the authenticated holder can change this global credential, across all schools. */
export async function changeOwnPassword(identity: { userId: string; authVersion: number }, input: unknown): Promise<void> {
  if (!identity.userId || !Number.isSafeInteger(identity.authVersion) || identity.authVersion < 0) throw new PasswordChangeError("forbidden");
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) throw new PasswordChangeError("invalid");
  if (!(await consumeAccountMutationAttempt(identity.userId, "password-change"))) throw new PasswordChangeError("rateLimited");
  const user = await prisma.user.findUnique({ where: { id: identity.userId }, select: { passwordHash: true, authVersion: true, isActive: true, passwordChangeRequired: true, passwordExpiresAt: true } });
  if (!user?.isActive || user.authVersion !== identity.authVersion) throw new PasswordChangeError("forbidden");
  if (user.passwordChangeRequired && (!user.passwordExpiresAt || user.passwordExpiresAt <= new Date())) throw new PasswordChangeError("forbidden");
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) throw new PasswordChangeError("currentPassword");
  if (parsed.data.newPassword === parsed.data.currentPassword) throw new PasswordChangeError("samePassword");
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    // Optimistic compare-and-swap prevents two valid old-password checks overwriting each other.
    const changed = await tx.user.updateMany({
      where: { id: identity.userId, isActive: true, authVersion: identity.authVersion, passwordHash: user.passwordHash, OR: [{ passwordChangeRequired: false }, { passwordExpiresAt: { gt: new Date() } }] },
      data: { passwordHash, authVersion: { increment: 1 }, passwordChangeRequired: false, passwordExpiresAt: null },
    });
    if (changed.count !== 1) throw new PasswordChangeError("conflict");
    await tx.session.deleteMany({ where: { userId: identity.userId } });
    await tx.authSession.updateMany({ where: { userId: identity.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: {
      actorUserId: identity.userId, entity: "User", entityId: identity.userId, action: "identity.password.change",
      after: { sessionsRevoked: true },
    } });
  }, { isolationLevel: "ReadCommitted" }));
  // Keep the attempt counter until expiry, even on success, to bound repeated password changes.
}
