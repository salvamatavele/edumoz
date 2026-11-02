import { hasActiveSchoolPermissionOverrides, isLegacyUnrestrictedAssociation, resolveFunctionalSchoolPermissions } from "@/features/identity/domain/functional-permissions";
import type { PermissionGrant, SchoolMembership, SessionContext } from "@/features/identity/domain/access";
import { rankOf } from "@/features/identity/domain/access";
import { prisma } from "@/lib/db/client";

export interface EffectiveSessionAccess extends SessionContext {
  readonly authVersion: number;
  readonly passwordChangeRequired: boolean;
  readonly permissionRoleId: string | null;
  readonly permissionsConfigured: boolean;
  readonly permissions: PermissionGrant[];
  readonly memberships: SchoolMembership[];
  readonly user: { id: string; name: string | null; email: string | null; image: string | null };
}

/** The JWT identifies the account and requested school; persisted state grants access. */
export async function loadEffectiveSessionAccess(
  userId: string,
  requestedSchoolId?: string | null,
): Promise<EffectiveSessionAccess | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true, isActive: true, isPlatformAdmin: true, authVersion: true, passwordChangeRequired: true, passwordExpiresAt: true,
      memberships: {
        where: { status: "ACTIVE", school: { isActive: true } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          schoolId: true, role: true, status: true, permissionsConfigured: true, permissionRoleId: true,
          permissionOverrides: { select: { allowed: true, permission: { select: { resource: true, action: true } } } },
          assignedRoles: { select: { permissionRole: { select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } } } } },
          school: { select: { name: true, shortName: true } },
          permissionRole: {
            select: { schoolId: true, permissions: { select: { permission: { select: { resource: true, action: true } } } } },
          },
        },
      },
    },
  });
  if (!user?.isActive) return null;
  if (user.passwordChangeRequired) {
    if (!user.passwordExpiresAt || user.passwordExpiresAt <= new Date()) return null;
    return {
      userId: user.id, authVersion: user.authVersion, passwordChangeRequired: true,
      user: { id: user.id, name: user.name, email: user.email, image: user.image },
      schoolId: null, role: null, memberships: [], isPlatformAdmin: false, permissionRoleId: null, permissionsConfigured: false, permissions: [],
    };
  }

  const memberships = user.memberships.map((membership) => ({
    schoolId: membership.schoolId,
    schoolName: membership.school.shortName ?? membership.school.name,
    role: membership.role,
  }));
  const candidate = requestedSchoolId === undefined ? memberships[0]?.schoolId ?? null : requestedSchoolId;
  const membership = user.memberships.filter(item => item.schoolId === candidate).sort((a, b) => rankOf(b.role) - rankOf(a.role))[0];
  let schoolId = membership ? candidate : null;
  if (user.isPlatformAdmin && candidate && !membership) {
    const school = await prisma.school.findFirst({ where: { id: candidate, isActive: true }, select: { id: true } });
    schoolId = school?.id ?? null;
  }

  const role = schoolId ? membership?.role ?? null : null;
  const permissionRoleId = role === "SCHOOL_MANAGER" ? membership?.permissionRoleId ?? null : null;
  const permissionsConfigured = role === "SCHOOL_MANAGER"
    ? !isLegacyUnrestrictedAssociation(membership!) || hasActiveSchoolPermissionOverrides(user.memberships, schoolId!)
    : Boolean(membership?.permissionsConfigured || membership?.assignedRoles.length || (schoolId && hasActiveSchoolPermissionOverrides(user.memberships, schoolId)));
  const permissions = schoolId ? resolveFunctionalSchoolPermissions(user.memberships, schoolId) : [];
  return {
    userId: user.id, authVersion: user.authVersion, passwordChangeRequired: false,
    user: { id: user.id, name: user.name, email: user.email, image: user.image },
    schoolId, role, memberships, isPlatformAdmin: user.isPlatformAdmin, permissionRoleId, permissionsConfigured, permissions,
  };
}
