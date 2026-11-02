"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { editSchoolUserAction, loadSchoolUserEditAction } from "@/features/identity/actions/edit-school-user";
import { editSchoolUserSchema, type EditableSchoolUser } from "@/features/identity/domain/edit-school-user";
import { useRouter } from "@/i18n/navigation";

export function EditSchoolUserDialog({ schoolId, userId, accountName }: { readonly schoolId: string; readonly userId: string; readonly accountName: string }) {
  const t = useTranslations("users");
  const all = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedSchoolId, setOpenedSchoolId] = useState(schoolId);
  const [user, setUser] = useState<EditableSchoolUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [pending, startTransition] = useTransition();
  function close() {
    if (pending) return;
    setOpen(false); setUser(null); setError(null); router.refresh();
  }
  function begin() {
    setOpenedSchoolId(schoolId); setOpen(true); setUser(null); setError(null); setSaved(false); setUncertain(false);
    startTransition(async () => {
      try {
        const result = await loadSchoolUserEditAction({ userId, expectedSchoolId: schoolId });
        if (result.status === "error") setError(result.message);
        else setUser(result.user);
      } catch { setError(all("form.genericError")); }
    });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || pending || uncertain) return;
    const parsed = editSchoolUserSchema.safeParse(user);
    if (!parsed.success) { setError(t("errors.invalid")); return; }
    setError(null);
    startTransition(async () => {
      try {
        const result = await editSchoolUserAction({ ...parsed.data, expectedSchoolId: openedSchoolId });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setUser(null); setSaved(true); router.refresh();
      } catch { setError(t("edit.uncertain")); setUncertain(true); }
    });
  }
  return <>
    <Button type="button" size="sm" variant="secondary" disabled={pending} aria-label={t("edit.named", { name: accountName })} onClick={begin}>{t("edit.button")}</Button>
    {saved ? <span role="status" className="text-xs text-success">{t("edit.saved")}</span> : null}
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("edit.title")}</DialogTitle><DialogDescription>{t("edit.description")}</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}
        {!user ? <><p role="status" className="text-sm text-muted-foreground">{pending ? t("edit.loading") : t("edit.noData")}</p><DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{all("form.cancel")}</Button></DialogFooter></> :
          <form onSubmit={submit} className="space-y-5">
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{t("edit.loginPreserved")}</p>
            <Input label={t("create.name")} value={user.name} onChange={event => setUser({ ...user, name: event.target.value })} required minLength={3} maxLength={191} disabled={pending || uncertain} autoComplete="off" />
            <Input label={t("create.email")} type="email" value={user.email} onChange={event => setUser({ ...user, email: event.target.value })} maxLength={254} disabled={pending || uncertain} autoComplete="off" />
            <Input label={t("create.phone")} type="tel" value={user.phone} onChange={event => setUser({ ...user, phone: event.target.value })} maxLength={16} disabled={pending || uncertain} autoComplete="off" />
            <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{all("form.cancel")}</Button><Button type="submit" disabled={pending || uncertain}>{pending ? all("form.saving") : t("edit.save")}</Button></DialogFooter>
          </form>}
      </DialogContent>
    </Dialog>
  </>;
}
