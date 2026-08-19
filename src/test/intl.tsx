import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { formats, TIME_ZONE } from "@/i18n/formats";
import { LOCALE_TAGS, type Locale } from "@/i18n/routing";

export const messages = { pt, en } as const;

/**
 * Renderiza um componente dentro do contexto de língua, com as mensagens REAIS do
 * ficheiro e não com um duplo.
 *
 * Usar as mensagens verdadeiras é o que faz um teste falhar quando uma chave é removida
 * ou renomeada — que é precisamente o erro que a tradução costuma introduzir.
 *
 * `locale` fica no código curto ("pt"/"en"), tal como em `request.ts`: é o valor que o
 * `useLocale()` do next-intl expõe, e que `Link`/`usePathname` usam para o encaminhamento.
 * `useLocaleFormatter` (`@/i18n/use-locale-formatter`) é quem converte para o tag completo
 * (`LOCALE_TAGS[locale]`) só para formatar datas — não precisa de nada especial aqui.
 */
export function renderWithIntl(ui: ReactElement, locale: Locale = "pt") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      formats={formats}
      timeZone={TIME_ZONE}
      now={new Date("2026-08-16T08:00:00.000Z")}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

export { LOCALE_TAGS };
