import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_TAGS, routing } from "./routing";

/**
 * Configuração por pedido: mensagens e formatos da língua activa.
 *
 * Os formatos vivem aqui e não espalhados pelos componentes. Uma data escrita à mão como
 * `${dia}/${mês}/${ano}` fica errada em inglês, e uma quantia escrita com `toFixed(2)`
 * perde o separador de milhares e o símbolo da moeda. Centralizar é o que garante que
 * 21600 aparece como "21 600,00 MT" em português e "MTn 21,600.00" em inglês.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats: {
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
    },
    // O tag completo (pt-MZ, en-GB) decide separadores e nomes de meses; o código curto
    // decide apenas qual o ficheiro de mensagens.
    timeZone: "Africa/Maputo",
    now: new Date(),
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      // Em desenvolvimento, uma chave em falta deve saltar à vista, não passar por texto.
      return process.env.NODE_ENV === "production" ? path : `⟦${path}⟧`;
    },
    onError() {
      // O erro por omissão do next-intl polui a consola em cada render. As chaves em falta
      // já são visíveis pelo fallback acima, e os testes verificam-nas explicitamente.
    },
  };
});

export { LOCALE_TAGS };
