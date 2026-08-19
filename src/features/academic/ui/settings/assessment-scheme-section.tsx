"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import { type Resolver, useFieldArray, useForm } from "react-hook-form";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAssessmentScheme } from "@/features/academic/actions/create-assessment-scheme";
import type { AssessmentSchemeOptions, AssessmentSchemeRow } from "@/features/academic/data/assessment-schemes";
import {
  createAssessmentSchemeSchema,
  type CreateAssessmentSchemeInput,
} from "@/features/academic/domain/assessment-scheme-schema";
import { AssessmentRegime, ComponentType, RoundingMode } from "@/types";

interface AssessmentSchemeSectionProps {
  readonly rows: readonly AssessmentSchemeRow[];
  readonly academicYear: string | null;
  readonly options: AssessmentSchemeOptions;
}

const DEFAULT_VALUES: CreateAssessmentSchemeInput = {
  name: "",
  gradeLevelId: "none",
  subjectId: "none",
  regime: AssessmentRegime.WITH_ASSESSMENT,
  scaleMin: 0,
  scaleMax: 20,
  passMark: 10,
  roundingMode: RoundingMode.HALF_UP,
  decimalPlaces: 2,
  hasExam: false,
  examWeight: 0,
  minGradeForExam: undefined,
  exemptionGrade: undefined,
  minExamGrade: undefined,
  components: [{ code: "AC", name: "", type: ComponentType.CONTINUOUS, weight: 0.4, minGrade: undefined }],
};

/**
 * Esquema de avaliação — a única entidade desta secção cuja forma ("esquema + lista de
 * componentes") o `FormModal` genérico não cobre. Reutiliza o mesmo esquema Zod e a mesma
 * Server Action, mas com o seu próprio formulário: `useFieldArray` para os componentes,
 * que `FieldDefinition` (`components/form/field-schema.ts`) não descreve.
 */
