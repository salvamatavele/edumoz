import type { PermissionAction } from "./permission-catalog";
export interface PermissionLevelEntry { readonly id: string; readonly action: PermissionAction; }
export type ResourcePermissionLevel = "none" | "read" | "write" | "custom";
export function resourcePermissionLevel(entries: readonly PermissionLevelEntry[], selected: ReadonlySet<string>): ResourcePermissionLevel {
  const granted = entries.filter(row => selected.has(row.id));
  if (!granted.length) return "none";
  if (granted.length === 1 && granted[0].action === "view") return "read";
  if (granted.length === entries.length) return "write";
  return "custom";
}
export function setResourcePermissionLevel(entries: readonly PermissionLevelEntry[], selected: ReadonlySet<string>, level: Exclude<ResourcePermissionLevel, "custom">): ReadonlySet<string> {
  const next = new Set(selected);
  for (const row of entries) { next.delete(row.id); if (level === "write" || (level === "read" && row.action === "view")) next.add(row.id); }
  return next;
}
