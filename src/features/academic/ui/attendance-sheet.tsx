"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reopenAttendance } from "@/features/academic/actions/reopen-attendance";
import { submitAttendance } from "@/features/academic/actions/submit-attendance";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { AttendanceStatus } from "@/types";

const STATUS_CYCLE: readonly AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success-surface text-success",
  ABSENT: "bg-destructive-surface text-destructive",
  LATE: "bg-warning-surface text-warning",
  EXCUSED: "bg-muted text-muted-foreground",
};

export interface AttendanceSheetEntry {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly status: AttendanceStatus;
}

interface AttendanceSheetProps {
  readonly scheduleEntryId: string;
  readonly date: string;
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly sessionId: string | null;
  readonly sessionStatus: "DRAFT" | "SUBMITTED" | null;
  readonly initialEntries: readonly AttendanceSheetEntry[];
  /**
   * Verdadeiro quando quem vê não lecciona este agrupamento — visível por dirigir a turma
   * (ver `TeacherScheduleEntry.isOwn`, `attendance.ts`). Só consulta: `submitAttendance`
   * recusaria de qualquer forma, mas esconder a edição evita um envio que falha calado.
   */
  readonly readOnly?: boolean;
}

/**
 * Folha de marcação — RF-01/RF-02/RNF-03: abre com todos "Presente", alternar é
 * imediato, sem diálogo de confirmação. `submitAttendance` só recebe o delta face a
 * `initialEntries` — não a lista toda (RNF-02).
 *
 * Estado local (`useState`), não `useOptimistic`: `useOptimistic` mostra um valor
 * temporário só enquanto uma transição ASSÍNCRONA está pendente, e reverte para a base
 * assim que essa transição acaba — não serve para acumular várias alternâncias antes de um
 * submeter explícito, que é exactamente o que esta folha precisa. Alternar aqui não chama
 * o servidor; só `handleSubmit` chama.
 */
export function AttendanceSheet({
  scheduleEntryId,
  date,
  teachingGroupName,
  subjectName,
  sessionId,
  sessionStatus,
  initialEntries,
  readOnly = false,
}: AttendanceSheetProps) {
  const t = useTranslations("attendance");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<readonly AttendanceSheetEntry[]>(initialEntries);

  const isLocked = sessionStatus === "SUBMITTED" || readOnly;

  function cycleStatus(enrollmentId: string, current: AttendanceStatus) {
    if (isLocked || isPending) return;

    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    setEntries((state) =>
      state.map((entry) =>
        entry.enrollmentId === enrollmentId ? { ...entry, status: next } : entry,
      ),
    );
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const changes = entries
        .filter((entry) => {
          const original = initialEntries.find((e) => e.enrollmentId === entry.enrollmentId);
          return original?.status !== entry.status;
        })
        .map((entry) => ({ enrollmentId: entry.enrollmentId, status: entry.status }));

      const result = await submitAttendance({
        scheduleEntryId,
        date: new Date(`${date}T00:00:00.000Z`),
        changes,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  function handleReopen() {
    if (!sessionId) return;
    setError(null);

    startTransition(async () => {
      const result = await reopenAttendance(sessionId);

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">
          {teachingGroupName} — {subjectName}
        </h1>
        <p className="text-muted-foreground">{date}</p>
      </div>

      {readOnly ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          {t("headTeacherReadOnlyNotice")}
        </p>
      ) : sessionStatus === "SUBMITTED" ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          {t("submittedNotice")}{" "}
          <Button type="button" variant="link" onClick={handleReopen} disabled={isPending}>
            {t("reopen")}
          </Button>
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.enrollmentId}>
            <button
              type="button"
              disabled={isLocked || isPending}
              onClick={() => cycleStatus(entry.enrollmentId, entry.status)}
              className={cn(
                "flex h-14 w-full items-center justify-between rounded-lg border border-border px-4",
                "transition-colors duration-200 ease-(--ease-enter) disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              <span className="font-medium text-foreground">{entry.studentName}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  STATUS_STYLES[entry.status],
                )}
              >
                {t(`status.${entry.status}`)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!isLocked ? (
        <Button type="button" size="lg" onClick={handleSubmit} disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      ) : null}
    </div>
  );
}
