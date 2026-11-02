import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { isTrustedMutationOrigin } from "@/features/identity/domain/mutation-origin";
import { PROTECTED_PATHNAMES, routing } from "@/i18n/routing";
import { hasSessionTokenCookie } from "@/lib/auth/session-cookie";

/**
 * Encaminhamento por língua e verificação optimista de sessão.
 *
 * O Next.js 16 renomeou `middleware.ts` para `proxy.ts` e a função exportada para `proxy`;
 * o `middleware.ts` está deprecado. O `next-intl` ainda publica o seu ponto de entrada com
 * o nome antigo (`next-intl/middleware`) — a função é a mesma, só o ficheiro que a aloja é
 * que mudou de nome.
 *
 * Isto NÃO é a camada de autorização. Conforme a documentação do Next 16, o proxy serve
 * para verificações OPTIMISTAS: aqui olha-se apenas para a presença do cookie de sessão,
 * sem o validar nem ler a base de dados. Quem decide de verdade é cada página e cada
 * Server Action, chamando `auth()`. Um cookie forjado passa por aqui e é recusado lá —
 * o que este passo evita é apenas mostrar um ecrã vazio a quem nunca iniciou sessão.
 */
const handleI18n = createMiddleware(routing);

/** Retira o prefixo de língua, para `/alunos` e `/en/students` darem o mesmo resultado. */
function toInternalPathname(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      pathname = pathname.slice(locale.length + 1);
      break;
    }
  }

  for (const [internal, localised] of Object.entries(routing.pathnames)) {
    if (typeof localised === "string") {
      if (pathname === localised || pathname.startsWith(`${localised}/`)) return internal + pathname.slice(localised.length);
      continue;
    }

    for (const path of Object.values(localised)) {
      if (pathname === path || pathname.startsWith(`${path}/`)) return internal + pathname.slice(path.length);
    }
  }

  return pathname;
}

function hasSessionCookie(request: NextRequest): boolean {
  return hasSessionTokenCookie(request.cookies.getAll().map((cookie) => cookie.name));
}

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  const vary = response.headers.get("Vary")?.split(",").map((value) => value.trim()) ?? [];
  if (!vary.some((value) => value.toLowerCase() === "cookie")) vary.push("Cookie");
  response.headers.set("Vary", vary.join(", "));
  return response;
}

export function proxy(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)
      && !isTrustedMutationOrigin(request.headers.get("origin"), process.env.AUTH_URL || request.nextUrl.origin)) {
    return privateResponse(new NextResponse(null, { status: 403 }));
  }
  const internal = toInternalPathname(request.nextUrl.pathname);
  const isProtected = PROTECTED_PATHNAMES.some(
    (route) => internal === route || internal.startsWith(`${route}/`),
  );

  if (isProtected && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();

    // O caminho de login é escolhido na língua do pedido, para quem está em `/en/students`
    // não aterrar numa página portuguesa.
    const isEnglish = request.nextUrl.pathname.startsWith("/en");
    url.pathname = isEnglish ? "/en/sign-in" : "/entrar";
    url.search = "";
    url.searchParams.set("continuar", request.nextUrl.pathname + request.nextUrl.search);

    return privateResponse(NextResponse.redirect(url));
  }

  const response = handleI18n(request);
  return isProtected ? privateResponse(response) : response;
}

export const config = {
  /*
   * Tudo excepto: rotas de API, ficheiros internos do Next, e qualquer caminho com
   * extensão (imagens, fontes, favicon). Sem esta exclusão, o proxy tentaria atribuir uma
   * língua a `/favicon.ico` e devolveria um redireccionamento em vez do ficheiro.
   */
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
