"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_LABELS, type Locale, routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/**
 * Selector de língua.
 *
 * É um par de ligações e não um `<select>` com JavaScript, por duas razões: funciona sem
 * JavaScript — cenário real em ligações lentas — e produz URLs rastreáveis, o que é o que
 * permite ao motor de busca indexar as duas versões da página.
 *
 * O `usePathname` do next-intl devolve o caminho canónico, portanto trocar de língua a
 * partir de `/sistema-de-design` leva a `/en/design-system` e não a uma página inexistente.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const active = useLocale() as Locale;
  const pathname = usePathname();
  // Necessário para rotas dinâmicas (ex.: `/presencas/[scheduleEntryId]`) — sem os
  // parâmetros da rota actual, o `Link` não consegue recompor o URL na outra língua.
  // Numa rota estática `params` fica vazio e o next-intl ignora-o.
  const params = useParams();
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={cn("flex items-center", className)}
      role="group"
      aria-label={t("changeLanguage")}
    >
      <Languages
        aria-hidden="true"
        className="mr-1 hidden size-4 text-muted-foreground sm:block"
        strokeWidth={1.75}
      />
      {routing.locales.map((locale) => {
        const current = locale === active;

        return (
          <Link
            key={locale}
            // O tipo de `href` do next-intl varia consoante o `pathname` seja estático ou
            // tenha segmentos dinâmicos — `pathname` aqui é uma união de todos os
            // caminhos possíveis, e o TypeScript não consegue provar qual se aplica.
            // Suportado em runtime para ambos os casos: `params` fica `{}` numa rota
            // estática, e o next-intl ignora-o.
            href={{ pathname, params } as never}
            locale={locale}
            hrefLang={locale}
            aria-current={current ? "true" : undefined}
            onClick={() => startTransition(() => {})}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-medium uppercase",
              "transition-colors duration-200 ease-(--ease-enter)",
              current
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isPending && "opacity-70",
            )}
          >
            <span aria-hidden="true">{locale}</span>
            <span className="sr-only">{LOCALE_LABELS[locale]}</span>
          </Link>
        );
      })}
    </div>
  );
}
