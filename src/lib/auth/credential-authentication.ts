import { findUserForCredentials } from "@/features/identity/data/sign-in";
import { consumeCredentialAttempt, resetCredentialAttempts } from "./credential-throttle";
import { hashPassword, verifyPassword } from "./password";
import { safeAuthLogger } from "./safe-logger";

let dummyHash: Promise<string> | undefined;

export async function authenticateCredentials(credentials: Partial<Record<string, unknown>>) {
  const identifier = credentials?.identifier;
  const password = credentials?.password;
  if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || !password || identifier.length > 254 || password.length > 1024) return null;

  try {
    if (!(await consumeCredentialAttempt(identifier))) return null;
    const user = await findUserForCredentials(identifier);
    // Unknown accounts and Google-only accounts still pay the normal Argon2 cost.
    const passwordHash = user?.passwordHash ?? await (dummyHash ??= hashPassword("Synthetic timing placeholder; never an account password."));
    const verified = await verifyPassword(password, passwordHash);
    if (!user || !verified) return null;
    if (user.passwordChangeRequired && (!user.passwordExpiresAt || user.passwordExpiresAt <= new Date())) return null;
    await resetCredentialAttempts(identifier);
    return { id: user.id, name: user.name, email: user.email, image: user.image, authVersion: user.authVersion };
  } catch {
    safeAuthLogger.error(new Error("Credential authentication unavailable"));
    return null;
  }
}
