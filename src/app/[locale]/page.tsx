import { setRequestLocale } from "next-intl/server";

import { HomeSections } from "@/components/marketing/home-sections";

/**
 * A rota trata do que é da rota — resolver a língua e fixá-la para o render estático —
 * e delega a apresentação a `HomeSections`.
 *
 * A separação não é cerimónia: um Server Component `async` não se renderiza no Testing
 * Library, e uma página inteira dentro de um `async` deixa de ter testes. `HomeSections`
 * é síncrono e usa `useTranslations`, que funciona tanto no servidor como no cliente.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeSections />;
}
