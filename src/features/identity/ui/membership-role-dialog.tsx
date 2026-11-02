"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadMembershipRolesAction, searchMembershipRoleOptionsAction, saveMembershipRolesAction } from "../actions/membership-permission-roles";
import { MAX_MEMBERSHIP_PERMISSION_ROLES, type MembershipRoleOption, type MembershipRolePreview } from "../domain/membership-role-schema";
import { useRouter } from "@/i18n/navigation";

export function MembershipRoleDialog({ schoolId, membershipId, accountName, disabled = false }: { schoolId: string; membershipId: string; accountName: string; disabled?: boolean }) {
  const t = useTranslations("permissionRoles.assignment");
  const form = useTranslations("form");
  const roles = useTranslations("roles");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);
  const [preview, setPreview] = useState<MembershipRolePreview | null>(null);
  const [selected, setSelected] = useState<ReadonlyMap<string, MembershipRoleOption>>(new Map());
  const [mode, setMode] = useState<"configured" | "legacy">("configured");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [operation, setOperation] = useState<"load" | "search" | "save">("load");
  const [pending, startTransition] = useTransition();
  function close() {
    if (pending) return;
    setOpen(false); setPreview(null); setError(null);
    if (uncertain) router.refresh();
  }
  function begin() {
    setOpenedSchoolId(schoolId); setOpen(true); setPreview(null); setSelected(new Map()); setError(null); setUncertain(false); setQuery(""); setAppliedQuery(""); setOperation("load");
    startTransition(async () => {
      try {
        const result = await loadMembershipRolesAction({ expectedSchoolId: schoolId, membershipId });
        if (result.status === "error") { setError(result.message); return; }
        setPreview(result.preview); setMode(result.preview.mode);
        setSelected(new Map(result.preview.selectedRoles.map(role => [role.id, role])));
      } catch { setError(t("loadFailed")); }
    });
  }
  function search(value: string, page: number) {
    if (pending || uncertain || !preview) return;
    setError(null); setOperation("search");
    startTransition(async () => {
      try {
        const result = await searchMembershipRoleOptionsAction({ expectedSchoolId: openedSchoolId, query: value.trim(), page });
        if (result.status === "error") { setError(result.message); return; }
        setPreview(current => current ? { ...current, options: result.options } : current);
        setAppliedQuery(value.trim());
      } catch { setError(t("searchFailed")); }
    });
  }
  function toggle(role: MembershipRoleOption) {
    if (pending || uncertain || mode !== "configured") return;
    const next = new Map(selected);
    if (next.has(role.id)) next.delete(role.id);
    else if (next.size < MAX_MEMBERSHIP_PERMISSION_ROLES) next.set(role.id, role);
    setSelected(next);
  }
  function save() {
    if (!preview || pending || uncertain) return;
    setError(null); setOperation("save");
    startTransition(async () => {
      try {
        const result = await saveMembershipRolesAction({ expectedSchoolId: openedSchoolId, membershipId: preview.membershipId, revision: preview.revision, mode, roles: mode === "configured" ? [...selected.values()].map(role => ({ id: role.id, revision: role.revision })) : [] });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setPreview(null); router.refresh();
      } catch { setError(t("uncertain")); setUncertain(true); }
    });
  }
  return <><Button size="sm" variant="secondary" disabled={disabled} onClick={begin} aria-label={t("named", { name: accountName })}>{t("trigger")}</Button><Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>{error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}{preview ? <div className="flex min-w-0 flex-col gap-5">
    <div className="rounded-md border border-border bg-muted p-3"><p className="break-words font-semibold">{preview.name || t("unnamed", { code: preview.membershipId.slice(-8) })}</p><p className="mt-1 text-sm text-muted-foreground">{roles(preview.baseRole)}</p></div>
    {preview.status === "SUSPENDED" ? <p className="rounded-md border border-warning bg-warning-surface p-3 text-sm">{t("suspended")}</p> : null}
    {preview.accountState !== "active" ? <p className="rounded-md border border-border bg-muted p-3 text-sm">{t(preview.accountState === "disabled" ? "disabledAccount" : "initialAccount")}</p> : null}
    {preview.baseRole === "SCHOOL_MANAGER" ? <div className="flex flex-col gap-2"><label id={`access-mode-${membershipId}`} className="text-sm font-semibold">{t("mode")}</label><Select value={mode} disabled={pending || uncertain} onValueChange={value => setMode(value as "configured" | "legacy")}><SelectTrigger aria-labelledby={`access-mode-${membershipId}`} className="min-h-12 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="configured">{t("configured")}</SelectItem><SelectItem value="legacy">{t("legacy")}</SelectItem></SelectContent></Select></div> : null}
    {mode === "legacy" ? <p className="rounded-md border border-warning bg-warning-surface p-3 text-sm">{t(preview.hasOverrides ? "legacyOverridesWarning" : "legacyWarning")}</p> : <>
      <p className="text-sm text-muted-foreground">{t("ownership")}</p>
      <div className="flex min-w-0 flex-col gap-2"><p className="text-sm font-semibold">{t("selectedCount", { count: selected.size, maximum: MAX_MEMBERSHIP_PERMISSION_ROLES })}</p>{selected.size ? <ul aria-label={t("selected")} className="flex flex-col gap-2">{[...selected.values()].map(role => <li key={role.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border p-2"><span className="min-w-0 break-words text-sm">{role.name}</span><Button size="icon" variant="ghost" disabled={pending || uncertain} aria-label={t("remove", { name: role.name })} onClick={() => toggle(role)}><X aria-hidden="true" /></Button></li>)}</ul> : <p className="rounded-md border border-border bg-muted p-3 text-sm">{t("empty")}</p>}</div>
      <form onSubmit={event => { event.preventDefault(); search(query, 1); }} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"><Input label={t("search")} value={query} maxLength={120} disabled={pending || uncertain} onChange={event => setQuery(event.target.value)} /><Button type="submit" variant="secondary" disabled={pending || uncertain}>{pending && operation === "search" ? t("searching") : t("searchButton")}</Button></form>
      <div className="flex min-w-0 flex-col gap-2" aria-label={t("available")}>{preview.options.rows.length ? preview.options.rows.map(role => <label key={role.id} className="flex min-h-12 min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border p-3"><Checkbox aria-label={t("select", { name: role.name })} checked={selected.has(role.id)} disabled={pending || uncertain || (!selected.has(role.id) && selected.size >= MAX_MEMBERSHIP_PERMISSION_ROLES)} onCheckedChange={() => toggle(role)} /><span className="min-w-0 break-words"><span className="block text-sm font-semibold">{role.name}</span><span className="text-sm text-muted-foreground">{t("grantCount", { count: role.permissionCount })}</span></span></label>) : <p className="text-sm text-muted-foreground">{t("noMatches")}</p>}</div>
      <nav aria-label={t("pagination")} className="flex flex-wrap items-center justify-between gap-2"><Button variant="secondary" size="sm" disabled={pending || uncertain || preview.options.page === 1} onClick={() => search(appliedQuery, preview.options.page - 1)}>{t("previous")}</Button><p className="text-sm text-muted-foreground">{t("page", { page: preview.options.page, total: preview.options.pageCount })}</p><Button variant="secondary" size="sm" disabled={pending || uncertain || preview.options.page >= preview.options.pageCount} onClick={() => search(appliedQuery, preview.options.page + 1)}>{t("next")}</Button></nav>
    </>}
  </div> : <p role="status" className="text-sm text-muted-foreground">{pending ? t("loading") : t("unavailable")}</p>}<DialogFooter><Button variant="secondary" disabled={pending} onClick={close}>{form("cancel")}</Button>{preview ? <Button disabled={pending || uncertain} onClick={save}>{pending && operation === "save" ? form("saving") : mode === "legacy" ? t(preview.hasOverrides ? "restoreLegacyInheritance" : "restoreLegacy") : t("save")}</Button> : null}</DialogFooter></DialogContent></Dialog></>;
}
