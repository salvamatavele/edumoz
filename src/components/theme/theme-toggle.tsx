"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

// The document element is the source of truth: the pre-paint script sets it
// before React runs, and every toggle writes back to it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getServerSnapshot = (): Theme => "light";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
  const isDark = theme === "dark";
  const t = useTranslations("common.theme");

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("toLight") : t("toDark")}
      aria-pressed={isDark}
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground",
        "transition-colors duration-200 ease-(--ease-enter) hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-5" strokeWidth={1.75} />
      ) : (
        <Moon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      )}
    </button>
  );
}
