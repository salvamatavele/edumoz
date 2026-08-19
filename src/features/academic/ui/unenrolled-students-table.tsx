"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { EnrollmentOptions, UnenrolledStudentRow } from "@/features/academic/data/enrollments";
import { EnrollStudentButton } from "@/features/academic/ui/enroll-student-button";
import { useLocaleFormatter } from "@/i18n/use-locale-formatter";

interface UnenrolledStudentsTableProps {
  rows: UnenrolledStudentRow[];
  options: EnrollmentOptions;
}

export function UnenrolledStudentsTable({ rows, options }: UnenrolledStudentsTableProps) {
  const t = useTranslations("students");
  const format = useLocaleFormatter();

  const columns = useMemo<DataTableColumn<UnenrolledStudentRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("columns.number"),
        meta: { label: t("columns.number") },
      },
      {
        accessorKey: "name",
        header: t("columns.name"),
        meta: { label: t("columns.name") },
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
        cell: ({ row }) => format.dateTime(new Date(row.original.birthDate), "short"),
      },
      {
        id: "actions",
        header: t("enroll.columns.actions"),
        meta: { label: t("enroll.columns.actions") },
        cell: ({ row }) => (
          <EnrollStudentButton
            studentId={row.original.id}
            studentName={row.original.name}
            options={options}
          />
        ),
      },
    ],
    [t, format, options],
  );

  return (
    <DataTable
      label={t("enroll.tableLabel")}
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      emptyTitle={t("enroll.empty")}
      pageSize={15}
    />
  );
}
