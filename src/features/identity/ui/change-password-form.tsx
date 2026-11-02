"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeOwnPasswordAction } from "@/features/identity/actions/change-own-password";
import { changePasswordSchema } from "@/features/identity/domain/change-password";
import { Link } from "@/i18n/navigation";

export function ChangePasswordForm() {
  const t = useTranslations("passwordChange");
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(data));
    setError(null);
    if (!parsed.success) { setError(t("errors.invalid")); return; }
    startTransition(async () => {
      try {
        const result = await changeOwnPasswordAction(parsed.data);
        // Clear secrets on every server response; keep no draft in storage or URLs.
        form.current?.reset();
        if (result.status === "error") { setError(result.message); return; }
        setSuccess(true);
      } catch {
        form.current?.reset();
        setError(t("errors.transport"));
      }
    });
  }

  if (success) return <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6" role="status"><ShieldCheck aria-hidden="true" className="size-8 text-primary" /><p className="font-medium">{t("success")}</p><p className="text-sm text-muted-foreground">{t("signInAgain")}</p><Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">{t("signIn")}</Link></div>;

  return <form ref={form} onSubmit={submit} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 sm:p-6">
    <p id="password-change-effect" className="text-sm leading-relaxed text-muted-foreground">{t("effect")}</p>
    <Input name="currentPassword" type="password" label={t("current")} autoComplete="current-password" maxLength={1024} required disabled={pending} />
    <Input name="newPassword" type="password" label={t("new")} helperText={t("policy")} autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} />
    <Input name="confirmPassword" type="password" label={t("confirm")} autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} />
    {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">{error}</p> : null}
    <Button type="submit" size="lg" disabled={pending} aria-describedby="password-change-effect">{pending ? t("submitting") : t("submit")}</Button>
  </form>;
}
