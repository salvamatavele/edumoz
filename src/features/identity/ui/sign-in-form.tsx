"use client";

import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInDestination } from "@/features/identity/domain/sign-in-destination";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Formulário de início de sessão.
 *
 * Dois caminhos, deliberadamente: Google para a direcção e os professores, credenciais
 * para alunos e encarregados de educação — que em Moçambique muitas vezes não têm conta
 * Google e se identificam por número de telemóvel.
 *
 * A mensagem de erro é sempre a mesma, independentemente de a conta não existir, a
 * palavra-passe estar errada ou o acesso ter sido recusado pela política. Distinguir os
 * casos diria a um estranho quais os e-mails que existem nesta escola.
 */
export function SignInForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? t("failed") : null,
  );

  // Sem `?continuar=`, aterra em `/alunos` (ou `/portal`, se `/alunos` reencaminhar um
  // papel de família — ver docs/specs/role-shell.md) em vez da página pública. Quem chega
  // aqui já quer entrar na aplicação, não voltar à montra.
  const callbackUrl = signInDestination(
    searchParams.get("continuar"),
    getPathname({ locale, href: "/students" }),
  );

  function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          identifier: String(data.get("identifier") ?? ""),
          password: String(data.get("password") ?? ""),
          redirect: false,
        });
        if (!result || result.error || !result.ok) {
          setError(t("failed"));
          return;
        }
        window.location.href = callbackUrl;
      } catch { setError(t("failed")); }
    });
  }

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      try { await signIn("google", { callbackUrl }); }
      catch { setError(t("failed")); }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={isPending}
        onClick={handleGoogle}
      >
        {t("withGoogle")}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase text-muted-foreground">{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleCredentials} className="flex flex-col gap-4">
        <Input
          name="identifier"
          label={t("identifier")}
          helperText={t("identifierHint")}
          autoComplete="username"
          required
          disabled={isPending}
        />
        <Input
          name="password"
          type="password"
          label={t("password")}
          autoComplete="current-password"
          required
          disabled={isPending}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
