import { useTranslations } from "next-intl";

import type { ScheduleViewEntry } from "@/features/academic/data/scheduling";
import { DayOfWeek } from "@/types";

const WEEKDAYS: readonly DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

interface ScheduleViewProps {
  readonly entries: readonly ScheduleViewEntry[];
  /** Esconde o nome do professor — redundante na consulta do próprio professor. */
  readonly showTeacher?: boolean;
}

/**
 * Consulta de horário, só leitura — professor ou aluno/encarregado. Duas apresentações da
 * MESMA lista de `entries`, uma visível de cada vez por CSS: a grelha (dias × tempos) num
 * ecrã largo, uma lista empilhada por dia num ecrã de telemóvel, sem scroll horizontal.
 */
export function ScheduleView({ entries, showTeacher = true }: ScheduleViewProps) {
  const t = useTranslations("scheduling");
  const tAcademic = useTranslations("academic");

  if (entries.length === 0) {
    return <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">{t("view.empty")}</p>;
  }

  const byDay = new Map<DayOfWeek, ScheduleViewEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.dayOfWeek) ?? [];
    list.push(entry);
    byDay.set(entry.dayOfWeek, list);
  }

  const periods = [...new Set(entries.map((entry) => `${entry.startTime}-${entry.endTime}`))].sort();

  // Mais do que uma entrada por célula é normal, não um erro: uma turma mista tem
  // subgrupos de Secção diferentes com aulas em paralelo no mesmo tempo — nunca colapsar
  // para a última, ou a grelha de uma turma perderia aulas silenciosamente.
  const entriesByCell = new Map<string, ScheduleViewEntry[]>();
  for (const entry of entries) {
    const key = `${entry.dayOfWeek}:${entry.startTime}-${entry.endTime}`;
    const list = entriesByCell.get(key) ?? [];
    list.push(entry);
    entriesByCell.set(key, list);
  }

  return (
    <>
      {/* Grelha — visível a partir de sm. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-32 px-3 py-2 text-left font-medium">{t("board.period")}</th>
              {WEEKDAYS.map((day) => (
                <th key={day} className="px-3 py-2 text-left font-medium">
                  {tAcademic(`dayOfWeek.${day}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">{period.replace("-", "–")}</td>
                {WEEKDAYS.map((day) => {
                  const cellEntries = entriesByCell.get(`${day}:${period}`) ?? [];
                  return (
                    <td key={day} className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-2">
                        {cellEntries.map((entry) => (
                          <div key={entry.id} className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">{entry.subjectName}</span>
                            <span className="text-xs text-muted-foreground">
                              {showTeacher ? entry.teacherName : entry.teachingGroupName} · {entry.roomName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista empilhada por dia — visível abaixo de sm, sem scroll horizontal. */}
      <div className="flex flex-col gap-4 sm:hidden">
        {WEEKDAYS.filter((day) => byDay.has(day)).map((day) => (
          <div key={day} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">{tAcademic(`dayOfWeek.${day}`)}</h3>
            <ul className="flex flex-col gap-2">
              {(byDay.get(day) ?? [])
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 rounded-md border border-border bg-surface p-3">
                    <span className="text-xs text-muted-foreground">
                      {entry.startTime}–{entry.endTime}
                    </span>
                    <span className="font-medium text-foreground">{entry.subjectName}</span>
                    <span className="text-xs text-muted-foreground">
                      {showTeacher ? entry.teacherName : entry.teachingGroupName} · {entry.roomName}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
