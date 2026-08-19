"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { DefaultValues } from "react-hook-form";

import type { DataTableColumn } from "@/components/data-table/data-table";
import type { FieldDefinition } from "@/components/form/field-schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClassGroup } from "@/features/academic/actions/create-class-group";
import { createCurriculumSubject } from "@/features/academic/actions/create-curriculum-subject";
import { createGradeLevel } from "@/features/academic/actions/create-grade-level";
import { createRoom } from "@/features/academic/actions/create-room";
import { createSection } from "@/features/academic/actions/create-section";
import { createStudyPath } from "@/features/academic/actions/create-study-path";
import { createSubject } from "@/features/academic/actions/create-subject";
import { createTimeSlot } from "@/features/academic/actions/create-time-slot";
import type {
  AcademicStructureOptions,
  ClassGroupRow,
  CurriculumSubjectRow,
  GradeLevelRow,
  SectionRow,
  StudyPathRow,
  SubjectRow,
} from "@/features/academic/data/academic-structure";
import type { RoomRow, TimeSlotRow } from "@/features/academic/data/scheduling";
import {
  createClassGroupSchema,
  type CreateClassGroupInput,
  createCurriculumSubjectSchema,
  type CreateCurriculumSubjectInput,
  createGradeLevelSchema,
  type CreateGradeLevelInput,
  createRoomSchema,
  type CreateRoomInput,
  createSectionSchema,
  type CreateSectionInput,
  createStudyPathSchema,
  type CreateStudyPathInput,
  createSubjectSchema,
  type CreateSubjectInput,
  createTimeSlotSchema,
  type CreateTimeSlotInput,
} from "@/features/academic/domain/academic-structure-schema";
import { EntitySection } from "@/features/academic/ui/settings/entity-section";
import { DayOfWeek, RoomKind, SchoolCycle, Shift, SubjectScope } from "@/types";

interface AcademicStructurePanelProps {
  readonly gradeLevels: readonly GradeLevelRow[];
  readonly sections: readonly SectionRow[];
  readonly studyPaths: { readonly rows: readonly StudyPathRow[]; readonly academicYear: string | null };
  readonly subjects: readonly SubjectRow[];
  readonly curriculumSubjects: {
    readonly rows: readonly CurriculumSubjectRow[];
    readonly academicYear: string | null;
  };
  readonly classGroups: { readonly rows: readonly ClassGroupRow[]; readonly academicYear: string | null };
  readonly rooms: readonly RoomRow[];
  readonly timeSlots: { readonly rows: readonly TimeSlotRow[]; readonly academicYear: string | null };
  readonly options: AcademicStructureOptions;
}

