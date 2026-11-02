import { PERMISSION_CATALOG } from "./permission-catalog";
import type { PermissionGrant } from "./access";
import { applyPermissionOverrides } from "./permission-overrides";

export interface AssociationPermissionState {
  readonly role: string | null;
  readonly permissionsConfigured?: boolean;
  readonly permissionRoleId?: string | null;
  readonly assignedRoles?: readonly unknown[];
  readonly permissionOverrides?: readonly unknown[];
}

/** An empty configured association never silently becomes a legacy full-access manager. */
export function isLegacyUnrestrictedAssociation(association: AssociationPermissionState): boolean {
  return hasLegacyFullProfileAccess(association) && !association.permissionOverrides?.length;
}

/** Profile mode is independent of exceptions, so editing profiles cannot clear exceptions. */
export function hasLegacyFullProfileAccess(association: AssociationPermissionState): boolean {
  return association.role === "SCHOOL_MANAGER"
    && !association.permissionsConfigured
    && !association.permissionRoleId
    && !association.assignedRoles?.length;
}

interface PersistedRoleGrants {
  readonly schoolId: string;
  readonly permissions: readonly { readonly permission: { readonly resource: string; readonly action: string } }[];
}
export interface FunctionalAssociation extends AssociationPermissionState {
  readonly schoolId: string;
  readonly status: string;
  readonly permissionRole?: PersistedRoleGrants | null;
  readonly assignedRoles?: readonly { readonly permissionRole: PersistedRoleGrants }[];
  readonly permissionOverrides?: readonly { readonly allowed: boolean; readonly permission: { readonly resource: string; readonly action: string } }[];
}

export function hasActiveSchoolPermissionOverrides(associations: readonly FunctionalAssociation[], schoolId: string): boolean {
  return associations.some(row => row.schoolId === schoolId && row.status === "ACTIVE" && ["SCHOOL_MANAGER", "TEACHER"].includes(row.role ?? "") && !!row.permissionOverrides?.length);
}

/** Administrative grants complement the base role; they never establish teaching/family ownership. */
export function resolveFunctionalSchoolPermissions(associations: readonly FunctionalAssociation[], schoolId: string): PermissionGrant[] {
  const eligible = associations.filter(row => row.schoolId === schoolId && row.status === "ACTIVE" && ["SCHOOL_MANAGER", "TEACHER"].includes(row.role ?? ""));
  const overrides = eligible.flatMap(row => (row.permissionOverrides ?? []).map(override => ({ ...override.permission, allowed: override.allowed })));
  const granted = new Set<string>();
  function collect(role: PersistedRoleGrants | null | undefined) {
    if (role?.schoolId !== schoolId) return;
    for (const { permission } of role.permissions) granted.add(`${permission.resource}/${permission.action}`);
  }
  for (const association of eligible) {
    // Only managers consumed the old bridge; backfill must not elevate another base role.
    if (association.role === "SCHOOL_MANAGER" && association.permissionRoleId) collect(association.permissionRole);
    if (association.permissionsConfigured) for (const assignment of association.assignedRoles ?? []) collect(assignment.permissionRole);
  }
  const inherited = overrides.length && eligible.some(hasLegacyFullProfileAccess)
    ? PERMISSION_CATALOG
    : PERMISSION_CATALOG.filter(entry => granted.has(`${entry.resource}/${entry.action}`));
  return applyPermissionOverrides(inherited, overrides);
}
