"use client";

import {
  Award,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Contact,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { SchoolSwitcher } from "@/components/layout/school-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { StaticAppPathname } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export interface DashboardNavItem {
  readonly href: StaticAppPathname;
  readonly label: string;
}

/**
 * Um componente de ícone (função) não pode atravessar a fronteira Server → Client como
 * prop — o Next.js recusa-o em runtime ("Only plain objects can be passed..."). `navItems`
 * vem do servidor só com dados simples (`href`, `label`); o ícone resolve-se aqui, do
 * lado do cliente, a partir do `href`.
 */
const NAV_ICONS: Partial<Record<StaticAppPathname, LucideIcon>> = {
  "/students": Users,
  "/portal": Home,
  "/attendance": ClipboardList,
  "/attendance-report": CalendarCheck,
  "/grades": NotebookPen,
  "/report-cards": FileText,
  "/academic": GraduationCap,
  "/teachers": Contact,
  "/assessment": Award,
  "/settings": Settings,
  "/timetables": CalendarClock,
  "/my-timetable": CalendarClock,
};

function iconFor(href: StaticAppPathname): LucideIcon {
  return NAV_ICONS[href] ?? Home;
}

interface SidebarNavProps {
  readonly navItems: readonly DashboardNavItem[];
  readonly pathname: string;
  readonly onNavigate: () => void;
}

function SidebarNav({ navItems, pathname, onNavigate }: SidebarNavProps) {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("primary")} className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = iconFor(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  "transition-colors duration-200 ease-(--ease-enter)",
                  active
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface SidebarFooterProps {
  readonly userName: string;
  readonly subtitle: string;
}

function SidebarFooter({ userName, subtitle }: SidebarFooterProps) {
  const t = useTranslations("auth");
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("signOut")}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  readonly navItems: readonly DashboardNavItem[];
  readonly userName: string;
  readonly schoolName: string | null;
  readonly roleLabel: string | null;
  readonly children: ReactNode;
}

/**
 * Casca do painel — barra lateral, cabeçalho utilitário, conteúdo, rodapé mínimo.
 *
 * Substitui por completo `SiteHeader`/`SiteFooter` (a casca de marketing) depois de
 * entrar: ver docs/specs/role-shell.md. `navItems` já vem resolvido por papel a partir do
 * layout do servidor (`(dashboard)/layout.tsx`) — este componente só desenha, não decide
 * quem vê o quê.
 */
export function DashboardShell({
  navItems,
  userName,
  schoolName,
  roleLabel,
  children,
}: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");

  const subtitle = [roleLabel, schoolName].filter(Boolean).join(" · ");
  const closeDrawer = () => setOpen(false);

  return (
    <div className="flex min-h-full flex-1">
      {/* Barra lateral fixa — ecrãs médios e grandes. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Link href="/" className="flex h-16 items-center px-4">
          <Logo />
        </Link>
        <SidebarNav navItems={navItems} pathname={pathname} onNavigate={closeDrawer} />
        <SidebarFooter userName={userName} subtitle={subtitle} />
      </aside>

      {/* Gaveta — ecrãs pequenos, por cima do conteúdo. */}
      {open ? (
        <div id="menu-painel" className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 bg-black/50"
            onClick={closeDrawer}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-lg">
            <div className="flex h-16 items-center justify-between px-4">
              <Logo />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t("closeMenu")}
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <SidebarNav navItems={navItems} pathname={pathname} onNavigate={closeDrawer} />
            <SidebarFooter userName={userName} subtitle={subtitle} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("openMenu")}
            aria-controls="menu-painel"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <SchoolSwitcher />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main id="conteudo-principal" className="flex-1 bg-background">
          {children}
        </main>

        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          {tFooter("copyright", { year: String(new Date().getFullYear()) })}
        </footer>
      </div>
    </div>
  );
}
