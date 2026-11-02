import { hasActiveSchoolPermissionOverrides, isLegacyUnrestrictedAssociation, resolveFunctionalSchoolPermissions } from "../domain/functional-permissions";
import type { SessionContext } from "@/features/identity/domain/access";
import { SchoolUserError } from "@/features/identity/domain/school-users";
import type { Prisma } from "@/lib/db/errors";

/** School identity mutations share a lock and reread the actor's persisted authority. */
export async function authorizeSchoolIdentityMutation(tx: Prisma.TransactionClient, context: SessionContext, action: "create" | "edit", resource: "users" | "school-staff" = "users") {
  const schoolId = context.schoolId;
  if (!schoolId) throw new SchoolUserError("forbidden");
  const locked = await tx.school.updateMany({ where: { id: schoolId, isActive: true }, data: { isActive: true } });
  if (locked.count !== 1) throw new SchoolUserError("forbidden");
  const actor = await tx.user.findUnique({ where: { id: context.userId }, select: {
    isActive: true, isPlatformAdmin: true, authVersion: true, passwordChangeRequired: true,
    memberships: { where: { schoolId, role: { in: ["SCHOOL_MANAGER", "TEACHER"] }, status: "ACTIVE" }, select: {
      schoolId: true, status: true, role: true, permissionsConfigured: true,
      permissionOverrides: { select: { allowed: true, permission: { select: { resource: true, action: true } } } },
      assignedRoles: { select: { permissionRole: { select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } } } } },
      permissionRoleId: true, permissionRole: { select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } } },
    } },
  } });
  const unrestricted = actor?.isPlatformAdmin || (!hasActiveSchoolPermissionOverrides(actor?.memberships ?? [], schoolId) && actor?.memberships.some(isLegacyUnrestrictedAssociation));
  const grants = resolveFunctionalSchoolPermissions(actor?.memberships ?? [], schoolId);
  const granted = unrestricted || grants.some(grant => grant.resource === resource && grant.action === action);
  if (!actor?.isActive || actor.passwordChangeRequired || actor.authVersion !== (context.authVersion ?? 0) || !granted) throw new SchoolUserError("forbidden");
  return { isPlatformAdmin: actor.isPlatformAdmin, unrestricted: !!unrestricted };
}
