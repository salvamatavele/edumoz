"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { installSystemRolesAction } from "../actions/install-system-roles";
import { SYSTEM_ROLE_DEFINITIONS } from "../domain/system-role-catalog";
import { useRouter } from "@/i18n/navigation";

export function InstallSystemRolesDialog({ schoolId }: { schoolId: string }) {
  const t = useTranslations("permissionRoles.systemRoles");
  const form = useTranslations("form");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await installSystemRolesAction({ expectedSchoolId: openedSchoolId });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); router.refresh();
      } catch { setError(t("failed")); }
    });
  }
  return <><Button variant="secondary" size="sm" onClick={() => { setOpenedSchoolId(schoolId); setError(null); setOpen(true); }}>{t("trigger")}</Button><Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}><DialogContent className="min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader><p className="rounded-md border border-border bg-muted p-3 text-sm">{t("coverage")}</p><ul className="grid min-w-0 gap-3 sm:grid-cols-2">{SYSTEM_ROLE_DEFINITIONS.map(role => <li key={role.key} className="min-w-0 rounded-md border border-border p-3"><h3 className="break-words text-sm font-semibold">{t(`profiles.${role.key}.name`)}</h3><p className="mt-1 text-sm text-muted-foreground">{t(`profiles.${role.key}.description`)}</p></li>)}</ul>{error ? <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p> : null}<DialogFooter><Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>{form("cancel")}</Button><Button disabled={pending} onClick={submit}>{pending ? form("saving") : t("confirm")}</Button></DialogFooter></DialogContent></Dialog></>;
}
