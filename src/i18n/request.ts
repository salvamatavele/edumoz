import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { formats, TIME_ZONE } from "./formats";
import { LOCALE_TAGS, routing } from "./routing";

/**
 * Configuração por pedido: mensagens e formatos da língua activa.
 *
 * Os formatos vivem em `./formats` e não espalhados pelos componentes. `locale` fica no
 * código curto ("pt"/"en") de propósito — é o MESMO valor que o next-intl usa para gerar
 * URLs (`Link`, `usePathname`, `routing.pathnames`). Passar aqui o tag completo (`pt-MZ`,
 * `en-GB`) partiria a navegação: um `Link` para `/design-system` passaria a resolver para
 * `/pt-MZ/design-system`, que não existe em `routing.pathnames`. A formatação de datas com
 * o tag completo (o que corrige "en" a ser tratado como "en-US") vive à parte, em
 * `./use-locale-formatter`, precisamente para não interferir com o encaminhamento.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats,
    timeZone: TIME_ZONE,
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
