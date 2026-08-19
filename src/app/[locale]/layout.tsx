import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SessionProvider } from "next-auth/react";

import { ThemeScript } from "@/components/theme/theme-script";
import { LOCALE_TAGS, routing } from "@/i18n/routing";

import "../globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Pré-renderiza as duas línguas em build; sem isto o `/en` seria sempre dinâmico. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });

  return {
    title: {
      default: t("title"),
      template: t("titleTemplate", { page: "%s" }),
    },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1f1d" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Sem isto, qualquer uso de traduções marca a rota como dinâmica e perde-se a
  // pré-renderização estática configurada em generateStaticParams.
  setRequestLocale(locale);

  const t = await getTranslations("common");

  return (
    <html
      // pt-MZ e en-GB, não pt e en: é o tag completo que decide como o leitor de ecrã
      // pronuncia o texto e como o browser formata datas e números.
      lang={LOCALE_TAGS[locale]}
      className={`${lexend.variable} ${sourceSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {/* Sem prop `session`: chamar `auth()` aqui tornaria TODO o layout dinâmico, e
              perder-se-ia a pré-renderização estática de `generateStaticParams`. As rotas
              de marketing (`(marketing)/layout.tsx`) ficam estáticas por isso; as do
              painel (`(dashboard)/layout.tsx`) já chamam `auth()` por si — nada a perder
              aí. `id="conteudo-principal"`, o alvo deste link, existe nos dois grupos. */}
          <SessionProvider>
            <a
              href="#conteudo-principal"
              className="absolute left-4 top-4 z-50 inline-flex h-11 -translate-y-20 items-center rounded-md bg-primary px-4 text-on-primary shadow-lg transition-transform duration-200 ease-(--ease-enter) focus:translate-y-0"
            >
              {t("skipToContent")}
            </a>
            {children}
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
