"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { changeTeacherLinkAction, loadTeacherLinkAction, previewTeacherLinkAction } from "@/features/identity/actions/school-user-teacher-link";
import type { ProfessionalLink, ProfessionalPreview, ProfessionalKind, ProfessionalPreviewInput, ProfessionalChangeInput } from "@/features/identity/domain/professional-link";
import type { TeacherLinkTarget } from "@/features/identity/domain/school-user-teacher-link";
import { loadStaffLinkAction, previewStaffLinkAction, changeStaffLinkAction } from "@/features/identity/actions/school-user-staff-link";
async function loadLink(kind: ProfessionalKind, input: TeacherLinkTarget) {
  if (kind === "staff") return loadStaffLinkAction(input);
  const result = await loadTeacherLinkAction(input);
  if (result.status === "error") return result;
  const { teacher: profile, ...data } = result.data; return { status: "success" as const, data: { ...data, profile } };
}
async function previewLink(kind: ProfessionalKind, input: ProfessionalPreviewInput) {
  if (kind === "staff") return previewStaffLinkAction(input);
  const result = await previewTeacherLinkAction({ userId: input.userId, expectedSchoolId: input.expectedSchoolId, expectedRevision: input.expectedRevision, expectedTeacherId: input.expectedProfileId, expectedTeacherRevision: input.expectedProfileRevision, teacherCode: input.profileCode });
  if (result.status === "error") return result;
  const { teacher: profile, ...data } = result.data; return { status: "success" as const, data: { ...data, profile } };
}
async function changeLink(kind: ProfessionalKind, input: ProfessionalChangeInput) {
  if (kind === "staff") return changeStaffLinkAction(input);
  return changeTeacherLinkAction({ userId: input.userId, expectedSchoolId: input.expectedSchoolId, expectedRevision: input.expectedRevision, expectedTeacherId: input.expectedProfileId, expectedTeacherRevision: input.expectedProfileRevision, teacherId: input.profileId, teacherRevision: input.profileRevision });
}
import { useRouter } from "@/i18n/navigation";

export function ProfessionalLinkDialog({ schoolId, userId, accountName, kind }: { readonly schoolId: string; readonly userId: string; readonly accountName: string; readonly kind: ProfessionalKind }) {
  const t = useTranslations(kind === "teacher" ? "users.teacherLink" : "users.staffLink");
  const all = useTranslations();
  const router = useRouter();
  const actionId = useId();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(schoolId);
  const [link, setLink] = useState<ProfessionalLink | null>(null);
  const [preview, setPreview] = useState<ProfessionalPreview | null>(null);
  const [operation, setOperation] = useState<"link" | "unlink">("link");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  function close() {
    if (pending) return;
    setOpen(false); setLink(null); setPreview(null); setCode(""); setError(null); router.refresh();
  }
  function begin() {
    setOpen(true); setScope(schoolId); setLink(null); setPreview(null); setError(null); setSaved(false); setUncertain(false);
    startTransition(async () => {
      try {
        const result = await loadLink(kind, { userId, expectedSchoolId: schoolId });
        if (result.status === "error") setError(result.message);
        else { setLink(result.data); setCode(result.data.profile?.code ?? ""); setOperation(result.data.canLink ? "link" : "unlink"); }
      } catch { setError(all("form.genericError")); }
    });
  }
  function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!link || pending || uncertain) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewLink(kind, { userId: link.userId, expectedSchoolId: scope, expectedRevision: link.revision, expectedProfileId: link.profile?.id ?? null, expectedProfileRevision: link.profile?.revision ?? null, profileCode: operation === "unlink" ? "" : code.trim() });
        if (result.status === "error") setError(result.message); else setPreview(result.data);
      } catch { setError(all("form.genericError")); }
    });
  }
  function confirm() {
    if (!preview || pending || uncertain) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await changeLink(kind, { userId: preview.userId, expectedSchoolId: scope, expectedRevision: preview.revision, expectedProfileId: preview.profile?.id ?? null, expectedProfileRevision: preview.profile?.revision ?? null, profileId: preview.candidate?.id ?? null, profileRevision: preview.candidate?.revision ?? null });
        if (result.status === "error") { setError(result.message); return; }
        setOpen(false); setLink(null); setPreview(null); setCode(""); setSaved(true); router.refresh();
      } catch { setError(t("uncertain")); setUncertain(true); }
    });
  }
  const same = !!preview && (preview.candidate?.id ?? null) === (preview.profile?.id ?? null);
  return <>
    <Button type="button" size="sm" variant="secondary" disabled={pending} aria-label={t("named", { name: accountName })} onClick={begin}>{t("button")}</Button>
    {saved ? <span role="status" className="text-xs text-success">{t("saved")}</span> : null}
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description", { name: accountName })}</DialogDescription></DialogHeader>
      {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}
      {!link ? <><p role="status" className="text-sm text-muted-foreground">{pending ? t("loading") : t("unavailable")}</p><DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{all("form.cancel")}</Button></DialogFooter></> : preview ? <div className="space-y-5">
        <dl className="space-y-3 rounded-md border border-border bg-muted p-4 text-sm"><div><dt className="text-muted-foreground">{t("current")}</dt><dd className="break-words font-medium">{preview.profile ? `${preview.profile.name} · ${preview.profile.code}` : t("none")}</dd></div><div><dt className="text-muted-foreground">{t("after")}</dt><dd className="break-words font-medium">{preview.candidate ? `${preview.candidate.name} · ${preview.candidate.code}` : t("none")}</dd></div></dl>
        <p className="text-sm text-muted-foreground">{same ? t("unchanged") : preview.candidate ? t("confirmHint") : t("unlinkHint")}</p>
        <DialogFooter><Button type="button" variant="secondary" disabled={pending || uncertain} onClick={() => { setPreview(null); setError(null); }}>{t("back")}</Button><Button type="button" disabled={pending} variant="secondary" onClick={close}>{all("form.cancel")}</Button>{!same ? <Button type="button" disabled={pending || uncertain} onClick={confirm}>{pending ? all("form.saving") : t(preview.candidate ? "confirmLink" : "confirmUnlink")}</Button> : null}</DialogFooter>
      </div> : <form onSubmit={verify} className="space-y-5">
        <div className="rounded-md border border-border bg-muted p-4 text-sm"><p className="text-muted-foreground">{t("current")}</p><p className="break-words font-medium">{link.profile ? `${link.profile.name} · ${link.profile.code}` : t("none")}</p></div>
        {!link.canLink ? <p className="text-sm text-warning">{t("roleRequired")}</p> : null}
        <label htmlFor={actionId} className="flex flex-col gap-1.5 text-sm font-medium">{t("operation")}<select id={actionId} className="h-12 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-foreground" value={operation} disabled={pending} onChange={event => setOperation(event.target.value as "link" | "unlink")}><option value="link" disabled={!link.canLink}>{t("link")}</option><option value="unlink" disabled={!link.profile}>{t("unlink")}</option></select></label>
        {operation === "link" ? <Input label={t("code")} value={code} onChange={event => setCode(event.target.value)} required maxLength={64} disabled={pending || !link.canLink} autoComplete="off" /> : <p className="text-sm text-muted-foreground">{t("unlinkHint")}</p>}
        <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={close}>{all("form.cancel")}</Button><Button type="submit" disabled={pending || (!link.canLink && !link.profile)}>{pending ? t("loading") : t("verify")}</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
  </>;
}

export function SchoolUserTeacherLinkDialog(props: { readonly schoolId: string; readonly userId: string; readonly accountName: string }) { return <ProfessionalLinkDialog {...props} kind="teacher" />; }
