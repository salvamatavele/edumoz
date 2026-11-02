// @vitest-environment node
import { randomUUID } from "node:crypto";
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
const { createPermissionRole } = await import("./create-permission-role");

const mockAuth = auth as unknown as { mockResolvedValue: (value: unknown) => void };
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createPermissionRole", () => {
  const suffix = `T${Date.now()}`;
  let schoolId = "";
  let unrestrictedActorId = "";
  let platformActorId = "";
  let viewPermissionId = "";
  let restrictedRoleId = "";
  let restrictedActorId = "";

  beforeAll(async () => {
    const school = await prisma.school.create({
      data: { code: `CPR-${suffix}`, name: "Escola de teste (papéis)", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
    unrestrictedActorId = (await prisma.user.create({ data: { name: "Synthetic role creator", memberships: { create: { schoolId, role: "SCHOOL_MANAGER" } } } })).id;
    platformActorId = (await prisma.user.create({ data: { name: "Synthetic platform role creator", isPlatformAdmin: true } })).id;

    const viewPermission = await prisma.permission.upsert({
      where: { resource_action: { resource: "students", action: "view" } },
      update: {},
      create: { resource: "students", action: "view" },
    });
    viewPermissionId = viewPermission.id;

    const restrictedRole = await prisma.permissionRole.create({
      data: { schoolId, name: `Restrito-${suffix}` },
    });
    restrictedRoleId = restrictedRole.id;

    const restrictedUser = await prisma.user.create({
      data: { name: "Gestor restrito", email: `gestor.restrito.${suffix}@edumoz.co.mz` },
    });

    await prisma.membership.create({
      data: {
        userId: restrictedUser.id,
        schoolId,
        role: "SCHOOL_MANAGER",
        permissionRoleId: restrictedRoleId,
      },
    });

    restrictedActorId = restrictedUser.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { schoolId } });
    await prisma.membership.deleteMany({ where: { schoolId } });
    await prisma.permissionRole.deleteMany({ where: { schoolId } });
    await prisma.user.deleteMany({ where: { id: { in: [restrictedActorId, unrestrictedActorId, platformActorId] } } });
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

  const roleName = `Director-adjunto (${suffix})`;

  it("recusa sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: roleName, description: "", permissionIds: [] });
    expect(result.status).toBe("error");
  });

  it("recusa um professor", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: "teacher-1", role: "TEACHER" }));
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: roleName, description: "", permissionIds: [] });
    expect(result.status).toBe("error");
  });

  it("recusa um gestor já restrito por um papel — não se pode auto-promover", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: restrictedActorId, role: "SCHOOL_MANAGER" }));
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: roleName, description: "", permissionIds: [] });
    expect(result.status).toBe("error");
  });

  it("devolve fieldErrors quando o nome é inválido", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: "", description: "", permissionIds: [] });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.name).toBeDefined();
  });

  it("cria o papel com as permissões marcadas e regista o AuditLog, para um gestor sem papel atribuído", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));

    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(),
      name: roleName,
      description: "Vê alunos, mais nada",
      permissionIds: [viewPermissionId],
    });

    expect(result.status).toBe("success");

    const created = await prisma.permissionRole.findFirstOrThrow({
      where: { schoolId, name: roleName },
      include: { permissions: true },
    });
    expect(created.permissions).toHaveLength(1);
    expect(created.permissions[0]?.permissionId).toBe(viewPermissionId);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { schoolId, entityId: created.id } });
    expect(log.action).toBe("permissionRole.create");

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("cria o papel para um administrador da plataforma, mesmo sem Membership de gestor", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: platformActorId, role: null, isPlatformAdmin: true }));

    const platformAdminRoleName = `Papel do superadmin (${suffix})`;
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: platformAdminRoleName, description: "", permissionIds: [] });

    expect(result.status).toBe("success");

    const created = await prisma.permissionRole.findFirst({ where: { schoolId, name: platformAdminRoleName } });
    expect(created).not.toBeNull();
  });

  it("rejects unknown permission identifiers without creating a misleading empty role", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const garbageRoleName = `Invalid permission ${suffix}`;
    const result = await createPermissionRole({ expectedSchoolId: schoolId, requestId: randomUUID(), name: garbageRoleName, description: "", permissionIds: ["missing-id"] });
    expect(result.status).toBe("error");
    expect(await prisma.permissionRole.count({ where: { schoolId, name: garbageRoleName } })).toBe(0);
  });
  it("keeps uncertain creation retries idempotent and refuses a changed request", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const input = { expectedSchoolId: schoolId, requestId: randomUUID(), name: `Idempotent ${suffix}`, description: "Private description must not enter audit", permissionIds: [viewPermissionId] };
    const repeated = await Promise.all(Array.from({ length: 4 }, () => createPermissionRole(input)));
    expect(repeated.every(result => result.status === "success")).toBe(true);
    const roles = await prisma.permissionRole.findMany({ where: { schoolId, name: input.name } });
    expect(roles).toHaveLength(1);
    const logs = await prisma.auditLog.findMany({ where: { entityId: roles[0].id } });
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain(input.description);
    expect(await createPermissionRole({ ...input, name: "Changed after uncertainty" })).toMatchObject({ status: "error", message: "permissionRoles.errors.requestChanged" });
    expect((await prisma.permissionRole.findUniqueOrThrow({ where: { id: roles[0].id } })).name).toBe(input.name);
  });
  it("refuses stale school, revoked actor and duplicate names safely", async () => {
    mockAuth.mockResolvedValue(sessionAs({ userId: unrestrictedActorId, role: "SCHOOL_MANAGER" }));
    const input = { expectedSchoolId: schoolId, requestId: randomUUID(), name: `Duplicate ${suffix}`, description: "", permissionIds: [] };
    expect(await createPermissionRole({ ...input, expectedSchoolId: "another-school" })).toMatchObject({ status: "error", message: "users.errors.schoolChanged" });
    expect((await createPermissionRole(input)).status).toBe("success");
    expect(await createPermissionRole({ ...input, requestId: randomUUID() })).toMatchObject({ status: "error", message: "permissionRoles.errors.duplicateName" });
    await prisma.membership.updateMany({ where: { schoolId, userId: unrestrictedActorId }, data: { status: "SUSPENDED" } });
    try { expect(await createPermissionRole({ ...input, name: "Revoked must not create", requestId: randomUUID() })).toMatchObject({ status: "error", message: "users.errors.forbidden" }); }
    finally { await prisma.membership.updateMany({ where: { schoolId, userId: unrestrictedActorId }, data: { status: "ACTIVE" } }); }
  });

});
