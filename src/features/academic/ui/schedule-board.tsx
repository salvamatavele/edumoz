"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { placeScheduleEntry } from "@/features/academic/actions/place-schedule-entry";
import type { ScheduleBoardData, ScheduleBoardEntry } from "@/features/academic/data/scheduling";
import { conflictsForPlacement } from "@/features/academic/domain/schedule-conflicts";
import type { ScheduleConflict } from "@/features/academic/domain/scheduling";
import { useRouter } from "@/i18n/navigation";
import { DayOfWeek } from "@/types";

type ScheduleBoardProps = ScheduleBoardData & { readonly canCreate?: boolean; readonly canEdit?: boolean };

type ViewMode = "class" | "teacher" | "room";

const WEEKDAYS: readonly DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

interface Period {
  readonly key: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly order: number;
}

/**
 * Grelha de montagem do horário. Sem arrastar: escolher agrupamento + tempo + sala num
 * diálogo, com `conflictsForPlacement` a correr no cliente a cada escolha — a MESMA
 * função pura que o servidor volta a chamar em `placeScheduleEntry`, nunca uma segunda
 * implementação da detecção. As mensagens de conflito são construídas aqui, a partir dos
 * nomes já disponíveis em `options` — só a apresentação repete-se entre cliente e
 * servidor, nunca a lógica de detecção.
 */
