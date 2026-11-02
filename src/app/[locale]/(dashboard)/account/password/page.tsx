import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChangePasswordForm } from "@/features/identity/ui/change-password-form";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "passwordChange" });
  return { title: t("title") };
}

export default async function PasswordPage({ params }: PageProps<"/[locale]/account/password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) { redirect({ href: "/sign-in", locale }); return; }
  const t = await getTranslations("passwordChange");
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:px-6"><div className="flex flex-col gap-2"><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="text-muted-foreground">{t("subtitle")}</p></div><ChangePasswordForm /><p className="text-sm leading-relaxed text-muted-foreground">{t("google")}</p></div>;
}
