import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";

export const CREDENTIAL_LIMITS = {
  identifier: { attempts: 10, windowMs: 15 * 60 * 1000 },
  global: { attempts: 300, windowMs: 60 * 1000 },
} as const;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication throttle requires a configured secret.");
  return secret;
}

export type AuthAttemptPurpose = "credentials" | "password-change" | "school-user-create";

export function credentialThrottleKeys(identifier: string, secret = authSecret(), purpose: AuthAttemptPurpose = "credentials") {
  const digest = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const value = identifier.trim().toLowerCase();
  const normalized = purpose === "credentials" && /^(?:\+?258)?8[2-7]\d{7}$/.test(value) ? `+258${value.slice(-9)}` : value;
  return { global: digest("credentials:global"), identifier: digest(`${purpose}:identifier:${normalized}`) };
}

/** Shared database counters apply before password verification, including unknown accounts. */
export async function consumeCredentialAttempt(identifier: string, now = new Date(), secret = authSecret(), purpose: AuthAttemptPurpose = "credentials"):  Promise<boolean> {
  const keys = credentialThrottleKeys(identifier, secret, purpose);
  return withTransactionRetry(() => prisma.$transaction(async (tx) => {
    // Bounded expiry cleanup prevents arbitrary identifiers accumulating indefinitely.
    await deleteExpiredCredentialBudgets(tx, now);
    for (const scope of ["global", "identifier"] as const) {
      const key = keys[scope];
      const policy = CREDENTIAL_LIMITS[scope];
      const expiresAt = new Date(now.getTime() + policy.windowMs);
      // The no-op UPDATE still obtains the row lock until this transaction commits.
      await tx.$executeRaw`INSERT INTO AuthThrottle (\`key\`, attempts, expiresAt)
        VALUES (${key}, 0, ${expiresAt}) ON DUPLICATE KEY UPDATE \`key\` = VALUES(\`key\`)`;
      await tx.authThrottle.updateMany({ where: { key, expiresAt: { lte: now } }, data: { attempts: 0, expiresAt } });
      const claimed = await tx.authThrottle.updateMany({ where: { key, attempts: { lt: policy.attempts } }, data: { attempts: { increment: 1 } } });
      if (claimed.count !== 1) return false;
    }
    return true;
  }, { isolationLevel: "ReadCommitted" }));
}

/** A successful password check clears only that identity's budget, never the global one. */
export async function resetCredentialAttempts(identifier: string, secret = authSecret()): Promise<void> {
  const { identifier: key } = credentialThrottleKeys(identifier, secret);
  await prisma.authThrottle.deleteMany({ where: { key } });
}

/** Mutation namespaces cannot be exhausted by choosing an equivalent public login identifier. */
export function consumeAccountMutationAttempt(userId: string, purpose: Exclude<AuthAttemptPurpose, "credentials">): Promise<boolean> {
  return consumeCredentialAttempt(userId, new Date(), authSecret(), purpose);
}

/** One bounded housekeeping batch; concurrent requests may independently run more batches. */
export async function deleteExpiredCredentialBudgets(tx: Prisma.TransactionClient, now: Date): Promise<number> {
  return tx.$executeRaw`DELETE FROM AuthThrottle WHERE expiresAt <= ${now} LIMIT 100`;
}
