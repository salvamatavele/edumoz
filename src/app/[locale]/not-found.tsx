import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <main id="conteudo-principal" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold text-foreground">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundDescription")}</p>
      <Link href="/" className="w-fit rounded-md text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        {t("returnHome")}
      </Link>
    </main>
  );
}
