import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnSessionsPanel } from "@/features/identity/ui/own-sessions-panel";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";
import { listOwnSessions } from "@/lib/auth/own-sessions";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/sessions">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return { title: t("title") };
}
export default async function SessionsPage({ params }: PageProps<"/[locale]/account/sessions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id || !session.user.authSessionId) { redirect({ href: "/sign-in", locale }); return; }
  if (session.passwordChangeRequired) { redirect({ href: "/account/password", locale }); return; }
  const t = await getTranslations("sessions");
  const sessions = await listOwnSessions({ userId: session.user.id, authVersion: session.user.authVersion ?? 0, authSessionId: session.user.authSessionId });
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"><div><h1 className="text-3xl font-semibold">{t("title")}</h1><p className="mt-2 text-muted-foreground">{t("subtitle")}</p></div><OwnSessionsPanel sessions={sessions} /></div>;
}