export function AcademicStructurePanel({
  gradeLevels,
  sections,
  studyPaths,
  subjects,
  curriculumSubjects,
  classGroups,
  rooms,
  timeSlots,
  options,
}: AcademicStructurePanelProps) {
  const t = useTranslations("academic");
  const tCommon = useTranslations("common");

  const gradeLevelColumns = useMemo<DataTableColumn<GradeLevelRow>[]>(
    () => [
      { accessorKey: "code", header: t("gradeLevels.columns.code"), meta: { label: t("gradeLevels.columns.code") } },
      { accessorKey: "name", header: t("gradeLevels.columns.name"), meta: { label: t("gradeLevels.columns.name") } },
      { accessorKey: "order", header: t("gradeLevels.columns.order"), meta: { label: t("gradeLevels.columns.order") } },
      {
        accessorKey: "cycle",
        header: t("gradeLevels.columns.cycle"),
        meta: { label: t("gradeLevels.columns.cycle") },
        cell: ({ row }) => t(`cycle.${row.original.cycle}`),
      },
      {
        accessorKey: "isExamLevel",
        header: t("gradeLevels.columns.isExamLevel"),
        meta: { label: t("gradeLevels.columns.isExamLevel") },
        cell: ({ row }) => (row.original.isExamLevel ? t("yes") : t("no")),
      },
    ],
    [t],
  );

  const gradeLevelFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateGradeLevelInput, string>>> = [
    { name: "code", kind: "text", label: t("gradeLevels.create.fields.code"), required: true, autoFocus: true },
    { name: "name", kind: "text", label: t("gradeLevels.create.fields.name"), required: true },
    { name: "order", kind: "number", label: t("gradeLevels.create.fields.order"), required: true },
    {
      name: "cycle",
      kind: "select",
      label: t("gradeLevels.create.fields.cycle"),
      required: true,
      options: Object.values(SchoolCycle).map((cycle) => ({ value: cycle, label: t(`cycle.${cycle}`) })),
    },
    { name: "isExamLevel", kind: "checkbox", label: t("gradeLevels.create.fields.isExamLevel"), fullWidth: true },
  ];

  const sectionColumns = useMemo<DataTableColumn<SectionRow>[]>(
    () => [
      { accessorKey: "code", header: t("sections.columns.code"), meta: { label: t("sections.columns.code") } },
      { accessorKey: "name", header: t("sections.columns.name"), meta: { label: t("sections.columns.name") } },
      {
        accessorKey: "description",
        header: t("sections.columns.description"),
        meta: { label: t("sections.columns.description") },
        cell: ({ row }) => row.original.description ?? "—",
      },
    ],
    [t],
  );

  const sectionFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateSectionInput, string>>> = [
    { name: "code", kind: "text", label: t("sections.create.fields.code"), required: true, autoFocus: true },
    { name: "name", kind: "text", label: t("sections.create.fields.name"), required: true },
    { name: "description", kind: "textarea", label: t("sections.create.fields.description"), fullWidth: true },
  ];

  const studyPathColumns = useMemo<DataTableColumn<StudyPathRow>[]>(
    () => [
      { accessorKey: "code", header: t("studyPaths.columns.code"), meta: { label: t("studyPaths.columns.code") } },
      { accessorKey: "name", header: t("studyPaths.columns.name"), meta: { label: t("studyPaths.columns.name") } },
      {
        accessorKey: "gradeLevel",
        header: t("studyPaths.columns.gradeLevel"),
        meta: { label: t("studyPaths.columns.gradeLevel") },
      },
      {
        accessorKey: "section",
        header: t("studyPaths.columns.section"),
        meta: { label: t("studyPaths.columns.section") },
        cell: ({ row }) => row.original.section ?? "—",
      },
    ],
    [t],
  );

  const studyPathFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateStudyPathInput, string>>> = [
    {
      name: "gradeLevelId",
      kind: "select",
      label: t("studyPaths.create.fields.gradeLevelId"),
      required: true,
      options: options.gradeLevels.map((option) => ({ value: option.id, label: option.name })),
    },
    {
      name: "sectionId",
      kind: "select",
      label: t("studyPaths.create.fields.sectionId"),
      options: [
        { value: "none", label: t("studyPaths.noSectionOption") },
        ...options.sections.map((option) => ({ value: option.id, label: option.name })),
      ],
    },
    { name: "name", kind: "text", label: t("studyPaths.create.fields.name"), required: true, fullWidth: true },
  ];

  const subjectColumns = useMemo<DataTableColumn<SubjectRow>[]>(
    () => [
      { accessorKey: "code", header: t("subjects.columns.code"), meta: { label: t("subjects.columns.code") } },
      { accessorKey: "name", header: t("subjects.columns.name"), meta: { label: t("subjects.columns.name") } },
      {
        accessorKey: "shortName",
        header: t("subjects.columns.shortName"),
        meta: { label: t("subjects.columns.shortName") },
        cell: ({ row }) => row.original.shortName ?? "—",
      },
      {
        accessorKey: "area",
        header: t("subjects.columns.area"),
        meta: { label: t("subjects.columns.area") },
        cell: ({ row }) => row.original.area ?? "—",
      },
    ],
    [t],
  );

  const subjectFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateSubjectInput, string>>> = [
    { name: "code", kind: "text", label: t("subjects.create.fields.code"), required: true, autoFocus: true },
    { name: "name", kind: "text", label: t("subjects.create.fields.name"), required: true },
    { name: "shortName", kind: "text", label: t("subjects.create.fields.shortName") },
    { name: "area", kind: "text", label: t("subjects.create.fields.area") },
  ];

  const curriculumSubjectColumns = useMemo<DataTableColumn<CurriculumSubjectRow>[]>(
    () => [
      {
        accessorKey: "studyPath",
        header: t("curriculumSubjects.columns.studyPath"),
        meta: { label: t("curriculumSubjects.columns.studyPath") },
      },
      {
        accessorKey: "subject",
        header: t("curriculumSubjects.columns.subject"),
        meta: { label: t("curriculumSubjects.columns.subject") },
      },
      {
        accessorKey: "scope",
        header: t("curriculumSubjects.columns.scope"),
        meta: { label: t("curriculumSubjects.columns.scope") },
        cell: ({ row }) => t(`scope.${row.original.scope}`),
      },
      {
        accessorKey: "weeklyHours",
        header: t("curriculumSubjects.columns.weeklyHours"),
        meta: { label: t("curriculumSubjects.columns.weeklyHours") },
      },
      {
        accessorKey: "coefficient",
        header: t("curriculumSubjects.columns.coefficient"),
        meta: { label: t("curriculumSubjects.columns.coefficient") },
      },
      {
        accessorKey: "isExamSubject",
        header: t("curriculumSubjects.columns.isExamSubject"),
        meta: { label: t("curriculumSubjects.columns.isExamSubject") },
        cell: ({ row }) => (row.original.isExamSubject ? t("yes") : t("no")),
      },
    ],
    [t],
  );

  const curriculumSubjectFields: ReadonlyArray<
    FieldDefinition<Extract<keyof CreateCurriculumSubjectInput, string>>
  > = [
    {
      name: "studyPathId",
      kind: "select",
      label: t("curriculumSubjects.create.fields.studyPathId"),
      required: true,
      options: studyPaths.rows.map((path) => ({ value: path.id, label: path.name })),
    },
    {
      name: "subjectId",
      kind: "select",
      label: t("curriculumSubjects.create.fields.subjectId"),
      required: true,
      options: subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    },
    {
      name: "scope",
      kind: "select",
      label: t("curriculumSubjects.create.fields.scope"),
      required: true,
      options: Object.values(SubjectScope).map((scope) => ({ value: scope, label: t(`scope.${scope}`) })),
    },
    {
      name: "weeklyHours",
      kind: "number",
      label: t("curriculumSubjects.create.fields.weeklyHours"),
      required: true,
    },
    {
      name: "coefficient",
      kind: "number",
      label: t("curriculumSubjects.create.fields.coefficient"),
      required: true,
    },
    {
      name: "isExamSubject",
      kind: "checkbox",
      label: t("curriculumSubjects.create.fields.isExamSubject"),
      fullWidth: true,
    },
  ];

  const classGroupColumns = useMemo<DataTableColumn<ClassGroupRow>[]>(
    () => [
      { accessorKey: "name", header: t("classGroups.columns.name"), meta: { label: t("classGroups.columns.name") } },
      {
        accessorKey: "shift",
        header: t("classGroups.columns.shift"),
        meta: { label: t("classGroups.columns.shift") },
        cell: ({ row }) => t(`shift.${row.original.shift}`),
      },
      {
        accessorKey: "capacity",
        header: t("classGroups.columns.capacity"),
        meta: { label: t("classGroups.columns.capacity") },
      },
      {
        accessorKey: "headTeacher",
        header: t("classGroups.columns.headTeacher"),
        meta: { label: t("classGroups.columns.headTeacher") },
        cell: ({ row }) => row.original.headTeacher ?? "—",
      },
    ],
    [t],
  );

  const classGroupFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateClassGroupInput, string>>> = [
    { name: "name", kind: "text", label: t("classGroups.create.fields.name"), required: true, autoFocus: true },
    {
      name: "shift",
      kind: "select",
      label: t("classGroups.create.fields.shift"),
      required: true,
      options: Object.values(Shift).map((shift) => ({ value: shift, label: t(`shift.${shift}`) })),
    },
    { name: "capacity", kind: "number", label: t("classGroups.create.fields.capacity"), required: true },
    {
      name: "headTeacherId",
      kind: "select",
      label: t("classGroups.create.fields.headTeacherId"),
      options: [
        { value: "none", label: t("classGroups.noHeadTeacherOption") },
        ...options.teachers.map((option) => ({ value: option.id, label: option.name })),
      ],
    },
  ];

  const roomColumns = useMemo<DataTableColumn<RoomRow>[]>(
    () => [
      { accessorKey: "code", header: t("rooms.columns.code"), meta: { label: t("rooms.columns.code") } },
      { accessorKey: "name", header: t("rooms.columns.name"), meta: { label: t("rooms.columns.name") } },
      { accessorKey: "capacity", header: t("rooms.columns.capacity"), meta: { label: t("rooms.columns.capacity") } },
      {
        accessorKey: "kind",
        header: t("rooms.columns.kind"),
        meta: { label: t("rooms.columns.kind") },
        cell: ({ row }) => t(`roomKind.${row.original.kind}`),
      },
    ],
    [t],
  );

  const roomFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateRoomInput, string>>> = [
    { name: "code", kind: "text", label: t("rooms.create.fields.code"), required: true, autoFocus: true },
    { name: "name", kind: "text", label: t("rooms.create.fields.name"), required: true },
    { name: "capacity", kind: "number", label: t("rooms.create.fields.capacity"), required: true },
    {
      name: "kind",
      kind: "select",
      label: t("rooms.create.fields.kind"),
      required: true,
      options: Object.values(RoomKind).map((kind) => ({ value: kind, label: t(`roomKind.${kind}`) })),
    },
  ];

  const timeSlotColumns = useMemo<DataTableColumn<TimeSlotRow>[]>(
    () => [
      {
        accessorKey: "dayOfWeek",
        header: t("timeSlots.columns.dayOfWeek"),
        meta: { label: t("timeSlots.columns.dayOfWeek") },
        cell: ({ row }) => t(`dayOfWeek.${row.original.dayOfWeek}`),
      },
      { accessorKey: "startTime", header: t("timeSlots.columns.startTime"), meta: { label: t("timeSlots.columns.startTime") } },
      { accessorKey: "endTime", header: t("timeSlots.columns.endTime"), meta: { label: t("timeSlots.columns.endTime") } },
      {
        accessorKey: "shift",
        header: t("timeSlots.columns.shift"),
        meta: { label: t("timeSlots.columns.shift") },
        cell: ({ row }) => t(`shift.${row.original.shift}`),
      },
      { accessorKey: "order", header: t("timeSlots.columns.order"), meta: { label: t("timeSlots.columns.order") } },
    ],
    [t],
  );

  const timeSlotFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateTimeSlotInput, string>>> = [
    {
      name: "dayOfWeek",
      kind: "select",
      label: t("timeSlots.create.fields.dayOfWeek"),
      required: true,
      options: Object.values(DayOfWeek).map((day) => ({ value: day, label: t(`dayOfWeek.${day}`) })),
    },
    {
      name: "shift",
      kind: "select",
      label: t("timeSlots.create.fields.shift"),
      required: true,
      options: Object.values(Shift).map((shift) => ({ value: shift, label: t(`shift.${shift}`) })),
    },
    { name: "startTime", kind: "text", label: t("timeSlots.create.fields.startTime"), required: true, placeholder: "07:00" },
    { name: "endTime", kind: "text", label: t("timeSlots.create.fields.endTime"), required: true, placeholder: "07:45" },
    { name: "order", kind: "number", label: t("timeSlots.create.fields.order"), required: true },
  ];

  return (
    <Tabs defaultValue="gradeLevels">
      <TabsList>
        <TabsTrigger value="gradeLevels">{t("tabs.gradeLevels")}</TabsTrigger>
        <TabsTrigger value="sections">{t("tabs.sections")}</TabsTrigger>
        <TabsTrigger value="studyPaths">{t("tabs.studyPaths")}</TabsTrigger>
        <TabsTrigger value="subjects">{t("tabs.subjects")}</TabsTrigger>
        <TabsTrigger value="curriculumSubjects">{t("tabs.curriculumSubjects")}</TabsTrigger>
        <TabsTrigger value="classGroups">{t("tabs.classGroups")}</TabsTrigger>
        <TabsTrigger value="rooms">{t("tabs.rooms")}</TabsTrigger>
        <TabsTrigger value="timeSlots">{t("tabs.timeSlots")}</TabsTrigger>
      </TabsList>

      <TabsContent value="gradeLevels">
      <EntitySection<GradeLevelRow, CreateGradeLevelInput>
        subtitle={t("gradeLevels.subtitle")}
        tableLabel={t("gradeLevels.tableLabel")}
        columns={gradeLevelColumns}
        rows={gradeLevels}
        getRowId={(row) => row.id}
        emptyTitle={t("gradeLevels.empty")}
        emptyHint={t("gradeLevels.emptyHint")}
        createTrigger={t("gradeLevels.create.trigger")}
        createTitle={t("gradeLevels.create.title")}
        createDescription={t("gradeLevels.create.description")}
        definition={{ schema: createGradeLevelSchema, fields: gradeLevelFields }}
        defaultValues={
          { code: "", name: "", order: gradeLevels.length, cycle: "", isExamLevel: false } as unknown as DefaultValues<CreateGradeLevelInput>
        }
        onSubmit={createGradeLevel}
      />
      </TabsContent>

      <TabsContent value="sections">
      <EntitySection<SectionRow, CreateSectionInput>
        subtitle={t("sections.subtitle")}
        tableLabel={t("sections.tableLabel")}
        columns={sectionColumns}
        rows={sections}
        getRowId={(row) => row.id}
        emptyTitle={t("sections.empty")}
        emptyHint={t("sections.emptyHint")}
        createTrigger={t("sections.create.trigger")}
        createTitle={t("sections.create.title")}
        createDescription={t("sections.create.description")}
        definition={{ schema: createSectionSchema, fields: sectionFields }}
        defaultValues={{ code: "", name: "", description: "" }}
        onSubmit={createSection}
      />
      </TabsContent>

      <TabsContent value="studyPaths">
      <EntitySection<StudyPathRow, CreateStudyPathInput>
        subtitle={t("studyPaths.subtitle")}
        tableLabel={t("studyPaths.tableLabel")}
        columns={studyPathColumns}
        rows={studyPaths.rows}
        getRowId={(row) => row.id}
        emptyTitle={t("studyPaths.empty")}
        emptyHint={t("studyPaths.emptyHint")}
        createTrigger={t("studyPaths.create.trigger")}
        createTitle={t("studyPaths.create.title")}
        createDescription={t("studyPaths.create.description")}
        definition={{ schema: createStudyPathSchema, fields: studyPathFields }}
        defaultValues={{ gradeLevelId: "", sectionId: "none", name: "" }}
        onSubmit={createStudyPath}
        missingDependencyReason={
          options.gradeLevels.length === 0
            ? t("studyPaths.missingGradeLevel")
            : !options.hasActiveAcademicYear
              ? tCommon("noActiveYear")
              : null
        }
      />
      </TabsContent>

      <TabsContent value="subjects">
      <EntitySection<SubjectRow, CreateSubjectInput>
        subtitle={t("subjects.subtitle")}
        tableLabel={t("subjects.tableLabel")}
        columns={subjectColumns}
        rows={subjects}
        getRowId={(row) => row.id}
        emptyTitle={t("subjects.empty")}
        emptyHint={t("subjects.emptyHint")}
        createTrigger={t("subjects.create.trigger")}
        createTitle={t("subjects.create.title")}
        createDescription={t("subjects.create.description")}
        definition={{ schema: createSubjectSchema, fields: subjectFields }}
        defaultValues={{ code: "", name: "", shortName: "", area: "" }}
        onSubmit={createSubject}
      />
      </TabsContent>

      <TabsContent value="curriculumSubjects">
      <EntitySection<CurriculumSubjectRow, CreateCurriculumSubjectInput>
        subtitle={t("curriculumSubjects.subtitle")}
        tableLabel={t("curriculumSubjects.tableLabel")}
        columns={curriculumSubjectColumns}
        rows={curriculumSubjects.rows}
        getRowId={(row) => row.id}
        emptyTitle={t("curriculumSubjects.empty")}
        emptyHint={t("curriculumSubjects.emptyHint")}
        createTrigger={t("curriculumSubjects.create.trigger")}
        createTitle={t("curriculumSubjects.create.title")}
        createDescription={t("curriculumSubjects.create.description")}
        definition={{ schema: createCurriculumSubjectSchema, fields: curriculumSubjectFields }}
        defaultValues={
          {
            studyPathId: "",
            subjectId: "",
            scope: "",
            weeklyHours: 0,
            coefficient: 1,
            isExamSubject: false,
          } as unknown as DefaultValues<CreateCurriculumSubjectInput>
        }
        onSubmit={createCurriculumSubject}
        missingDependencyReason={
          studyPaths.rows.length === 0
            ? t("curriculumSubjects.missingStudyPath")
            : subjects.length === 0
              ? t("curriculumSubjects.missingSubject")
              : null
        }
      />
      </TabsContent>

      <TabsContent value="classGroups">
      <EntitySection<ClassGroupRow, CreateClassGroupInput>
        subtitle={t("classGroups.subtitle")}
        tableLabel={t("classGroups.tableLabel")}
        columns={classGroupColumns}
        rows={classGroups.rows}
        getRowId={(row) => row.id}
        emptyTitle={t("classGroups.empty")}
        emptyHint={t("classGroups.emptyHint")}
        createTrigger={t("classGroups.create.trigger")}
        createTitle={t("classGroups.create.title")}
        createDescription={t("classGroups.create.description")}
        definition={{ schema: createClassGroupSchema, fields: classGroupFields }}
        defaultValues={{ name: "", shift: "", capacity: 0, headTeacherId: "none" } as unknown as DefaultValues<CreateClassGroupInput>}
        onSubmit={createClassGroup}
        missingDependencyReason={!options.hasActiveAcademicYear ? tCommon("noActiveYear") : null}
      />
      </TabsContent>

      <TabsContent value="rooms">
      <EntitySection<RoomRow, CreateRoomInput>
        subtitle={t("rooms.subtitle")}
        tableLabel={t("rooms.tableLabel")}
        columns={roomColumns}
        rows={rooms}
        getRowId={(row) => row.id}
        emptyTitle={t("rooms.empty")}
        emptyHint={t("rooms.emptyHint")}
        createTrigger={t("rooms.create.trigger")}
        createTitle={t("rooms.create.title")}
        createDescription={t("rooms.create.description")}
        definition={{ schema: createRoomSchema, fields: roomFields }}
        defaultValues={{ code: "", name: "", capacity: 0, kind: "" } as unknown as DefaultValues<CreateRoomInput>}
        onSubmit={createRoom}
      />
      </TabsContent>

      <TabsContent value="timeSlots">
      <EntitySection<TimeSlotRow, CreateTimeSlotInput>
        subtitle={t("timeSlots.subtitle")}
        tableLabel={t("timeSlots.tableLabel")}
        columns={timeSlotColumns}
        rows={timeSlots.rows}
        getRowId={(row) => row.id}
        emptyTitle={t("timeSlots.empty")}
        emptyHint={t("timeSlots.emptyHint")}
        createTrigger={t("timeSlots.create.trigger")}
        createTitle={t("timeSlots.create.title")}
        createDescription={t("timeSlots.create.description")}
        definition={{ schema: createTimeSlotSchema, fields: timeSlotFields }}
        defaultValues={
          { dayOfWeek: "", startTime: "", endTime: "", shift: "", order: timeSlots.rows.length } as unknown as DefaultValues<CreateTimeSlotInput>
        }
        onSubmit={createTimeSlot}
        missingDependencyReason={!options.hasActiveAcademicYear ? tCommon("noActiveYear") : null}
      />
      </TabsContent>
    </Tabs>
  );
}
