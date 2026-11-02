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

export interface SchoolSwitcherAccess {
  readonly schoolId: string | null;
  readonly isPlatformAdmin: boolean;
  readonly memberships: readonly { readonly schoolId: string; readonly schoolName: string }[];
}

interface SwitcherOption {
  readonly schoolId: string;
  readonly schoolName: string;
}

/**
 * Selects an authorized school using memberships reloaded by the server on every request.
 * A single option remains available when no school is selected, allowing recovery after
 * revocation without silently selecting a different school. Platform administrators
 * receive all active schools through the separately authorized server action.
 */
export function SchoolSwitcher({ className, access }: { className?: string; access?: SchoolSwitcherAccess }) {
  const { data: session, update } = useSession();
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [platformSchools, setPlatformSchools] = useState<SwitcherOption[] | null>(null);

  // Server refreshes must override a stale useSession cache after membership revocation.
  const currentAccess = access ?? session;
  const isPlatformAdmin = currentAccess?.isPlatformAdmin ?? false;

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

  const available: readonly SwitcherOption[] = isPlatformAdmin ? (platformSchools ?? []) : (currentAccess?.memberships ?? []);
  const options = [...new Map(available.map((option) => [option.schoolId, option])).values()];

  const active = options.find((option) => option.schoolId === currentAccess?.schoolId);
  // Keep a recovery path when access to the previously selected school is revoked.
  if (!isPlatformAdmin && (options.length === 0 || (options.length === 1 && active))) return null;
  if (isPlatformAdmin && platformSchools === null) return null;

  function handleChange(schoolId: string) {
    if (!schoolId || schoolId === currentAccess?.schoolId) return;

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
          value={currentAccess?.schoolId ?? ""}
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
