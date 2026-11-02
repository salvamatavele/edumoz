// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }) }));
vi.mock("next-auth/providers/google", () => ({ default: () => ({}) }));
vi.mock("next-auth/providers/credentials", () => ({ default: () => ({}) }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("@/features/identity/data/sign-in", () => ({ authoriseSignIn: vi.fn(), acceptInvitations: vi.fn(), findUserForCredentials: vi.fn() }));
vi.mock("./session-access", () => ({ loadEffectiveSessionAccess: vi.fn() }));

vi.mock("./session-registry", () => ({ validateRegisteredSession: vi.fn(async () => ({ sessionNonce: "server-nonce", authSessionId: "server-id" })), revokeSignedSession: vi.fn() }));

const { authConfig } = await import("./config");
const { authoriseSignIn } = await import("@/features/identity/data/sign-in");
const { loadEffectiveSessionAccess } = await import("./session-access");
const loadAccess = vi.mocked(loadEffectiveSessionAccess);

function access(schoolId: string | null = "school-a") {
  return {
    passwordChangeRequired: false, authVersion: 0, userId: "user-1", user: { id: "user-1", name: "Manager", email: null, image: null },
    schoolId, role: "SCHOOL_MANAGER" as const, isPlatformAdmin: false,
    memberships: [{ schoolId: "school-a", schoolName: "School A", role: "SCHOOL_MANAGER" as const }],
    permissionRoleId: "role-1", permissionsConfigured: true, permissions: [{ resource: "students" as const, action: "view" as const }],
  };
}

describe("Auth.js current authorization", () => {
  beforeEach(() => { loadAccess.mockReset(); });

  it("uses the server-authenticated user ID for a phone-only credential login", async () => {
    vi.mocked(authoriseSignIn).mockResolvedValue({ allow: true, acceptInvitationIds: [] });
    expect(await authConfig.callbacks.signIn({ user: { id: "phone-user", email: null }, account: { provider: "credentials" } } as never)).toBe(true);
    expect(authoriseSignIn).toHaveBeenCalledWith(expect.objectContaining({ userId: "phone-user", email: null, provider: "credentials" }));
  });

  it("discards the JWT when the account is no longer active", async () => {
    loadAccess.mockResolvedValue(null);
    expect(await authConfig.callbacks.jwt({ token: { userId: "user-1", isPlatformAdmin: true } } as never)).toBeNull();
  });

  it("overwrites stale JWT privileges from persisted state on every request", async () => {
    loadAccess.mockResolvedValue(access());
    const token = { userId: "user-1", schoolId: "school-a", isPlatformAdmin: true, permissions: [{ resource: "students", action: "delete" }] };
    const result = await authConfig.callbacks.jwt({ token } as never);
    expect(result).toMatchObject({ isPlatformAdmin: false, permissionRoleId: "role-1", permissions: access().permissions });
    expect(loadAccess).toHaveBeenCalledWith("user-1", "school-a");
  });

  it("ignores a forged school update using current memberships", async () => {
    loadAccess.mockResolvedValue(access());
    const result = await authConfig.callbacks.jwt({ token: { userId: "user-1", schoolId: "school-a" }, trigger: "update", session: { schoolId: "school-b", isPlatformAdmin: true } } as never);
    expect(result).toMatchObject({ schoolId: "school-a", isPlatformAdmin: false });
    expect(loadAccess).toHaveBeenCalledTimes(1);
  });

  it("revalidates an allowed school selection before switching", async () => {
    loadAccess.mockResolvedValueOnce({ ...access(), isPlatformAdmin: true }).mockResolvedValueOnce({ ...access("school-b"), isPlatformAdmin: true });
    const result = await authConfig.callbacks.jwt({ token: { userId: "user-1", schoolId: "school-a" }, trigger: "update", session: { schoolId: "school-b" } } as never);
    expect(result).toMatchObject({ schoolId: "school-b" });
    expect(loadAccess).toHaveBeenLastCalledWith("user-1", "school-b");
  });

  it("propagates current restrictions into the session", () => {
    const session = { user: { id: "" }, schoolId: null };
    const token = { userId: "user-1", schoolId: "school-a", role: "SCHOOL_MANAGER", permissionRoleId: "role-1", permissions: access().permissions, memberships: access().memberships };
    expect(authConfig.callbacks.session({ session, token } as never)).toMatchObject({ permissionRoleId: "role-1", permissions: access().permissions, isPlatformAdmin: false });
  });
  it("refuses a token older than the persisted credential version, including a forged update", async () => {
    loadAccess.mockResolvedValue({ ...access(), authVersion: 1 });
    for (const token of [{ userId: "user-1" }, { userId: "user-1", authVersion: 0 }]) {
      expect(await authConfig.callbacks.jwt({ token, trigger: "update", session: { authVersion: 1, user: { authVersion: 1 } } } as never)).toBeNull();
    }
  });
  it("stamps a new login with the version actually verified and refuses a concurrent credential change", async () => {
    loadAccess.mockResolvedValue({ ...access(), authVersion: 2 });
    expect(await authConfig.callbacks.jwt({ token: {}, user: { id: "user-1", authVersion: 1 } } as never)).toBeNull();
    expect(await authConfig.callbacks.jwt({ token: {}, user: { id: "user-1", authVersion: 2 } } as never)).toMatchObject({ authVersion: 2 });
  });
  it("refuses credential revocation racing a school switch", async () => {
    loadAccess.mockResolvedValueOnce({ ...access(), isPlatformAdmin: true }).mockResolvedValueOnce({ ...access("school-b"), authVersion: 1 });
    expect(await authConfig.callbacks.jwt({ token: { userId: "user-1", schoolId: "school-a", authVersion: 0 }, trigger: "update", session: { schoolId: "school-b" } } as never)).toBeNull();
  });

  it("uses an eight-hour session window", () => {
    expect(authConfig.session.maxAge).toBe(8 * 60 * 60);
  });
  it("propagates the persisted initial-password obligation and ignores a client override", async () => {
    loadAccess.mockResolvedValue({ ...access(null), role: null, isPlatformAdmin: false, memberships: [], permissions: [], permissionRoleId: null, permissionsConfigured: false, passwordChangeRequired: true });
    const token = await authConfig.callbacks.jwt({ token: { userId: "user-1", authVersion: 0 }, trigger: "update", session: { passwordChangeRequired: false, schoolId: "school-a", isPlatformAdmin: true } } as never);
    expect(token).toMatchObject({ passwordChangeRequired: true, schoolId: null, role: null, memberships: [], isPlatformAdmin: false, permissions: [] });
    expect(authConfig.callbacks.session({ session: { user: { id: "" } }, token } as never)).toMatchObject({ passwordChangeRequired: true });
  });

});

it("refuses a revoked session even when its persisted account privileges remain valid", async () => {
  const registry = await import("./session-registry");
  loadAccess.mockResolvedValue(access());
  vi.mocked(registry.validateRegisteredSession).mockResolvedValueOnce(null);
  expect(await authConfig.callbacks.jwt({ token: { userId: "user-1", authVersion: 0, sessionNonce: "signed-nonce" } } as never)).toBeNull();
});
it("does not let a client update select a session nonce or expose it in the session JSON", async () => {
  const registry = await import("./session-registry");
  loadAccess.mockResolvedValue(access());
  const token = await authConfig.callbacks.jwt({ token: { userId: "user-1", authVersion: 0, sessionNonce: "signed-nonce" }, trigger: "update", session: { sessionNonce: "forged", authSessionId: "forged" } } as never);
  expect(registry.validateRegisteredSession).toHaveBeenLastCalledWith(expect.objectContaining({ sessionNonce: "signed-nonce" }), false);
  const exposed = authConfig.callbacks.session({ session: { user: { id: "" } }, token } as never);
  expect(exposed).toMatchObject({ user: { authSessionId: "server-id" } });
  expect(JSON.stringify(exposed)).not.toContain("server-nonce");
});
it("revokes verified token claims on the standard Auth.js signout event", async () => {
  const registry = await import("./session-registry");
  const token = { userId: "user-1", authVersion: 0, sessionNonce: "signed-nonce" };
  await authConfig.events.signOut({ token } as never);
  expect(registry.revokeSignedSession).toHaveBeenCalledWith(token);
});

it("keeps explicit empty restrictions despite forged privilege and mode updates", async () => {
  loadAccess.mockResolvedValue({ ...access(), permissionRoleId: null, permissionsConfigured: true, permissions: [] });
  const token = await authConfig.callbacks.jwt({ token: { userId: "user-1", schoolId: "school-a", authVersion: 0, permissionsConfigured: false }, trigger: "update", session: { permissionsConfigured: false, permissionRoleId: null, permissions: [{ resource: "users", action: "edit" }] } } as never);
  expect(token).toMatchObject({ permissionsConfigured: true, permissionRoleId: null, permissions: [] });
  expect(authConfig.callbacks.session({ session: { user: { id: "" } }, token } as never)).toMatchObject({ permissionsConfigured: true, permissions: [] });
});
