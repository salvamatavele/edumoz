"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const NAV_ITEMS: ReadonlyArray<{ href: AppPathname; key: string }> = [
  { href: "/", key: "home" },
  { href: "/design-system", key: "designSystem" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  // `usePathname` do @/i18n/navigation devolve o caminho SEM prefixo de língua e na
  // forma canónica — em `/en/design-system` devolve "/design-system", tal como em
  // `/sistema-de-design`. Sem isto, o item activo nunca acenderia fora do português.
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-md"
          aria-label={tCommon("homeAriaLabel")}
        >
          <Logo />
        </Link>

        <nav aria-label={t("primary")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center rounded-md px-4 text-sm font-medium",
                      "transition-colors duration-200 ease-(--ease-enter)",
                      active
                        ? "bg-muted text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button size="sm" className="hidden md:inline-flex">
            {tCommon("requestDemo")}
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className={cn(
              "inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
              "text-muted-foreground transition-colors duration-200 ease-(--ease-enter)",
              "hover:bg-muted hover:text-foreground md:hidden",
            )}
          >
            {open ? (
              <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
            ) : (
              <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-border bg-surface md:hidden">
          <nav aria-label={t("primaryMobile")} className="px-4 py-3">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={cn(
                      "flex h-12 items-center rounded-md px-4 text-base font-medium",
                      pathname === item.href
                        ? "bg-muted text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
            <Button className="mt-3 w-full">{tCommon("requestDemo")}</Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
