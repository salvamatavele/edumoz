import { defineRouting } from "next-intl/routing";

/**
 * Encaminhamento por língua.
 *
 * `localePrefix: "as-needed"` — o português, que é a língua da esmagadora maioria dos
 * utilizadores, não leva prefixo (`/`, `/sistema-de-design`); o inglês vive sob `/en`.
 * URLs limpas para quem as usa todos os dias, e SEO correcto para as duas línguas.
 *
 * Os caminhos são traduzidos, não apenas o conteúdo: `/alunos` e `/en/students` são a
 * mesma página. Uma secretaria que partilhe um link com uma colega partilha um endereço
 * que se lê em português.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",

  /**
   * Sem detecção automática pelo `Accept-Language`.
   *
   * Por omissão, o next-intl encaminharia um browser configurado em inglês para `/en`.
   * Em Moçambique isso engana-se com frequência: muitos telemóveis Android são vendidos
   * com o sistema em inglês e são usados por gente que trabalha em português. O resultado
   * seria uma secretária a abrir a plataforma e encontrá-la numa língua que não pediu.
   *
   * Com a detecção desligada, `/` é sempre português e o inglês é uma escolha explícita
   * que o próprio endereço transporta (`/en/...`). Previsível para quem partilha links.
   */
  localeDetection: false,

  pathnames: {
    "/": "/",
    "/design-system": {
      pt: "/sistema-de-design",
      en: "/design-system",
    },
    "/sign-in": {
      pt: "/entrar",
      en: "/sign-in",
    },
    "/students": {
      pt: "/alunos",
      en: "/students",
    },
  },
});

/**
 * Rotas que exigem sessão, na sua forma INTERNA (a chave de `pathnames`, não o caminho
 * que o utilizador vê). O `proxy.ts` compara contra isto depois de retirar o prefixo de
 * língua, para a mesma regra valer em `/alunos` e em `/en/students`.
 */
export const PROTECTED_PATHNAMES: readonly AppPathnameKey[] = ["/students"];

type AppPathnameKey = keyof (typeof routing)["pathnames"];

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/** pt-MZ e en-GB: o português é o de Moçambique, e as datas em inglês não são as dos EUA. */
export const LOCALE_TAGS: Record<Locale, string> = {
  pt: "pt-MZ",
  en: "en-GB",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};
