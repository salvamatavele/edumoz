import type { PermissionGrant } from "@/features/identity/domain/access";
import { hasActiveSchoolPermissionOverrides, isLegacyUnrestrictedAssociation, resolveFunctionalSchoolPermissions } from "../domain/functional-permissions";
import { getTenantDb } from "@/lib/db/tenant";

/** Compatibility reader using the same effective-grant rules as authenticated requests. */
export async function loadMembershipPermissions(schoolId: string, userId: string): Promise<{ permissionRoleId: string | null; permissionsConfigured: boolean; permissions: readonly PermissionGrant[] }> {
  const db = getTenantDb(schoolId);
  const associations = await db.membership.findMany({
    where: { userId, status: "ACTIVE", role: { in: ["SCHOOL_MANAGER", "TEACHER"] }, school: { isActive: true }, user: { isActive: true, passwordChangeRequired: false } },
    select: {
      schoolId: true, role: true, status: true, permissionsConfigured: true, permissionRoleId: true,
          permissionOverrides: { select: { allowed: true, permission: { select: { resource: true, action: true } } } },
      permissionRole: { select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } } },
      assignedRoles: { select: { permissionRole: { select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } } } } },
    },
  });
  const manager = associations.find(row => row.role === "SCHOOL_MANAGER");
  return { permissionRoleId: manager?.permissionRoleId ?? null, permissionsConfigured: !manager || !isLegacyUnrestrictedAssociation(manager) || hasActiveSchoolPermissionOverrides(associations, schoolId), permissions: resolveFunctionalSchoolPermissions(associations, schoolId) };
}
