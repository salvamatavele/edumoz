import type { Formats } from "next-intl";

/**
 * Formatos de data e número partilhados entre a configuração real (`request.ts`), o
 * formatador de tag completo (`use-locale-formatter.ts`) e o contexto de teste
 * (`src/test/intl.tsx`).
 *
 * Extraído para um módulo próprio porque um teste que não regista o formato `"short"`
 * não exercitaria o defeito de datas em inglês — teria de continuar a definir os formatos
 * à mão, divergentes da produção.
 */
export const TIME_ZONE = "Africa/Maputo";

// `satisfies`, não `: Formats` — a anotação larga a forma concreta do objecto (as chaves
// de `dateTime`/`number` passariam a `never` em `use-locale-formatter.ts`), e `satisfies`
// continua a verificar que cumpre `Formats`.
export const formats = {
  dateTime: {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    weekday: { weekday: "long" },
  },
  number: {
    currency: {
      style: "currency",
      currency: "MZN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    // Notas: sempre duas casas, para uma pauta alinhar em coluna.
    score: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    percent: { style: "percent", maximumFractionDigits: 0 },
  },
} satisfies Formats;
