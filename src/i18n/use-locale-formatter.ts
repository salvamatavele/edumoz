"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

import { formats, TIME_ZONE } from "./formats";
import { LOCALE_TAGS, type Locale } from "./routing";

/**
 * Datas e números formatados com o tag BCP-47 completo (`pt-MZ`, `en-GB`), fora do
 * `useFormatter()` do next-intl.
 *
 * `useFormatter()` usa o MESMO `locale` para formatar e para gerar URLs — não há como os
 * separar dentro do próprio next-intl (`createFormatter` só aceita um `locale`, e é o
 * mesmo que `useLocale()`/`Link` leem para o encaminhamento). Devolver o tag completo em
 * `getRequestConfig` corrigia a ordem dia/mês em inglês mas partia a navegação: um `Link`
 * para `/design-system` passava a resolver `/pt-MZ/design-system`, que `routing.pathnames`
 * não conhece. Este hook usa o `Intl` nativo directamente, com o tag completo, e deixa o
 * `locale` do next-intl no código curto — correcto para o encaminhamento.
 */
export function useLocaleFormatter() {
  const locale = useLocale() as Locale;
  const tag = LOCALE_TAGS[locale];

  return useMemo(
    () => ({
      dateTime: (value: Date | number, format: keyof typeof formats.dateTime) =>
        new Intl.DateTimeFormat(tag, {
          timeZone: TIME_ZONE,
          ...formats.dateTime[format],
        }).format(value),
      number: (value: number, format: keyof typeof formats.number) =>
        new Intl.NumberFormat(tag, formats.number[format]).format(value),
    }),
    [tag],
  );
}
