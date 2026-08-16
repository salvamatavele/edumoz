import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Substitutos de `next/link` e `next/navigation` com consciência de língua.
 *
 * A aplicação importa daqui e nunca de `next/link` directamente: um `<Link href="/">`
 * do Next perderia o prefixo `/en` e atiraria um utilizador inglês para a versão
 * portuguesa a meio da navegação. Estes envoltórios resolvem o caminho traduzido a partir
 * da língua activa.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
