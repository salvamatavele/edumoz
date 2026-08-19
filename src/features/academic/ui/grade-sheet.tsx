"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordGrades } from "@/features/academic/actions/record-grades";
import type { AssessmentSchemeDefinition, GradeEntry, ResultNote } from "@/features/academic/domain/assessment";
import { computeSubjectResult } from "@/features/academic/domain/grade-engine";
import { toDecimal } from "@/features/shared/domain/numeric";
import { useRouter } from "@/i18n/navigation";

/** Forma serializável do esquema — atravessa a fronteira servidor→cliente como texto, não
 * como instâncias de `Decimal` (que não são serializáveis pelo React Server Components). */
export interface SerializedScheme {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly regime: AssessmentSchemeDefinition["regime"];
  readonly scaleMin: string;
  readonly scaleMax: string;
  readonly passMark: string;
  readonly roundingMode: AssessmentSchemeDefinition["roundingMode"];
  readonly decimalPlaces: number;
  readonly hasExam: boolean;
  readonly examWeight: string;
  readonly minGradeForExam: string | null;
  readonly exemptionGrade: string | null;
  readonly minExamGrade: string | null;
  readonly components: ReadonlyArray<{
    readonly code: string;
    readonly name: string;
    readonly type: AssessmentSchemeDefinition["components"][number]["type"];
    readonly weight: string;
    readonly minGrade: string | null;
    readonly order: number;
  }>;
}

function toDefinition(scheme: SerializedScheme): AssessmentSchemeDefinition {
  return {
    id: scheme.id,
    version: scheme.version,
    name: scheme.name,
    regime: scheme.regime,
    scaleMin: toDecimal(scheme.scaleMin),
    scaleMax: toDecimal(scheme.scaleMax),
    passMark: toDecimal(scheme.passMark),
    roundingMode: scheme.roundingMode,
    decimalPlaces: scheme.decimalPlaces,
    hasExam: scheme.hasExam,
    examWeight: toDecimal(scheme.examWeight),
    minGradeForExam: scheme.minGradeForExam ? toDecimal(scheme.minGradeForExam) : null,
    exemptionGrade: scheme.exemptionGrade ? toDecimal(scheme.exemptionGrade) : null,
    minExamGrade: scheme.minExamGrade ? toDecimal(scheme.minExamGrade) : null,
    components: scheme.components.map((component) => ({
      code: component.code,
      name: component.name,
      type: component.type,
      weight: toDecimal(component.weight),
      minGrade: component.minGrade ? toDecimal(component.minGrade) : null,
      order: component.order,
    })),
  };
}

export interface GradeSheetEntry {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly score: string | null;
  readonly isAbsent: boolean;
  readonly otherEntries: readonly GradeEntry[];
}

interface GradeSheetProps {
  readonly assessment: {
    readonly id: string;
    readonly name: string;
    readonly componentCode: string;
    readonly maxScore: string;
    readonly weight: string;
  };
  readonly teachingGroupName: string;
  readonly subjectName: string;
  readonly scheme: SerializedScheme;
  readonly initialEntries: readonly GradeSheetEntry[];
  /**
   * Verdadeiro quando quem vê não lecciona este agrupamento — visível por dirigir a turma
   * (ver `TeacherTeachingGroupOption.isOwn`, `grades.ts`). Só consulta: `recordGrades`
   * recusaria de qualquer forma, mas esconder a edição evita um envio que falha calado.
   */
  readonly readOnly?: boolean;
}

interface RowState {
  readonly enrollmentId: string;
  readonly score: string;
  readonly isAbsent: boolean;
}

/**
 * Grelha de lançamento — molde de `attendance-sheet.tsx`: estado local (`useState`), não
 * `useOptimistic` (mesmo motivo: alternar não deve reverter antes de um submeter
 * explícito). A média por aluno usa `computeSubjectResult`, o MESMO motor que o servidor —
 * nunca uma segunda implementação da fórmula aqui.
 */
