import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { LOCALE_TAGS, type Locale } from "@/i18n/routing";

export const messages = { pt, en } as const;

/**
 * Renderiza um componente dentro do contexto de língua, com as mensagens REAIS do
 * ficheiro e não com um duplo.
 *
 * Usar as mensagens verdadeiras é o que faz um teste falhar quando uma chave é removida
 * ou renomeada — que é precisamente o erro que a tradução costuma introduzir.
 */
export function renderWithIntl(ui: ReactElement, locale: Locale = "pt") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Africa/Maputo"
      now={new Date("2026-08-16T08:00:00.000Z")}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

export { LOCALE_TAGS };
