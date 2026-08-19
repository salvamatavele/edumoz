import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Casca das páginas públicas — montra, sistema de design, login.
 *
 * Separada da casca do painel (`(dashboard)/layout.tsx`) por route group: os URLs não
 * mudam (`(marketing)` não aparece no caminho), só a moldura à volta do conteúdo.
 *
 * `setRequestLocale` tem de ser chamado AQUI, não só na página — o next-intl exige-o em
 * cada segmento (layout ou página) que use traduções para poder fazer parte do render
 * estático. `SiteFooter` chama `getTranslations()`; sem este `setRequestLocale`, o
 * `next build` marca `/`, `/design-system` e `/sign-in` como dinâmicos, apesar de cada
 * página já o chamar a si própria — o próprio `SiteFooter`, um nível acima, não o tinha.
 */
export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main id="conteudo-principal" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
