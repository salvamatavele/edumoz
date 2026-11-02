"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { previewSchoolUserRemovalAction, removeSchoolUserAction } from "../actions/school-user-removal";
import type { SchoolUserRemovalPreview } from "../domain/school-user-removal";
import { useRouter } from "@/i18n/navigation";

export function RemoveSchoolUserDialog({ schoolId, userId, accountName }: { schoolId: string; userId: string; accountName: string }) {
  const t = useTranslations("users");
  const all = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);
  const [preview, setPreview] = useState<SchoolUserRemovalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [pending, startTransition] = useTransition();
  function close() { if (!pending) { setOpen(false); setPreview(null); setError(null); router.refresh(); } }
  function begin() {
    setOpenedSchoolId(schoolId); setOpen(true); setPreview(null); setError(null); setUncertain(false);
    startTransition(async () => {
      try { const result = await previewSchoolUserRemovalAction({ userId, expectedSchoolId: schoolId }); if (result.status === "error") setError(result.message); else setPreview(result.user); }
      catch { setError(t("errors.removalUnavailable")); }
    });
  }
  function confirm() {
    if (!preview || pending || uncertain) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeSchoolUserAction({ userId: preview.userId, revision: preview.revision, expectedSchoolId: openedSchoolId });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setPreview(null); router.refresh();
      } catch { setError(t("remove.uncertain")); setUncertain(true); }
    });
  }
  return <><Button type="button" size="sm" variant="secondary" disabled={pending} aria-label={t("remove.named", { name: accountName })} onClick={begin}>{t("remove.button")}</Button><Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>{t("remove.title")}</DialogTitle><DialogDescription>{t("remove.description")}</DialogDescription></DialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{preview ? <div className="rounded-md border border-border bg-muted p-4"><p className="font-semibold">{preview.name || t("unnamed")}</p>{preview.loginCode ? <p className="mt-1 break-all font-mono text-sm">{preview.loginCode}</p> : null}<p className="mt-3 text-sm text-muted-foreground">{t("remove.preserved")}</p></div> : <p role="status" className="text-sm text-muted-foreground">{pending ? t("edit.loading") : t("edit.noData")}</p>}<DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{all("form.cancel")}</Button><Button type="button" variant="destructive" disabled={!preview || pending || uncertain} onClick={confirm}>{pending ? all("form.saving") : t("remove.confirm")}</Button></DialogFooter></DialogContent></Dialog></>;
}