export function ScheduleBoard({ entries, options, candidates, memberships, academicYear, canCreate = true, canEdit = true }: ScheduleBoardProps) {
  const t = useTranslations("scheduling");
  const tAcademic = useTranslations("academic");
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [viewId, setViewId] = useState<string>(options.classGroups[0]?.id ?? "");
  const [dialogEntry, setDialogEntry] = useState<ScheduleBoardEntry | Partial<ScheduleBoardEntry> | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const viewOptions =
    viewMode === "class" ? options.classGroups : viewMode === "teacher" ? options.teachers : options.rooms;

  const filteredEntries = useMemo(() => {
    if (!viewId) return [];
    return entries.filter((entry) => {
      if (viewMode === "class") return entry.classGroupId === viewId;
      if (viewMode === "teacher") return entry.teacherId === viewId;
      return entry.roomId === viewId;
    });
  }, [entries, viewMode, viewId]);

  const periods = useMemo<Period[]>(() => {
    const byKey = new Map<string, Period>();

    for (const slot of options.timeSlots) {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, startTime: slot.startTime, endTime: slot.endTime, order: slot.order });
      }
    }

    return [...byKey.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [options.timeSlots]);

  const entryByCell = useMemo(() => {
    const map = new Map<string, ScheduleBoardEntry>();
    for (const entry of filteredEntries) {
      map.set(`${entry.dayOfWeek}:${entry.startTime}-${entry.endTime}`, entry);
    }
    return map;
  }, [filteredEntries]);

  const timeSlotByDayAndPeriod = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of options.timeSlots) {
      map.set(`${slot.dayOfWeek}:${slot.startTime}-${slot.endTime}`, slot.id);
    }
    return map;
  }, [options.timeSlots]);

  if (options.timeSlots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("board.noTimeSlots")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {warning ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning bg-warning-surface p-3 text-sm text-warning"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {warning}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label={t("board.viewBy")}
            value={viewMode}
            onValueChange={(value) => {
              const mode = value as ViewMode;
              setViewMode(mode);
              const firstId =
                mode === "class" ? options.classGroups[0]?.id : mode === "teacher" ? options.teachers[0]?.id : options.rooms[0]?.id;
              setViewId(firstId ?? "");
            }}
            options={[
              { value: "class", label: t("board.byClass") },
              { value: "teacher", label: t("board.byTeacher") },
              { value: "room", label: t("board.byRoom") },
            ]}
          />
          <SelectField
            label={t("board.viewEntity")}
            value={viewId}
            onValueChange={setViewId}
            options={viewOptions.map((option) => ({ value: option.id, label: option.name }))}
          />
        </div>

        {canCreate ? <Button size="sm" onClick={() => setDialogEntry({})}>
          <Plus aria-hidden="true" strokeWidth={1.75} />
          {t("board.placeTrigger")}
        </Button> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
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
              <tr key={period.key} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                  {period.startTime}–{period.endTime}
                </td>
                {WEEKDAYS.map((day) => {
                  const entry = entryByCell.get(`${day}:${period.key}`);
                  const timeSlotId = timeSlotByDayAndPeriod.get(`${day}:${period.key}`);

                  return (
                    <td key={day} className="p-1 align-top">
                      {entry ? (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setDialogEntry(entry)}
                          className="flex w-full flex-col gap-0.5 rounded-md border border-border-strong bg-surface p-2 text-left transition-colors duration-200 ease-(--ease-enter) hover:bg-muted"
                        >
                          <span className="font-medium text-foreground">{entry.subjectName}</span>
                          <span className="text-xs text-muted-foreground">
                            {viewMode !== "teacher" ? entry.teacherName : null}
                            {viewMode !== "room" ? ` · ${entry.roomName}` : null}
                          </span>
                        </button>
                      ) : timeSlotId && canCreate ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDialogEntry({
                              timeSlotId,
                              roomId: viewMode === "room" ? viewId : undefined,
                              teacherId: viewMode === "teacher" ? viewId : undefined,
                            })
                          }
                          className="flex h-12 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors duration-200 ease-(--ease-enter) hover:border-border-strong hover:text-foreground"
                          aria-label={t("board.emptyCell")}
                        >
                          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                        </button>
                      ) : (
                        <div className="h-12" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogEntry !== null} onOpenChange={(open) => !open && setDialogEntry(null)}>
        <DialogContent>
          {dialogEntry ? (
            <PlaceEntryForm
              initial={dialogEntry}
              options={options}
              candidates={candidates}
              memberships={memberships}
              academicYear={academicYear}
              onClose={() => setDialogEntry(null)}
              onSaved={(savedWarning) => {
                setDialogEntry(null);
                setWarning(savedWarning ?? null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Nomes já resolvidos localmente (sem consulta extra) — mesma informação que `options` já tem. */
function describeClientConflict(
  conflict: ScheduleConflict,
  candidateTeachingGroupId: string,
  options: ScheduleBoardData["options"],
  t: ReturnType<typeof useTranslations>,
): string {
  const groupName = (id: string) => options.teachingGroups.find((g) => g.id === id)?.name ?? id;
  const otherGroupId = "teachingGroupIds" in conflict ? conflict.teachingGroupIds.find((id) => id !== candidateTeachingGroupId) : undefined;

  switch (conflict.kind) {
    case "TEACHER_DOUBLE_BOOKED":
      return t("conflicts.teacherDoubleBooked", {
        teacher: options.teachers.find((teacher) => teacher.id === conflict.teacherId)?.name ?? conflict.teacherId,
        group: groupName(otherGroupId ?? ""),
      });
    case "ROOM_DOUBLE_BOOKED":
      return t("conflicts.roomDoubleBooked", {
        group: groupName(otherGroupId ?? ""),
      });
    case "GROUP_DOUBLE_BOOKED":
      return t("conflicts.groupDoubleBooked");
    case "STUDENT_DOUBLE_BOOKED":
      return t("conflicts.studentDoubleBooked", { count: 1, group: groupName(otherGroupId ?? "") });
  }
}

function PlaceEntryForm({
  initial,
  options,
  candidates,
  memberships,
  academicYear,
  onClose,
  onSaved,
}: {
  readonly initial: ScheduleBoardEntry | Partial<ScheduleBoardEntry>;
  readonly options: ScheduleBoardData["options"];
  readonly candidates: ScheduleBoardData["candidates"];
  readonly memberships: ScheduleBoardData["memberships"];
  readonly academicYear: string | null;
  readonly onClose: () => void;
  readonly onSaved: (warning?: string) => void;
}) {
  const t = useTranslations("scheduling");
  const tForm = useTranslations("form");
  const tAcademic = useTranslations("academic");
  const router = useRouter();
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [teachingGroupId, setTeachingGroupId] = useState(initial.teachingGroupId ?? "");
  const [roomId, setRoomId] = useState(initial.roomId ?? "");
  const [timeSlotId, setTimeSlotId] = useState(initial.timeSlotId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(initial.id);
  const selectedGroup = options.teachingGroups.find((group) => group.id === teachingGroupId);

  const clientConflicts = useMemo(() => {
    if (!teachingGroupId || !roomId || !timeSlotId || !selectedGroup?.teacherId) return [];

    return conflictsForPlacement(
      { id: initial.id, teachingGroupId, teacherId: selectedGroup.teacherId, roomId, timeSlotId },
      candidates,
      memberships,
    );
  }, [teachingGroupId, roomId, timeSlotId, selectedGroup, candidates, memberships, initial.id]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await placeScheduleEntry({ id: initial.id, teachingGroupId, roomId, timeSlotId });

        if (result.status === "conflict") {
          setFormError(result.conflicts.join(" "));
          return;
        }

        if (result.status === "error") {
          setFormError(result.message);
          return;
        }

        onSaved(result.warning);
      } catch { setFormError(tForm("genericError")); router.refresh(); }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? t("board.editTitle") : t("board.placeTitle")}</DialogTitle>
        <DialogDescription>
          {academicYear ? t("board.placeDescription", { year: academicYear }) : null}
        </DialogDescription>
      </DialogHeader>

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {formError}
        </p>
      ) : null}

      {clientConflicts.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-warning bg-warning-surface p-3 text-sm text-warning">
          {clientConflicts.map((conflict, index) => (
            <p key={index} className="flex items-start gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
              {describeClientConflict(conflict, teachingGroupId, options, t)}
            </p>
          ))}
        </div>
      ) : null}

      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <SelectField
          label={t("board.fields.teachingGroupId")}
          disabled={isPending}
          value={teachingGroupId}
          onValueChange={setTeachingGroupId}
          options={options.teachingGroups.map((group) => ({
            value: group.id,
            label: `${group.name} — ${group.subjectName}`,
          }))}
        />
        <SelectField
          label={t("board.fields.roomId")}
          disabled={isPending}
          value={roomId}
          onValueChange={setRoomId}
          options={options.rooms.map((room) => ({ value: room.id, label: room.name }))}
        />
        <SelectField
          label={t("board.fields.timeSlotId")}
          disabled={isPending}
          value={timeSlotId}
          onValueChange={setTimeSlotId}
          options={options.timeSlots.map((slot) => ({
            value: slot.id,
            label: `${tAcademic(`dayOfWeek.${slot.dayOfWeek}`)} ${slot.startTime}–${slot.endTime}`,
          }))}
        />
      </form>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onClose}>
          {tForm("cancel")}
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={isPending || !teachingGroupId || !roomId || !timeSlotId || clientConflicts.length > 0}
        >
          {isPending ? tForm("saving") : tForm("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: ReadonlyArray<{ value: string; label: string }>;
  readonly disabled?: boolean;
}) {
  const t = useTranslations("form");
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Select disabled={disabled} value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="h-12 min-w-48">
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
