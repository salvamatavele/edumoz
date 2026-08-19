import type { PermissionGrant } from "@/features/identity/domain/access";
import type { PermissionAction, PermissionResource } from "@/features/identity/domain/permission-catalog";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Permissões da `Membership` de um gestor nesta escola, para construir o `SessionContext`
 * que `hasPermission` consulta. Devolve `permissionRoleId: null` sem tocar
 * `RolePermission` quando a `Membership` não tem papel configurável atribuído — é o caso
 * comum, e continua a significar acesso total (ver `hasPermission`, `access.ts`). Só
 * `SCHOOL_MANAGER` pode ter `permissionRoleId` (ver schema.prisma), por isso a chave é
 * `(userId, schoolId)` — os mesmos dados já disponíveis em todo o sítio que constrói um
 * `SessionContext` hoje, sem precisar de transportar o id da `Membership`.
 */
export async function loadMembershipPermissions(
  schoolId: string,
  userId: string,
): Promise<{ permissionRoleId: string | null; permissions: readonly PermissionGrant[] }> {
  const db = getTenantDb(schoolId);

  const membership = await db.membership.findUnique({
    where: { userId_schoolId_role: { userId, schoolId, role: "SCHOOL_MANAGER" } },
    select: {
      permissionRoleId: true,
      permissionRole: {
        select: {
          permissions: {
            select: { permission: { select: { resource: true, action: true } } },
          },
        },
      },
    },
  });

  if (!membership?.permissionRoleId || !membership.permissionRole) {
    return { permissionRoleId: null, permissions: [] };
  }

  const permissions: PermissionGrant[] = membership.permissionRole.permissions.map(
    (rolePermission) => ({
      resource: rolePermission.permission.resource as PermissionResource,
      action: rolePermission.permission.action as PermissionAction,
    }),
  );

  return { permissionRoleId: membership.permissionRoleId, permissions };
}
