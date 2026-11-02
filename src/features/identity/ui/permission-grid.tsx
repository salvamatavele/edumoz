"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PermissionCatalogEntryRow } from "../data/permission-roles";
import { PERMISSION_RESOURCES, isConsumedPermission, type PermissionResource } from "../domain/permission-catalog";
import { resourcePermissionLevel, setResourcePermissionLevel } from "../domain/permission-level";

function ResourcePermissionField({ resource, entries, selected, onChange, disabled }: { resource: PermissionResource; entries: readonly PermissionCatalogEntryRow[]; selected: ReadonlySet<string>; onChange: (ids: ReadonlySet<string>) => void; disabled: boolean }) {
  const t = useTranslations("permissionRoles");
  const id = useId();
  const activeEntries = entries.filter(row => isConsumedPermission(row.resource, row.action));
  const level = resourcePermissionLevel(activeEntries, selected);
  const [expanded, setExpanded] = useState(level === "custom");
  return <fieldset aria-label={t(`resources.${resource}`)} className="min-w-0 rounded-md border border-border p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><label htmlFor={id} className="min-w-0 break-words text-sm font-semibold">{t(`resources.${resource}`)}</label><Select value={level} disabled={disabled || !activeEntries.length} onValueChange={value => { if (value !== "custom") onChange(setResourcePermissionLevel(activeEntries, selected, value as "none" | "read" | "write")); }}><SelectTrigger id={id} aria-label={t("levels.named", { name: t(`resources.${resource}`) })} className="h-12 w-full shrink-0 sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("levels.none")}</SelectItem><SelectItem value="read" disabled={!activeEntries.some(row => row.action === "view")}>{t("levels.read")}</SelectItem><SelectItem value="write" disabled={!activeEntries.some(row => row.action !== "view")}>{t("levels.write")}</SelectItem><SelectItem value="custom" disabled>{t("levels.custom")}</SelectItem></SelectContent></Select></div>{!activeEntries.length ? <p className="mt-2 text-sm text-muted-foreground">{t("levels.pendingResource")}</p> : null}<details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">{t("levels.details")}</summary><div className="mt-2 grid grid-cols-2 gap-3">{entries.map(row => <label key={row.id} className="flex min-h-11 items-start gap-2 text-sm"><Checkbox disabled={disabled || !isConsumedPermission(row.resource, row.action)} checked={selected.has(row.id)} aria-label={`${t(`resources.${resource}`)} — ${t(`actions.${row.action}`)}`} onCheckedChange={() => { const next = new Set(selected); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); onChange(next); }} /><span>{t(`actions.${row.action}`)}{!isConsumedPermission(row.resource, row.action) ? <span className="mt-1 block text-xs text-muted-foreground">{t(selected.has(row.id) ? "levels.legacyPending" : "levels.pending")}</span> : null}</span></label>)}</div></details></fieldset>;
}
export function PermissionGrid({ catalog, selected, onChange, disabled }: { catalog: readonly PermissionCatalogEntryRow[]; selected: ReadonlySet<string>; onChange: (ids: ReadonlySet<string>) => void; disabled: boolean }) {
  const t = useTranslations("permissionRoles");
  const groups = useMemo(() => PERMISSION_RESOURCES.map(resource => ({ resource, entries: catalog.filter(row => row.resource === resource) })).filter(group => group.entries.length), [catalog]);
  return <div className="flex min-w-0 flex-col gap-3"><h4 className="text-sm font-semibold">{t("create.permissionsTitle")}</h4><p className="text-sm text-muted-foreground">{t("levels.consumerNotice")}</p><div className="grid min-w-0 gap-3 sm:grid-cols-2">{groups.map(group => <ResourcePermissionField key={group.resource} {...group} selected={selected} onChange={onChange} disabled={disabled} />)}</div></div>;
}