export function GradeSheet({
  assessment,
  teachingGroupName,
  subjectName,
  scheme,
  initialEntries,
  readOnly = false,
}: GradeSheetProps) {
  const t = useTranslations("gradeEntry");
  const tNotes = useTranslations("gradeEntry.notes");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly RowState[]>(
    initialEntries.map((entry) => ({
      enrollmentId: entry.enrollmentId,
      score: entry.score ?? "",
      isAbsent: entry.isAbsent,
    })),
  );

  const definition = useMemo(() => toDefinition(scheme), [scheme]);
  const entriesByEnrollment = useMemo(
    () => new Map(initialEntries.map((entry) => [entry.enrollmentId, entry])),
    [initialEntries],
  );

  function updateRow(enrollmentId: string, patch: Partial<Omit<RowState, "enrollmentId">>) {
    if (isPending || readOnly) return;
    setRows((state) => state.map((row) => (row.enrollmentId === enrollmentId ? { ...row, ...patch } : row)));
  }

  function computeRowResult(row: RowState) {
    const initial = entriesByEnrollment.get(row.enrollmentId);
    if (!initial) return null;

    const currentEntry: GradeEntry = {
      componentCode: assessment.componentCode,
      score: row.isAbsent || row.score.trim() === "" ? null : row.score,
      maxScore: assessment.maxScore,
      weight: assessment.weight,
      isAbsent: row.isAbsent,
    };

    return computeSubjectResult(definition, [...initial.otherEntries, currentEntry]);
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const changes = rows
        .filter((row) => {
          const initial = entriesByEnrollment.get(row.enrollmentId);
          const initialScore = initial?.score ?? "";
          return initialScore !== row.score || (initial?.isAbsent ?? false) !== row.isAbsent;
        })
        .map((row) => ({
          enrollmentId: row.enrollmentId,
          score: row.isAbsent || row.score.trim() === "" ? undefined : Number(row.score),
          isAbsent: row.isAbsent,
        }));

      const result = await recordGrades({ assessmentId: assessment.id, changes });

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
        <p className="text-muted-foreground">{assessment.name}</p>
      </div>

      {readOnly ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          {t("headTeacherReadOnlyNotice")}
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

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const initial = entriesByEnrollment.get(row.enrollmentId);
          const result = computeRowResult(row);

          return (
            <li
              key={row.enrollmentId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-medium text-foreground">{initial?.studentName}</span>
                {result ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {t("average")}: {result.average?.toString() ?? "—"}
                    </span>
                    {result.notes.map((note, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-warning-surface px-2 py-0.5 text-xs text-warning"
                      >
                        {describeNote(note, tNotes)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <Input
                  hideLabel
                  label={t("scoreLabel", { name: initial?.studentName ?? "" })}
                  type="number"
                  min={0}
                  max={Number(assessment.maxScore)}
                  step="any"
                  className="w-24"
                  disabled={row.isAbsent || isPending || readOnly}
                  value={row.score}
                  onChange={(event) => updateRow(row.enrollmentId, { score: event.target.value })}
                />

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`absent-${row.enrollmentId}`}
                    disabled={isPending || readOnly}
                    checked={row.isAbsent}
                    onCheckedChange={(checked) => updateRow(row.enrollmentId, { isAbsent: !!checked })}
                  />
                  <Label htmlFor={`absent-${row.enrollmentId}`}>{t("absent")}</Label>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!readOnly ? (
        <Button type="button" size="lg" onClick={handleSubmit} disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      ) : null}
    </div>
  );
}

function describeNote(note: ResultNote, t: ReturnType<typeof useTranslations>): string {
  switch (note.kind) {
    case "COMPONENT_WITHOUT_GRADES":
      return t("componentWithoutGrades", { component: note.componentCode });
    case "WEIGHTS_RENORMALISED":
      return t("weightsRenormalised");
    case "BELOW_COMPONENT_MINIMUM":
      return t("belowComponentMinimum", { component: note.componentCode });
    case "EXEMPT_FROM_EXAM":
      return t("exemptFromExam");
    case "NOT_ADMITTED_TO_EXAM":
      return t("notAdmittedToExam");
    case "BELOW_EXAM_MINIMUM":
      return t("belowExamMinimum");
    case "NO_GRADES_AT_ALL":
      return t("noGradesAtAll");
  }
}
