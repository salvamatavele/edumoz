"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { loadMembershipPermissionOverridesAction, saveMembershipPermissionOverridesAction } from "../actions/membership-permission-overrides";
import type { MembershipPermissionOverridesPreview, MembershipPermissionOverrideRow } from "../domain/membership-permission-override-schema";
import type { PermissionResource } from "../domain/permission-catalog";

type Choice = "inherit" | "allow" | "deny";
type Level = "inherit" | "none" | "read" | "write" | "custom";
const fieldClass = "min-h-12 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60";
function levelOf(rows: readonly MembershipPermissionOverrideRow[]): Level {
  if (rows.every(row => row.override === null)) return "inherit";
  if (rows.every(row => row.override === false)) return "none";
  if (rows.every(row => row.override === (row.action === "view"))) return "read";
  if (rows.every(row => row.override === true)) return "write";
  return "custom";
}
export function MembershipPermissionOverridesDialog({ schoolId, membershipId, accountName, disabled = false }: { schoolId: string; membershipId: string; accountName: string; disabled?: boolean }) {
  const t = useTranslations("permissionRoles.overrides");
  const policy = useTranslations("permissionRoles");
  const form = useTranslations("form");
  const roles = useTranslations("roles");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openingSchool, setOpeningSchool] = useState(schoolId);
  const [preview, setPreview] = useState<MembershipPermissionOverridesPreview | null>(null);
  const [rows, setRows] = useState<readonly MembershipPermissionOverrideRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [operation, setOperation] = useState<"load" | "save">("load");
  const [pending, startTransition] = useTransition();
  function begin() {
    setOpen(true); setOpeningSchool(schoolId); setPreview(null); setRows([]); setQuery(""); setError(null); setUncertain(false); setOperation("load");
    startTransition(async () => {
      try {
        const result = await loadMembershipPermissionOverridesAction({ expectedSchoolId: schoolId, membershipId });
        if (result.status === "error") { setError(result.message); return; }
        setPreview(result.preview); setRows(result.preview.rows);
      } catch { setError(t("loadFailed")); }
    });
  }
  function close() {
    if (pending) return;
    setOpen(false); setPreview(null); setError(null);
    if (uncertain) router.refresh();
  }
  function choose(permissionId: string, value: Choice) {
    if (pending || uncertain) return;
    setRows(current => current.map(row => row.permissionId === permissionId ? { ...row, override: value === "inherit" ? null : value === "allow", reason: value === "inherit" ? "" : row.reason } : row));
  }
  function setLevel(resource: PermissionResource, level: Exclude<Level, "custom">) {
    if (pending || uncertain) return;
    setRows(current => current.map(row => row.resource === resource ? { ...row, override: level === "inherit" ? null : level === "write" || (level === "read" && row.action === "view"), reason: level === "inherit" ? "" : row.reason } : row));
  }
  function save() {
    if (!preview || pending || uncertain) return;
    setError(null); setOperation("save");
    startTransition(async () => {
      try {
        const overrides = rows.flatMap(row => row.override === null ? [] : [{ permissionId: row.permissionId, allowed: row.override, reason: row.reason }]);
        const result = await saveMembershipPermissionOverridesAction({ expectedSchoolId: openingSchool, membershipId: preview.membershipId, revision: preview.revision, overrides });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setPreview(null); router.refresh();
      } catch { setError(t("uncertain")); setUncertain(true); }
    });
  }
  const resources = [...new Set(rows.map(row => row.resource))].filter(resource => policy(`resources.${resource}`).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <><Button size="sm" variant="secondary" disabled={disabled} onClick={begin} aria-label={t("named", { name: accountName })}>{t("trigger")}</Button><Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>{error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}{preview ? <div className="flex min-w-0 flex-col gap-4">
    <div className="rounded-md border border-border bg-muted p-3"><p className="break-words font-semibold">{preview.name || t("unnamed", { code: preview.membershipId.slice(-8) })}</p><p className="text-sm text-muted-foreground">{roles(preview.baseRole)}</p></div>
    {preview.status === "SUSPENDED" ? <p className="rounded-md border border-warning bg-warning-surface p-3 text-sm">{t("suspended")}</p> : null}
    {preview.accountState !== "active" ? <p className="rounded-md border border-border bg-muted p-3 text-sm">{t(preview.accountState === "initial" ? "initialAccount" : "disabledAccount")}</p> : null}
    <p className="text-sm text-muted-foreground">{t("ownership")}</p>
    {preview.legacyProfile ? <p className="rounded-md border border-warning bg-warning-surface p-3 text-sm">{t("legacyWarning")}</p> : null}
    <Input label={t("search")} value={query} maxLength={120} disabled={pending || uncertain} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
    <p className="text-sm font-semibold">{t("count", { count: rows.filter(row => row.override !== null).length })}</p>
    {resources.length ? resources.map(resource => {
      const group = rows.filter(row => row.resource === resource);
      const label = policy(`resources.${resource}`);
      return <section key={resource} className="min-w-0 rounded-md border border-border p-3"><h3 className="break-words text-base font-semibold">{label}</h3><label className="mt-3 flex flex-col gap-2 text-sm font-medium"><span>{t("level", { resource: label })}</span><select className={fieldClass} value={levelOf(group)} disabled={pending || uncertain} onChange={event => setLevel(resource, event.target.value as Exclude<Level, "custom">)}><option value="inherit">{t("inherit")}</option><option value="none">{policy("levels.none")}</option><option value="read" disabled={!group.some(row => row.action === "view")}>{policy("levels.read")}</option><option value="write" disabled={!group.some(row => row.action !== "view")}>{policy("levels.write")}</option>{levelOf(group) === "custom" ? <option value="custom" disabled>{policy("levels.custom")}</option> : null}</select></label><details className="mt-3"><summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand">{t("details")}</summary><div className="flex flex-col gap-4">{group.map(row => {
        const action = policy(`actions.${row.action}`);
        const effective = row.otherDenial ? false : row.override ?? row.inherited;
        return <div key={row.permissionId} className="min-w-0 rounded-md border border-border bg-muted p-3"><p className="font-semibold">{action}</p><p className="mt-1 text-sm text-muted-foreground">{t("inherited", { value: t(row.inherited ? "permitted" : "denied") })}</p><label className="mt-2 flex flex-col gap-2 text-sm"><span>{t("choice", { resource: label, action })}</span><select className={fieldClass} value={row.override === null ? "inherit" : row.override ? "allow" : "deny"} disabled={pending || uncertain} onChange={event => choose(row.permissionId, event.target.value as Choice)}><option value="inherit">{t("inherit")}</option><option value="deny">{t("deny")}</option><option value="allow">{t("allow")}</option></select></label><p className="mt-2 text-sm font-medium">{t("effective", { value: t(effective ? "permitted" : "denied") })}</p>{row.otherDenial ? <p className="mt-1 text-sm text-warning">{t("otherDenial")}</p> : null}{row.override !== null ? <div className="mt-3"><Input label={t("reason", { resource: label, action })} maxLength={300} value={row.reason} disabled={pending || uncertain} onChange={event => setRows(current => current.map(item => item.permissionId === row.permissionId ? { ...item, reason: event.target.value } : item))} /></div> : null}</div>;
      })}</div></details></section>;
    }) : <p className="text-sm text-muted-foreground">{t("noMatches")}</p>}
  </div> : <p role="status" className="text-sm text-muted-foreground">{pending ? t("loading") : t("unavailable")}</p>}<DialogFooter><Button variant="secondary" disabled={pending} onClick={close}>{form("cancel")}</Button>{preview ? <Button disabled={pending || uncertain} onClick={save}>{pending && operation === "save" ? form("saving") : t("save")}</Button> : null}</DialogFooter></DialogContent></Dialog></>;
}