export function AssessmentSchemeSection({ rows, academicYear, options }: AssessmentSchemeSectionProps) {
  const t = useTranslations("assessmentSchemes");
  const tCommon = useTranslations("common");
  const tAcademic = useTranslations("academic");
  const [open, setOpen] = useState(false);

  const columns = useMemo<DataTableColumn<AssessmentSchemeRow>[]>(
    () => [
      { accessorKey: "name", header: t("columns.name"), meta: { label: t("columns.name") } },
      { accessorKey: "version", header: t("columns.version"), meta: { label: t("columns.version") } },
      {
        accessorKey: "regime",
        header: t("columns.regime"),
        meta: { label: t("columns.regime") },
        cell: ({ row }) => t(`regime.${row.original.regime}`),
      },
      {
        accessorKey: "gradeLevel",
        header: t("columns.gradeLevel"),
        meta: { label: t("columns.gradeLevel") },
        cell: ({ row }) => row.original.gradeLevel ?? t("generalScheme"),
      },
      {
        accessorKey: "subject",
        header: t("columns.subject"),
        meta: { label: t("columns.subject") },
        cell: ({ row }) => row.original.subject ?? t("generalScheme"),
      },
      {
        accessorKey: "hasExam",
        header: t("columns.hasExam"),
        meta: { label: t("columns.hasExam") },
        cell: ({ row }) => tAcademic(row.original.hasExam ? "yes" : "no"),
      },
      {
        accessorKey: "componentCount",
        header: t("columns.componentCount"),
        meta: { label: t("columns.componentCount") },
      },
    ],
    [t, tAcademic],
  );

  const missingDependencyReason = !options.hasActiveAcademicYear ? tCommon("noActiveYear") : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-end gap-4">
        {missingDependencyReason ? (
          <p className="text-sm text-muted-foreground">{missingDependencyReason}</p>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" strokeWidth={1.75} />
            {t("create.trigger")}
          </Button>
        )}
      </div>

      <DataTable
        label={t("tableLabel")}
        columns={columns}
        data={rows as AssessmentSchemeRow[]}
        getRowId={(row) => row.id}
        emptyTitle={t("empty")}
        emptyHint={academicYear ? t("emptyHint") : tCommon("noActiveYear")}
        pageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {open ? <AssessmentSchemeForm options={options} onOpenChange={setOpen} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AssessmentSchemeForm({
  options,
  onOpenChange,
}: {
  readonly options: AssessmentSchemeOptions;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("assessmentSchemes");
  const tForm = useTranslations("form");
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateAssessmentSchemeInput>({
    // Mesmo desajuste que `FormModal` já trata: `z.coerce.number()` faz a entrada e a
    // saída do esquema divergirem (`unknown` vs `number`), e o `zodResolver` é tipado
    // para a entrada. O contrato real está garantido por `CreateAssessmentSchemeInput`.
    resolver: zodResolver(createAssessmentSchemeSchema) as Resolver<CreateAssessmentSchemeInput>,
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "components" });
  const hasExam = form.watch("hasExam");

  function handleSubmit(values: CreateAssessmentSchemeInput) {
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await createAssessmentScheme(values);

        if (result.status === "success") {
          onOpenChange(false);
          return;
        }

        setFormError(result.fieldErrors?.components ?? result.message ?? tForm("genericError"));
      } catch {
        setFormError(tForm("genericError"));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("create.title")}</DialogTitle>
        <DialogDescription>{t("create.description")}</DialogDescription>
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

      <form id={formId} noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("create.fields.name")}
            required
            disabled={isPending}
            error={form.formState.errors.name?.message}
            {...form.register("name")}
          />

          <SelectField
            label={t("create.fields.gradeLevelId")}
            disabled={isPending}
            value={form.watch("gradeLevelId") ?? "none"}
            onValueChange={(value) => form.setValue("gradeLevelId", value, { shouldDirty: true })}
            options={[
              { value: "none", label: t("generalScheme") },
              ...options.gradeLevels.map((option) => ({ value: option.id, label: option.name })),
            ]}
          />

          <SelectField
            label={t("create.fields.subjectId")}
            disabled={isPending}
            value={form.watch("subjectId") ?? "none"}
            onValueChange={(value) => form.setValue("subjectId", value, { shouldDirty: true })}
            options={[
              { value: "none", label: t("generalScheme") },
              ...options.subjects.map((option) => ({ value: option.id, label: option.name })),
            ]}
          />

          <SelectField
            label={t("create.fields.regime")}
            disabled={isPending}
            value={form.watch("regime")}
            onValueChange={(value) => form.setValue("regime", value as CreateAssessmentSchemeInput["regime"], { shouldDirty: true })}
            options={Object.values(AssessmentRegime).map((regime) => ({ value: regime, label: t(`regime.${regime}`) }))}
          />

          <Input
            label={t("create.fields.scaleMin")}
            type="number"
            step="any"
            required
            disabled={isPending}
            error={form.formState.errors.scaleMin?.message}
            {...form.register("scaleMin", { valueAsNumber: true })}
          />
          <Input
            label={t("create.fields.scaleMax")}
            type="number"
            step="any"
            required
            disabled={isPending}
            error={form.formState.errors.scaleMax?.message}
            {...form.register("scaleMax", { valueAsNumber: true })}
          />
          <Input
            label={t("create.fields.passMark")}
            type="number"
            step="any"
            required
            disabled={isPending}
            error={form.formState.errors.passMark?.message}
            {...form.register("passMark", { valueAsNumber: true })}
          />

          <SelectField
            label={t("create.fields.roundingMode")}
            disabled={isPending}
            value={form.watch("roundingMode")}
            onValueChange={(value) =>
              form.setValue("roundingMode", value as CreateAssessmentSchemeInput["roundingMode"], { shouldDirty: true })
            }
            options={Object.values(RoundingMode).map((mode) => ({ value: mode, label: t(`roundingMode.${mode}`) }))}
          />

          <Input
            label={t("create.fields.decimalPlaces")}
            type="number"
            required
            disabled={isPending}
            error={form.formState.errors.decimalPlaces?.message}
            {...form.register("decimalPlaces", { valueAsNumber: true })}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border-strong p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${formId}-hasExam`}
              disabled={isPending}
              checked={hasExam}
              onCheckedChange={(value) => form.setValue("hasExam", !!value, { shouldDirty: true })}
            />
            <Label htmlFor={`${formId}-hasExam`}>{t("create.fields.hasExam")}</Label>
          </div>
          <p className="text-sm text-muted-foreground">{t("create.examWarning")}</p>

          {hasExam ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("create.fields.examWeight")}
                type="number"
                step="any"
                disabled={isPending}
                error={form.formState.errors.examWeight?.message}
                {...form.register("examWeight", { valueAsNumber: true })}
              />
              <Input
                label={t("create.fields.minGradeForExam")}
                type="number"
                step="any"
                disabled={isPending}
                helperText={tForm("optional")}
                {...form.register("minGradeForExam", { valueAsNumber: true })}
              />
              <Input
                label={t("create.fields.exemptionGrade")}
                type="number"
                step="any"
                disabled={isPending}
                helperText={tForm("optional")}
                {...form.register("exemptionGrade", { valueAsNumber: true })}
              />
              <Input
                label={t("create.fields.minExamGrade")}
                type="number"
                step="any"
                disabled={isPending}
                helperText={tForm("optional")}
                {...form.register("minExamGrade", { valueAsNumber: true })}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">{t("create.components.title")}</h4>
              <p className="text-sm text-muted-foreground">{t("create.components.hint")}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() =>
                append({ code: "", name: "", type: ComponentType.TEST, weight: 0, minGrade: undefined })
              }
            >
              <Plus aria-hidden="true" strokeWidth={1.75} />
              {t("create.components.add")}
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid items-end gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_2fr_1.5fr_1fr_1fr_auto]">
              <Input
                label={t("create.components.code")}
                disabled={isPending}
                error={form.formState.errors.components?.[index]?.code?.message}
                {...form.register(`components.${index}.code`)}
              />
              <Input
                label={t("create.components.name")}
                disabled={isPending}
                error={form.formState.errors.components?.[index]?.name?.message}
                {...form.register(`components.${index}.name`)}
              />
              <SelectField
                label={t("create.components.type")}
                disabled={isPending}
                value={form.watch(`components.${index}.type`)}
                onValueChange={(value) =>
                  form.setValue(`components.${index}.type`, value as CreateAssessmentSchemeInput["components"][number]["type"], {
                    shouldDirty: true,
                  })
                }
                options={Object.values(ComponentType).map((type) => ({ value: type, label: t(`componentType.${type}`) }))}
              />
              <Input
                label={t("create.components.weight")}
                type="number"
                step="any"
                disabled={isPending}
                error={form.formState.errors.components?.[index]?.weight?.message}
                {...form.register(`components.${index}.weight`, { valueAsNumber: true })}
              />
              <Input
                label={t("create.components.minGrade")}
                type="number"
                step="any"
                disabled={isPending}
                {...form.register(`components.${index}.minGrade`, { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending || fields.length <= 1}
                aria-label={t("create.components.remove")}
                onClick={() => remove(index)}
              >
                <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Button>
            </div>
          ))}
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
          {tForm("cancel")}
        </Button>
        <Button type="submit" form={formId} disabled={isPending}>
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
      <Label htmlFor={id}>{label}</Label>
      <Select disabled={disabled} value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="h-12">
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
