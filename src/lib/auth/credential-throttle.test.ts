// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getTenantDb } from "@/lib/db/tenant";
import { CREDENTIAL_LIMITS, consumeCredentialAttempt, credentialThrottleKeys, resetCredentialAttempts, deleteExpiredCredentialBudgets } from "./credential-throttle";

let secret: string;
let keys: Set<string>;
const identifier = "synthetic@example.invalid";
function track(value = identifier) {
  const result = credentialThrottleKeys(value, secret);
  keys.add(result.global); keys.add(result.identifier);
  return result;
}
describe("persistent credential budgets", () => {
  beforeEach(() => { secret = randomBytes(32).toString("hex"); keys = new Set(); });
  afterEach(async () => { await prisma.authThrottle.deleteMany({ where: { key: { in: [...keys] } } }); });
  it("stores digests and normalizes identity casing/outer whitespace", () => {
    const a = track(" Synthetic@Example.Invalid ");
    expect(a).toEqual(track(identifier));
    expect(a.identifier).toMatch(/^[a-f0-9]{64}$/);
    expect(a.identifier).not.toContain("synthetic");
    expect(a.identifier).not.toBe(a.global);
  });
  it("allows exactly ten of twenty-four concurrent attempts", async () => {
    const { identifier: key } = track();
    const now = new Date();
    const results = await Promise.all(Array.from({ length: 24 }, () => consumeCredentialAttempt(identifier, now, secret)));
    expect(results.filter(Boolean)).toHaveLength(CREDENTIAL_LIMITS.identifier.attempts);
    expect((await prisma.authThrottle.findUniqueOrThrow({ where: { key } })).attempts).toBe(10);
  });
  it("shares the global budget across different identifiers", async () => {
    const { global } = track(); track("second@example.invalid");
    const now = new Date();
    await prisma.authThrottle.create({ data: { key: global, attempts: 299, expiresAt: new Date(now.getTime() + 60000) } });
    const results = await Promise.all([consumeCredentialAttempt(identifier, now, secret), consumeCredentialAttempt("second@example.invalid", now, secret)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await prisma.authThrottle.findUniqueOrThrow({ where: { key: global } })).attempts).toBe(300);
  });
  it("admits a new attempt after the identifier window expires without sleeps", async () => {
    const { identifier: key } = track(); const now = new Date();
    await prisma.authThrottle.create({ data: { key, attempts: 10, expiresAt: new Date(now.getTime() + 1000) } });
    expect(await consumeCredentialAttempt(identifier, now, secret)).toBe(false);
    expect(await consumeCredentialAttempt(identifier, new Date(now.getTime() + 1001), secret)).toBe(true);
    expect((await prisma.authThrottle.findUniqueOrThrow({ where: { key } })).attempts).toBe(1);
  });
  it("clears only the successful identity budget", async () => {
    const ids = track(); const now = new Date();
    await consumeCredentialAttempt(identifier, now, secret);
    await resetCredentialAttempts(identifier, secret);
    expect(await prisma.authThrottle.findUnique({ where: { key: ids.identifier } })).toBeNull();
    expect((await prisma.authThrottle.findUniqueOrThrow({ where: { key: ids.global } })).attempts).toBe(1);
  });
  it("bounds one cleanup batch and removes expired rows within its own transaction", async () => {
    const now = new Date(); track();
    // Clear genuinely expired leftovers before inserting fixtures invisible to other transactions.
    while (await prisma.$transaction(tx => deleteExpiredCredentialBudgets(tx, now)) === 100) { /* bounded batches */ }
    const expired = Array.from({ length: 120 }, (_, i) => credentialThrottleKeys(`expired-${i}`, secret).identifier);
    expired.forEach(key => keys.add(key));
    await prisma.$transaction(async tx => {
      await tx.authThrottle.createMany({ data: expired.map(key => ({ key, attempts: 1, expiresAt: new Date(now.getTime() - 1000) })) });
      expect(await deleteExpiredCredentialBudgets(tx, now)).toBe(100);
      expect(await tx.authThrottle.count({ where: { key: { in: expired } } })).toBe(20);
    });
  });
  it("does not expose global budgets through a school database client", async () => {
    await expect(getTenantDb("school-a").authThrottle.findMany()).rejects.toThrow(/Global model/);
  });
});

it("separates mutation budgets from attacker-controlled public login identifiers", () => {
  const login = credentialThrottleKeys("school-user-create:holder", "test-secret");
  const creation = credentialThrottleKeys("holder", "test-secret", "school-user-create");
  const password = credentialThrottleKeys("holder", "test-secret", "password-change");
  expect(login.identifier).not.toBe(creation.identifier);
  expect(creation.identifier).not.toBe(password.identifier);
  expect(login.global).toBe(creation.global);
});

it("shares a login budget across equivalent Mozambican phone formats", () => {
  const key = credentialThrottleKeys("840000001", "synthetic-secret").identifier;
  expect(credentialThrottleKeys("+258840000001", "synthetic-secret").identifier).toBe(key);
  expect(credentialThrottleKeys("258840000001", "synthetic-secret").identifier).toBe(key);
});
