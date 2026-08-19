"use client";

import { Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listSchoolsForSwitcher } from "@/features/identity/actions/list-schools-for-switcher";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

interface SwitcherOption {
  readonly schoolId: string;
  readonly schoolName: string;
}

/**
 * Selector de escola.
 *
 * Para a generalidade dos utilizadores, só aparece com mais do que uma `Membership` — um
 * selector com uma única opção é ruído. Trocar de escola chama `update({ schoolId })`, que
 * reemite o JWT com o papel da escola nova (o callback `jwt` em `src/lib/auth/config.ts`
 * valida o pedido contra as `Membership` do próprio token); o `router.refresh()` a seguir é
 * o que faz os Server Components que já leram a sessão (ex.: `/alunos`) resolverem a
 * escola nova sem um recarregamento completo da página.
 *
 * Um administrador da plataforma não depende de `Membership` nenhuma — por isso vê aqui
 * TODAS as escolas activas (`listSchoolsForSwitcher`), sempre, mesmo com zero ou uma só.
 * Sem isto, um superadmin sem `Membership` não teria forma nenhuma de escolher uma escola
 * para gerir, apesar de `resolveActiveSchool` já aceitar o pedido.
 */
export function SchoolSwitcher({ className }: { className?: string }) {
  const { data: session, update } = useSession();
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [platformSchools, setPlatformSchools] = useState<SwitcherOption[] | null>(null);

  const isPlatformAdmin = session?.isPlatformAdmin ?? false;

  useEffect(() => {
    // Nada a subscrever para quem não é superadmin — `platformSchools` só é lido mais
    // abaixo quando `isPlatformAdmin` é verdadeiro, por isso não precisa de ser reposto a
    // `null` aqui (evitaria um `setState` síncrono dentro do efeito, sem necessidade).
    if (!isPlatformAdmin) return;

    let cancelled = false;

    listSchoolsForSwitcher().then((schools) => {
      if (!cancelled) {
        setPlatformSchools(schools.map((school) => ({ schoolId: school.id, schoolName: school.name })));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin]);

  const options: SwitcherOption[] = isPlatformAdmin ? (platformSchools ?? []) : (session?.memberships ?? []);

  if (!isPlatformAdmin && options.length <= 1) return null;
  if (isPlatformAdmin && platformSchools === null) return null;

  const active = options.find((option) => option.schoolId === session?.schoolId);

  function handleChange(schoolId: string) {
    if (!schoolId || schoolId === session?.schoolId) return;

    startTransition(async () => {
      await update({ schoolId });
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          aria-label={t("school")}
          className={cn("max-w-40 justify-start gap-2 truncate", className)}
        >
          <Building2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{active?.schoolName ?? t("school")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("changeSchool")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={session?.schoolId ?? ""}
          onValueChange={handleChange}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.schoolId} value={option.schoolId}>
              {option.schoolName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
