"use client";

import { useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSchoolUserAction, reissueInitialCredentialAction } from "@/features/identity/actions/create-school-user";
import { createSchoolUserSchema, SCHOOL_ACCOUNT_ROLES, type CreatedSchoolCredential } from "@/features/identity/domain/create-school-user";
import { useRouter } from "@/i18n/navigation";

export function CreateSchoolUserDialog({ schoolId, canManageManagers, reissueUserId, accountName }: { readonly schoolId: string; readonly canManageManagers: boolean; readonly reissueUserId?: string; readonly accountName?: string }) {
  const t = useTranslations("users.create");
  const all = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [openedSchoolId, setOpenedSchoolId] = useState("");
  const [credential, setCredential] = useState<CreatedSchoolCredential | null>(null);
  const [alreadyCreated, setAlreadyCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeOpen(value: boolean) {
    if (pending) return;
    setOpen(value);
    setCredential(null);
    setAlreadyCreated(false);
    setError(null);
    setRequestId(value ? crypto.randomUUID() : "");
    setOpenedSchoolId(value ? schoolId : "");
    if (!value) router.refresh();
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const parsed = createSchoolUserSchema.safeParse({ ...Object.fromEntries(fields), requestId, roles: fields.getAll("roles") });
    setError(null);
    if (!reissueUserId && !parsed.success) { setError(t("invalid")); return; }
    startTransition(async () => {
      try {
        const result = reissueUserId ? await reissueInitialCredentialAction({ userId: reissueUserId, requestId, expectedSchoolId: openedSchoolId }) : await createSchoolUserAction({ ...parsed.data!, expectedSchoolId: openedSchoolId });
        if (result.status === "error") { setError(result.message); return; }
        form.current?.reset();
        if (result.status === "created") setCredential(result.credential);
        else setAlreadyCreated(true);
      } catch { setError(t("transport")); }
    });
  }

  return <>
    <Button type="button" size={reissueUserId ? "sm" : "md"} variant={reissueUserId ? "secondary" : "default"} onClick={() => changeOpen(true)}><UserPlus aria-hidden="true" className="size-4" />{t(reissueUserId ? "reissueTrigger" : "trigger")}</Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl" showCloseButton={!pending}>
        <DialogHeader><DialogTitle>{credential ? t("deliveryTitle") : t(reissueUserId ? "reissueTitle" : "title")}</DialogTitle><DialogDescription>{credential ? t("deliveryDescription") : reissueUserId ? t("reissueDescription", { name: accountName ?? "" }) : t("description")}</DialogDescription></DialogHeader>
        {credential ? <div className="flex flex-col gap-5" role="status">
          <div className="rounded-md border border-border bg-surface p-4"><p className="font-semibold">{credential.name}</p><p className="text-sm text-muted-foreground">{credential.schoolName}</p></div>
          <div><p className="mb-1 text-sm font-medium">{t("loginCode")}</p><code className="block break-all rounded-md bg-muted p-3 text-base select-all">{credential.loginCode}</code></div>
          <Input label={t("temporaryPassword")} type="password" value={credential.password} readOnly autoComplete="off" />
          <p className="text-sm text-muted-foreground">{t("expires", { date: format.dateTime(new Date(credential.expiresAt), { dateStyle: "short", timeStyle: "short" }) })}</p>
          <p className="rounded-md border border-border bg-muted p-3 text-sm">{t("deliveryWarning")}</p>
          <Button type="button" disabled={pending} onClick={() => changeOpen(false)}>{t("done")}</Button>
        </div> : alreadyCreated ? <div className="flex flex-col gap-5"><p role="status" className="text-sm">{t("alreadyCreated")}</p><Button type="button" disabled={pending} onClick={() => changeOpen(false)}>{t("backToList")}</Button></div> : <form ref={form} onSubmit={submit} className="flex flex-col gap-4">
          {!reissueUserId ? <>
          <Input label={t("name")} name="name" minLength={3} maxLength={191} autoComplete="name" required disabled={pending} />
          <div className="grid gap-4 sm:grid-cols-2"><Input label={t("email")} name="email" type="email" maxLength={254} autoComplete="email" helperText={t("contactHint")} disabled={pending} /><Input label={t("phone")} name="phone" type="tel" maxLength={13} autoComplete="tel" helperText={t("phoneHint")} disabled={pending} /></div>
          <fieldset disabled={pending} className="flex flex-col gap-2"><legend className="mb-2 text-sm font-medium">{t("roles")}</legend><div className="grid gap-2 sm:grid-cols-2">{SCHOOL_ACCOUNT_ROLES.filter(role => role !== "SCHOOL_MANAGER" || canManageManagers).map(role => <label key={role} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"><input className="size-5 accent-primary" name="roles" value={role} type="checkbox" />{all(`roles.${role}`)}</label>)}</div></fieldset>
          <Input label={t("teacherCode")} name="teacherCode" maxLength={64} helperText={t("teacherHint")} disabled={pending} />
          </> : null}
          <p className="text-sm text-muted-foreground">{t(reissueUserId ? "reissueHint" : "initialHint")}</p>
          {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>{all("form.cancel")}</Button><Button type="submit" disabled={pending}>{pending ? all("form.saving") : t(reissueUserId ? "reissueSubmit" : "submit")}</Button></DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
