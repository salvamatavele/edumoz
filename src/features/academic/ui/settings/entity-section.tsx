"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DefaultValues, FieldValues } from "react-hook-form";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { FormActionResult, FormDefinition } from "@/components/form/field-schema";
import { FormModal } from "@/components/form/form-modal";
import { Button } from "@/components/ui/button";

interface EntitySectionProps<TRow, TValues extends FieldValues> {
  readonly subtitle: string;
  readonly tableLabel: string;
  readonly columns: DataTableColumn<TRow>[];
  readonly rows: readonly TRow[];
  readonly getRowId: (row: TRow) => string;
  readonly emptyTitle: string;
  readonly emptyHint?: string;

  readonly createTrigger: string;
  readonly createTitle: string;
  readonly createDescription?: string;
  readonly definition: FormDefinition<TValues>;
  readonly defaultValues: DefaultValues<TValues>;
  readonly onSubmit: (values: TValues) => Promise<FormActionResult<TValues>>;

  /**
   * Quando não nulo, o botão "Adicionar" não aparece — em vez disso, este texto explica
   * o que falta criar primeiro. Mesmo tratamento que `/alunos` já dá à ausência de ano
   * lectivo activo: nenhum formulário aberto sobre uma lista vazia de opções.
   */
  readonly missingDependencyReason?: string | null;
}

/**
 * Secção genérica de uma entidade — dentro de um separador (`Tabs`), tabela + botão que
 * abre um `FormModal`. Reutilizada por todas as entidades de campos simples (`GradeLevel`,
 * `Section`, `Subject`, `ClassGroup`, `Teacher`, `StudyPath`, `CurriculumSubject`,
 * `TeachingGroup`) para não repetir a mesma composição oito vezes. `AssessmentScheme`, com
 * a sua lista aninhada de componentes, não cabe nesta forma — tem o seu próprio componente.
 *
 * Sem título próprio: o separador já diz que entidade é esta — repeti-lo aqui seria o
 * mesmo texto duas vezes seguidas. A tabela vive dentro de um cartão (`bg-surface`,
 * moldura) para se destacar do fundo da página, em vez de flutuar solta.
 */
export function EntitySection<TRow, TValues extends FieldValues>({
  subtitle,
  tableLabel,
  columns,
  rows,
  getRowId,
  emptyTitle,
  emptyHint,
  createTrigger,
  createTitle,
  createDescription,
  definition,
  defaultValues,
  onSubmit,
  missingDependencyReason,
}: EntitySectionProps<TRow, TValues>) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("form");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">{subtitle}</p>

        {missingDependencyReason ? (
          <p className="text-sm text-muted-foreground">{missingDependencyReason}</p>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" strokeWidth={1.75} />
            {createTrigger}
          </Button>
        )}
      </div>

      <DataTable
        label={tableLabel}
        columns={columns}
        data={rows as TRow[]}
        getRowId={getRowId}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        pageSize={10}
      />

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={createTitle}
        description={createDescription}
        definition={definition}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        submitLabel={t("save")}
      />
    </section>
  );
}
