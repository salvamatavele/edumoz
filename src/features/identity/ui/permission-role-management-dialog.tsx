"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadPermissionRoleAction, savePermissionRoleAction, deletePermissionRoleAction } from "../actions/permission-role-management";
import { editPermissionRoleSchema, type EditablePermissionRole } from "../domain/permission-role-schema";
import type { PermissionCatalogEntryRow } from "../data/permission-roles";
import { PermissionGrid } from "./permission-grid";
import { useRouter } from "@/i18n/navigation";

export function PermissionRoleManagementDialog({ mode, schoolId, roleId, roleName, catalog }: { mode: "edit" | "delete"; schoolId: string; roleId: string; roleName: string; catalog: readonly PermissionCatalogEntryRow[] }) {
  const t = useTranslations("permissionRoles");
  const form = useTranslations("form");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);
  const [role, setRole] = useState<EditablePermissionRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => new Set(role?.permissionIds ?? []), [role?.permissionIds]);
  const protectedDeletion = mode === "delete" && !!role && (role.isSystem || role.memberCount > 0);
  function close() { if (!pending) { setOpen(false); setRole(null); setError(null); if (uncertain) router.refresh(); } }
  function begin() {
    setOpenedSchoolId(schoolId); setOpen(true); setRole(null); setError(null); setUncertain(false);
    startTransition(async () => {
      try { const result = await loadPermissionRoleAction({ id: roleId, expectedSchoolId: schoolId }); if (result.status === "error") setError(result.message); else setRole(result.role); }
      catch { setError(t("errors.operationFailed")); }
    });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role || pending || uncertain || protectedDeletion) return;
    const input = { id: role.id, name: role.name, description: role.description, permissionIds: role.permissionIds, revision: role.revision, expectedSchoolId: openedSchoolId };
    const parsed = editPermissionRoleSchema.safeParse(input);
    if (mode === "edit" && !parsed.success) { setError(t(parsed.error.issues.some(issue => issue.path[0] === "name") ? "errors.name" : "errors.invalid")); return; }
    setError(null);
    startTransition(async () => {
      try {
        const result = mode === "edit" ? await savePermissionRoleAction(input) : await deletePermissionRoleAction({ id: role.id, revision: role.revision, expectedSchoolId: openedSchoolId });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setRole(null); router.refresh();
      } catch { setError(t("manage.uncertain")); setUncertain(true); }
    });
  }
  return <><Button size="sm" variant="secondary" disabled={pending} onClick={begin} aria-label={t(`manage.${mode}.named`, { name: roleName })}>{t(`manage.${mode}.button`)}</Button><Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className={`min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto ${mode === "edit" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}><DialogHeader><DialogTitle>{t(`manage.${mode}.title`)}</DialogTitle><DialogDescription>{t(`manage.${mode}.description`)}</DialogDescription></DialogHeader>{error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}{role ? <form noValidate onSubmit={submit} className="flex min-w-0 flex-col gap-5">
    {mode === "edit" ? <>
      {role.isSystem ? <p className="text-sm text-muted-foreground">{t("manage.systemNote")}</p> : null}
      <p className="text-sm text-muted-foreground">{t("manage.impact", { count: role.memberCount })}</p>
      <Input label={t("create.fields.name")} value={role.name} minLength={3} maxLength={120} required disabled={pending || uncertain} onChange={event => setRole({ ...role, name: event.target.value })} />
      <Input label={t("create.fields.description")} value={role.description} maxLength={500} disabled={pending || uncertain} onChange={event => setRole({ ...role, description: event.target.value })} />
      <PermissionGrid catalog={catalog} selected={selected} disabled={pending || uncertain} onChange={ids => setRole({ ...role, permissionIds: [...ids] })} />
    </> : <div className="rounded-md border border-border bg-muted p-4"><p className="break-words font-semibold">{role.name}</p><p className="mt-2 text-sm text-muted-foreground">{role.isSystem ? t("errors.protectedRole") : role.memberCount ? t("errors.roleInUse") : t("manage.delete.effect")}</p></div>}
    <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{form("cancel")}</Button><Button type="submit" variant={mode === "delete" ? "destructive" : "default"} disabled={pending || uncertain || protectedDeletion}>{pending ? form("saving") : t(`manage.${mode}.confirm`)}</Button></DialogFooter>
  </form> : <><p role="status" className="text-sm text-muted-foreground">{pending ? t("manage.loading") : t("manage.noData")}</p><DialogFooter><Button variant="secondary" disabled={pending} onClick={close}>{form("cancel")}</Button></DialogFooter></>}</DialogContent></Dialog></>;
}
