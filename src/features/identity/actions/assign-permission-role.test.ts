// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: vi.fn(({ href }: { href: string }) => href),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

const { revalidatePath } = await import("next/cache");
const { auth } = await import("@/lib/auth/config");
const { prisma } = await import("@/lib/db/client");
const { assignPermissionRole } = await import("./assign-permission-role");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("assignPermissionRole", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let unrestrictedActorId = "";
  let platformActorId = "";
  let roleId = "";
  let restrictedRoleId = "";
  let restrictedActorId = "";
  let targetMembershipId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `APR-${suffix}`, name: "Escola de teste (atribuição)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
    unrestrictedActorId = (await prisma.user.create({ data: { name: "Synthetic unrestricted assignment actor", memberships: { create: { schoolId, role: "SCHOOL_MANAGER" } } } })).id;
    platformActorId = (await prisma.user.create({ data: { name: "Synthetic platform assignment actor", isPlatformAdmin: true } })).id;

    const role = await prisma.permissionRole.create({ data: { schoolId, name: `Director-adjunto-${suffix}` } });
    roleId = role.id;

    const restrictedRole = await prisma.permissionRole.create({ data: { schoolId, name: `Restrito-${suffix}` } });
    restrictedRoleId = restrictedRole.id;

    const restrictedUser = await prisma.user.create({
      data: { name: "Gestor restrito", email: `gestor.restrito.${suffix}@edumoz.co.mz` },
    });
    restrictedActorId = restrictedUser.id;

    await prisma.membership.create({
      data: { userId: restrictedActorId, schoolId, role: "SCHOOL_MANAGER", permissionRoleId: restrictedRoleId },
    });

    const targetUser = await prisma.user.create({
      data: { name: "Gestor alvo", email: `gestor.alvo.${suffix}@edumoz.co.mz` },
    });

    const target = await prisma.membership.create({
      data: { userId: targetUser.id, schoolId, role: "SCHOOL_MANAGER" },
    });
    targetMembershipId = target.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    const userIds = (await prisma.membership.findMany({ where: { schoolId }, select: { userId: true } })).map(
      (m) => m.userId,
    );
    await prisma.membership.deleteMany({ where: { schoolId } });
    await prisma.permissionRole.deleteMany({ where: { schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [...userIds, platformActorId] } } });
    await prisma.school.delete({ where: { id: schoolId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    mockRevalidatePath.mockClear();
  });

  function sessionAs(overrides: {
    userId: string;
    role: "SCHOOL_MANAGER" | "TEACHER" | null;
    isPlatformAdmin?: boolean;
  }) {
    return {
      user: { id: overrides.userId, name: null, email: null, image: null },
      schoolId,
      role: overrides.role,
      isPlatformAdmin: overrides.isPlatformAdmin ?? false,
      memberships: overrides.role ? [{ schoolId, schoolName: "Escola de teste", role: overrides.role }] : [],
    } as never;
  }

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
    expect(result.status).toBe("error");
  });

  it("recusa um professor", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: "teacher-1", role: "TEACHER" }));
    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
    expect(result.status).toBe("error");
  });

  it("recusa um gestor já restrito por um papel", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: restrictedActorId, role: "SCHOOL_MANAGER" }));
    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
    expect(result.status).toBe("error");
  });

  it("recusa uma Membership inexistente", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: "membership-inexistente", permissionRoleId: roleId });
    expect(result.status).toBe("error");
  });

  it("recusa um papel inexistente", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: "papel-inexistente" });
    expect(result.status).toBe("error");
  });

  it("atribui o papel e regista o AuditLog", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));

    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
    expect(result.status).toBe("success");

    const membership = await prisma.membership.findUniqueOrThrow({ where: { id: targetMembershipId } });
    expect(membership.permissionRoleId).toBe(roleId);

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { schoolId, entityId: targetMembershipId, action: "membership.assignPermissionRole" },
      orderBy: { at: "desc" },
    });
    expect(log.after).toEqual({ permissionRoleId: roleId });

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("remove o papel com permissionRoleId nulo", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));

    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: null });
    expect(result.status).toBe("success");

    const membership = await prisma.membership.findUniqueOrThrow({ where: { id: targetMembershipId } });
    expect(membership.permissionRoleId).toBeNull();
  });

  it("permite um administrador da plataforma atribuir, mesmo sem Membership de gestor", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: platformActorId, role: null, isPlatformAdmin: true }));

    const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
    expect(result.status).toBe("success");
  });
  it("refuses a stale school, the holder's own restriction and a retired target", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    expect((await assignPermissionRole({ expectedSchoolId: "foreign", membershipId: targetMembershipId, permissionRoleId: roleId })).status).toBe("error");
    const own = await prisma.membership.findFirstOrThrow({ where: { userId: unrestrictedActorId, schoolId } });
    expect((await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: own.id, permissionRoleId: roleId })).status).toBe("error");
    await prisma.membership.update({ where: { id: targetMembershipId }, data: { status: "REMOVED" } });
    try {
      expect((await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: null })).status).toBe("error");
      expect((await prisma.membership.findUniqueOrThrow({ where: { id: targetMembershipId } })).status).toBe("REMOVED");
    } finally { await prisma.$transaction(async tx => { await tx.membershipPermissionRole.deleteMany({ where: { membershipId: targetMembershipId } }); await tx.membership.update({ where: { id: targetMembershipId }, data: { status: "ACTIVE", permissionRoleId: null, permissionsConfigured: false } }); }); }
  });
  it("cannot restrict the last usable administrator even as a platform administrator", async () => {
    await prisma.membership.updateMany({ where: { schoolId, userId: unrestrictedActorId }, data: { status: "SUSPENDED" } });
    mockAuth.mockResolvedValue(sessionAs({ userId: platformActorId, role: null, isPlatformAdmin: true }));
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: targetMembershipId } })).permissionsConfigured).toBe(false);
    expect(await prisma.membershipPermissionRole.count({ where: { membershipId: targetMembershipId } })).toBe(0);
    try {
      const result = await assignPermissionRole({ expectedSchoolId: schoolId, membershipId: targetMembershipId, permissionRoleId: roleId });
      expect(result).toMatchObject({ status: "error", message: "users.errors.lastManager" });
      expect((await prisma.membership.findUniqueOrThrow({ where: { id: targetMembershipId } })).permissionRoleId).toBeNull();
    } finally { await prisma.membership.updateMany({ where: { schoolId, userId: unrestrictedActorId }, data: { status: "ACTIVE" } }); }
  });

});
