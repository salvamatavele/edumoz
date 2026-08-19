import type { PermissionAction, PermissionResource } from "@/features/identity/domain/permission-catalog";
import { getTenantDb } from "@/lib/db/tenant";

export interface PermissionCatalogEntryRow {
  readonly id: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

/** Catálogo global, com os ids que `RolePermission` referencia. Não é por escola. */
export async function listPermissionCatalog(schoolId: string): Promise<PermissionCatalogEntryRow[]> {
  const db = getTenantDb(schoolId);

  const rows = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    resource: row.resource as PermissionResource,
    action: row.action as PermissionAction,
  }));
}

export interface PermissionRoleRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissionIds: readonly string[];
  readonly memberCount: number;
}

/** Papéis configuráveis da escola, com as suas permissões marcadas. */
export async function listPermissionRoles(schoolId: string): Promise<PermissionRoleRow[]> {
  const db = getTenantDb(schoolId);

  const roles = await db.permissionRole.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: { select: { permissionId: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { name: "asc" },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissionIds: role.permissions.map((p) => p.permissionId),
    memberCount: role._count.memberships,
  }));
}

export interface AssignableStaffRow {
  readonly membershipId: string;
  readonly userName: string;
  readonly userEmail: string | null;
  readonly permissionRoleId: string | null;
}

/**
 * Gestores da escola (`role: SCHOOL_MANAGER`) — só estes podem ter um `PermissionRole`
 * atribuído (ver schema.prisma). O próprio superadmin nem sempre tem `Membership`, por
 * isso não aparece aqui — o seu acesso não depende de nenhuma.
 */
export async function listAssignableStaff(schoolId: string): Promise<AssignableStaffRow[]> {
  const db = getTenantDb(schoolId);

  const memberships = await db.membership.findMany({
    where: { role: "SCHOOL_MANAGER", status: "ACTIVE" },
    select: {
      id: true,
      permissionRoleId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    userName: membership.user.name ?? membership.user.email ?? "—",
    userEmail: membership.user.email,
    permissionRoleId: membership.permissionRoleId,
  }));
}
