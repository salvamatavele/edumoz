"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { DefaultValues } from "react-hook-form";

import type { DataTableColumn } from "@/components/data-table/data-table";
import type { FieldDefinition } from "@/components/form/field-schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTeacher } from "@/features/academic/actions/create-teacher";
import { createTeachingGroup } from "@/features/academic/actions/create-teaching-group";
import type { TeacherRow, TeachingGroupRow, TeachingStaffOptions } from "@/features/academic/data/teaching-staff";
import {
  createTeacherSchema,
  type CreateTeacherInput,
  createTeachingGroupSchema,
  type CreateTeachingGroupInput,
} from "@/features/academic/domain/teaching-staff-schema";
import { EntitySection } from "@/features/academic/ui/settings/entity-section";
import { SubjectScope } from "@/types";

interface TeachingStaffPanelProps {
  readonly canCreate?: boolean;
  readonly teachers: readonly TeacherRow[];
  readonly teachingGroups: { readonly rows: readonly TeachingGroupRow[]; readonly academicYear: string | null };
  readonly options: TeachingStaffOptions;
}

export function TeachingStaffPanel({ teachers, teachingGroups, options, canCreate = true }: TeachingStaffPanelProps) {
  const t = useTranslations("teachingStaff");
  const tForm = useTranslations("form");

  const teacherColumns = useMemo<DataTableColumn<TeacherRow>[]>(
    () => [
      { accessorKey: "code", header: t("teachers.columns.code"), meta: { label: t("teachers.columns.code") } },
      { accessorKey: "name", header: t("teachers.columns.name"), meta: { label: t("teachers.columns.name") } },
      {
        accessorKey: "phone",
        header: t("teachers.columns.phone"),
        meta: { label: t("teachers.columns.phone") },
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "qualification",
        header: t("teachers.columns.qualification"),
        meta: { label: t("teachers.columns.qualification") },
        cell: ({ row }) => row.original.qualification ?? "—",
      },
      {
        accessorKey: "maxWeeklyHours",
        header: t("teachers.columns.maxWeeklyHours"),
        meta: { label: t("teachers.columns.maxWeeklyHours") },
        cell: ({ row }) => row.original.maxWeeklyHours ?? "—",
      },
      {
        accessorKey: "hasLoginAccess",
        header: t("teachers.columns.hasLoginAccess"),
        meta: { label: t("teachers.columns.hasLoginAccess") },
        cell: ({ row }) => t(row.original.hasLoginAccess ? "loginAccess.yes" : "loginAccess.no"),
      },
    ],
    [t],
  );

  const teacherFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateTeacherInput, string>>> = [
    { name: "code", kind: "text", label: t("teachers.create.fields.code"), required: true, autoFocus: true },
    { name: "firstName", kind: "text", label: t("teachers.create.fields.firstName"), required: true },
    { name: "lastName", kind: "text", label: t("teachers.create.fields.lastName"), required: true },
    { name: "phone", kind: "tel", label: t("teachers.create.fields.phone"), helperText: tForm("optional") },
    { name: "email", kind: "email", label: t("teachers.create.fields.email"), helperText: tForm("optional") },
    {
      name: "qualification",
      kind: "text",
      label: t("teachers.create.fields.qualification"),
      helperText: tForm("optional"),
    },
    {
      name: "maxWeeklyHours",
      kind: "number",
      label: t("teachers.create.fields.maxWeeklyHours"),
      helperText: tForm("optional"),
    },
  ];

  const teachingGroupColumns = useMemo<DataTableColumn<TeachingGroupRow>[]>(
    () => [
      { accessorKey: "name", header: t("teachingGroups.columns.name"), meta: { label: t("teachingGroups.columns.name") } },
      {
        accessorKey: "subject",
        header: t("teachingGroups.columns.subject"),
        meta: { label: t("teachingGroups.columns.subject") },
      },
      {
        accessorKey: "teacher",
        header: t("teachingGroups.columns.teacher"),
        meta: { label: t("teachingGroups.columns.teacher") },
        cell: ({ row }) => row.original.teacher ?? "—",
      },
      {
        accessorKey: "classGroup",
        header: t("teachingGroups.columns.classGroup"),
        meta: { label: t("teachingGroups.columns.classGroup") },
        cell: ({ row }) => row.original.classGroup ?? t("teachingGroups.noClassGroup"),
      },
      {
        accessorKey: "scope",
        header: t("teachingGroups.columns.scope"),
        meta: { label: t("teachingGroups.columns.scope") },
        cell: ({ row }) => t(`scope.${row.original.scope}`),
      },
    ],
    [t],
  );

  const teachingGroupFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateTeachingGroupInput, string>>> = [
    { name: "name", kind: "text", label: t("teachingGroups.create.fields.name"), required: true, autoFocus: true },
    {
      name: "subjectId",
      kind: "select",
      label: t("teachingGroups.create.fields.subjectId"),
      required: true,
      options: options.subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    },
    {
      name: "teacherId",
      kind: "select",
      label: t("teachingGroups.create.fields.teacherId"),
      required: true,
      options: options.teachers.map((teacher) => ({ value: teacher.id, label: teacher.name })),
    },
    {
      name: "classGroupId",
      kind: "select",
      label: t("teachingGroups.create.fields.classGroupId"),
      options: [
        { value: "none", label: t("teachingGroups.noClassGroup") },
        ...options.classGroups.map((group) => ({ value: group.id, label: group.name })),
      ],
    },
    {
      name: "scope",
      kind: "select",
      label: t("teachingGroups.create.fields.scope"),
      required: true,
      options: Object.values(SubjectScope).map((scope) => ({ value: scope, label: t(`scope.${scope}`) })),
    },
  ];

  return (
    <Tabs defaultValue="teachers">
      <TabsList>
        <TabsTrigger value="teachers">{t("tabs.teachers")}</TabsTrigger>
        <TabsTrigger value="teachingGroups">{t("tabs.teachingGroups")}</TabsTrigger>
      </TabsList>

      <TabsContent value="teachers">
      <EntitySection<TeacherRow, CreateTeacherInput>
        canCreate={canCreate}
        subtitle={t("teachers.subtitle")}
        tableLabel={t("teachers.tableLabel")}
        columns={teacherColumns}
        rows={teachers}
        getRowId={(row) => row.id}
        emptyTitle={t("teachers.empty")}
        emptyHint={t("teachers.emptyHint")}
        createTrigger={t("teachers.create.trigger")}
        createTitle={t("teachers.create.title")}
        createDescription={t("teachers.create.description")}
        definition={{ schema: createTeacherSchema, fields: teacherFields }}
        defaultValues={{
          code: "",
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          qualification: "",
        }}
        onSubmit={createTeacher}
      />
      </TabsContent>

      <TabsContent value="teachingGroups">
      <EntitySection<TeachingGroupRow, CreateTeachingGroupInput>
        canCreate={canCreate}
        subtitle={t("teachingGroups.subtitle")}
        tableLabel={t("teachingGroups.tableLabel")}
        columns={teachingGroupColumns}
        rows={teachingGroups.rows}
        getRowId={(row) => row.id}
        emptyTitle={t("teachingGroups.empty")}
        emptyHint={t("teachingGroups.emptyHint")}
        createTrigger={t("teachingGroups.create.trigger")}
        createTitle={t("teachingGroups.create.title")}
        createDescription={t("teachingGroups.create.description")}
        definition={{ schema: createTeachingGroupSchema, fields: teachingGroupFields }}
        defaultValues={
          {
            name: "",
            subjectId: "",
            teacherId: "",
            classGroupId: "none",
            scope: "",
          } as unknown as DefaultValues<CreateTeachingGroupInput>
        }
        onSubmit={createTeachingGroup}
        missingDependencyReason={
          options.subjects.length === 0
            ? t("teachingGroups.missingSubject")
            : options.teachers.length === 0
              ? t("teachingGroups.missingTeacher")
              : null
        }
      />
      </TabsContent>
    </Tabs>
  );
}
