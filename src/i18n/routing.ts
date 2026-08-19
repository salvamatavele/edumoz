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
    "/portal": "/portal",
    "/attendance": {
      pt: "/presencas",
      en: "/attendance",
    },
    "/attendance/[scheduleEntryId]": {
      pt: "/presencas/[scheduleEntryId]",
      en: "/attendance/[scheduleEntryId]",
    },
    "/attendance-report": {
      pt: "/turmas/assiduidade",
      en: "/attendance-report",
    },
    "/grades": {
      pt: "/notas",
      en: "/grades",
    },
    "/grades/[teachingGroupId]": {
      pt: "/notas/[teachingGroupId]",
      en: "/grades/[teachingGroupId]",
    },
    "/grades/[teachingGroupId]/[assessmentId]": {
      pt: "/notas/[teachingGroupId]/[assessmentId]",
      en: "/grades/[teachingGroupId]/[assessmentId]",
    },
    "/report-cards": {
      pt: "/pautas",
      en: "/report-cards",
    },
    "/academic": {
      pt: "/academico",
      en: "/academic",
    },
    "/teachers": {
      pt: "/professores",
      en: "/teachers",
    },
    "/assessment": {
      pt: "/avaliacao",
      en: "/assessment",
    },
    "/settings": {
      pt: "/configuracao",
      en: "/settings",
    },
    "/timetables": {
      pt: "/horarios",
      en: "/timetables",
    },
    "/timetables/teacher/[id]": {
      pt: "/horarios/professor/[id]",
      en: "/timetables/teacher/[id]",
    },
    "/my-timetable": {
      pt: "/meu-horario",
      en: "/my-timetable",
    },
  },
});

/**
 * Rotas que exigem sessão, na sua forma INTERNA (a chave de `pathnames`, não o caminho
 * que o utilizador vê). O `proxy.ts` compara contra isto depois de retirar o prefixo de
 * língua, para a mesma regra valer em `/alunos` e em `/en/students`.
 */
export const PROTECTED_PATHNAMES: readonly AppPathnameKey[] = [
  "/students",
  "/portal",
  "/attendance",
  "/attendance/[scheduleEntryId]",
  "/attendance-report",
  "/grades",
  "/grades/[teachingGroupId]",
  "/grades/[teachingGroupId]/[assessmentId]",
  "/report-cards",
  "/academic",
  "/teachers",
  "/assessment",
  "/settings",
  "/timetables",
  "/timetables/teacher/[id]",
  "/my-timetable",
];

type AppPathnameKey = keyof (typeof routing)["pathnames"];

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/**
 * `AppPathname` sem as rotas com segmentos dinâmicos (`/attendance/[scheduleEntryId]`).
 * Para listas de navegação (cabeçalho, barra lateral, rodapé) — nunca apontam para uma
 * rota que precise de parâmetros por preencher. O `Link` do next-intl exige um `href`
 * como `{ pathname, params }` para as dinâmicas; uma lista de ligações fixas não os tem.
 */
export type StaticAppPathname = Exclude<AppPathname, `${string}[${string}`>;

/** pt-MZ e en-GB: o português é o de Moçambique, e as datas em inglês não são as dos EUA. */
export const LOCALE_TAGS: Record<Locale, string> = {
  pt: "pt-MZ",
  en: "en-GB",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};
