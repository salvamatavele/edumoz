import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";
import type { StaticAppPathname } from "@/i18n/routing";

const FOOTER_LINKS: ReadonlyArray<{ href: StaticAppPathname; key: string }> = [
  { href: "/design-system", key: "nav.designSystem" },
  { href: "/", key: "footer.privacy" },
  { href: "/", key: "footer.terms" },
];

export async function SiteFooter() {
  const t = await getTranslations();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>

        <nav aria-label={t("footer.links")}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="inline-flex h-11 items-center text-sm text-muted-foreground transition-colors duration-200 ease-(--ease-enter) hover:text-primary"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          {/* Ano como texto, não como número: em ICU um número leva separador de milhares
              e "2026" sairia "2 026". */}
          {t("footer.copyright", { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}
