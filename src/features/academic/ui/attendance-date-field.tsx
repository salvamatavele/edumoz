"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";

/**
 * Selector de data da lista de agrupamentos do dia. Navega por `?data=`, não por estado
 * local — a página em si já resolve o horário certo a partir do parâmetro do URL, o que
 * mantém a data partilhável e sobrevive a um recarregamento. `pathname` fica fixo em
 * `/attendance` — este campo só é usado nessa página — em vez de `usePathname()`, cujo
 * tipo é a união de TODOS os caminhos possíveis, incluindo os dinâmicos.
 */
export function AttendanceDateField({ date }: { date: string }) {
  const t = useTranslations("attendance");
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{t("date")}</span>
      <input
        type="date"
        value={date}
        onChange={(event) => {
          router.push({ pathname: "/attendance", query: { data: event.target.value } });
        }}
        className="h-12 w-fit rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
      />
    </label>
  );
}
