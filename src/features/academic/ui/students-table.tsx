"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { StudentRow } from "@/features/academic/data/students";
import { useLocaleFormatter } from "@/i18n/use-locale-formatter";

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const t = useTranslations("students");
  const format = useLocaleFormatter();

  const columns = useMemo<DataTableColumn<StudentRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: t("columns.number"),
        meta: { label: t("columns.number") },
      },
      {
        accessorKey: "name",
        header: t("columns.name"),
        meta: { label: t("columns.name") },
      },
      {
        accessorKey: "classGroup",
        header: t("columns.classGroup"),
        meta: { label: t("columns.classGroup") },
      },
      {
        accessorKey: "studyPath",
        header: t("columns.studyPath"),
        meta: { label: t("columns.studyPath") },
        // O percurso vem da matrícula, não da turma: é esta coluna que torna visível que
        // dois colegas de carteira seguem programas diferentes.
        cell: ({ row }) => <Badge tone="brand">{row.original.studyPath}</Badge>,
      },
      {
        accessorKey: "gender",
        header: t("columns.gender"),
        meta: { label: t("columns.gender") },
        cell: ({ row }) => t(`gender.${row.original.gender}`),
      },
      {
        accessorKey: "birthDate",
        header: t("columns.birthDate"),
        meta: { label: t("columns.birthDate") },
        cell: ({ row }) =>
          format.dateTime(new Date(row.original.birthDate), "short"),
      },
      {
        accessorKey: "guardian",
        header: t("columns.guardian"),
        meta: { label: t("columns.guardian") },
        cell: ({ row }) =>
          row.original.guardian ?? (
            <span className="text-muted-foreground">{t("noGuardian")}</span>
          ),
      },
    ],
    [t, format],
  );

  return (
    <DataTable
      label={t("tableLabel")}
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      enableSelection
      emptyTitle={t("empty")}
      emptyHint={t("emptyHint")}
      pageSize={15}
    />
  );
}
