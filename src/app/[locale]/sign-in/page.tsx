import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { SignInForm } from "@/features/identity/ui/sign-in-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return { title: t("signIn") };
}

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("signInTitle")}</h1>
        <p className="text-muted-foreground">{t("signInSubtitle")}</p>
      </div>

      {/* `useSearchParams` obriga a uma fronteira de Suspense para a página continuar
          a poder ser pré-renderizada. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
