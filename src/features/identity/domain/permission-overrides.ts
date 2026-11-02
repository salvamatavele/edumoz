import { PERMISSION_CATALOG } from "./permission-catalog";
import type { PermissionGrant } from "./access";

export interface PermissionOverrideGrant {
  readonly resource: string;
  readonly action: string;
  readonly allowed: boolean;
}

/** Explicit school denials win across active associations, independently of query order. */
export function applyPermissionOverrides(
  inherited: readonly PermissionGrant[],
  overrides: readonly PermissionOverrideGrant[],
): PermissionGrant[] {
  const grants = new Set(inherited.map(row => `${row.resource}/${row.action}`));
  const denied = new Set<string>();
  for (const override of overrides) {
    const key = `${override.resource}/${override.action}`;
    if (override.allowed) grants.add(key);
    else denied.add(key);
  }
  return PERMISSION_CATALOG.filter(row => {
    const key = `${row.resource}/${row.action}`;
    return grants.has(key) && !denied.has(key);
  }).map(row => ({ ...row }));
}
