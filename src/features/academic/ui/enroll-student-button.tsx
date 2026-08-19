"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DefaultValues } from "react-hook-form";

import type { FieldDefinition, FormDefinition } from "@/components/form/field-schema";
import { FormModal } from "@/components/form/form-modal";
import { Button } from "@/components/ui/button";
import { enrollStudent } from "@/features/academic/actions/enroll-student";
import type { EnrollmentOptions } from "@/features/academic/data/enrollments";
import {
  enrollStudentSchema,
  type EnrollStudentInput,
} from "@/features/academic/domain/enrollment-schema";

interface EnrollStudentButtonProps {
  studentId: string;
  studentName: string;
  options: EnrollmentOptions;
}

/**
 * Gatilho + `FormModal` para matricular um aluno já criado. `studentId` vem da linha da
 * tabela, não do formulário — o utilizador nunca o vê nem o escreve, tal como
 * `create-student` nunca deixa `schoolId` vir do cliente.
 */
export function EnrollStudentButton({ studentId, studentName, options }: EnrollStudentButtonProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("students.enroll");

  const fields: ReadonlyArray<FieldDefinition<Extract<keyof EnrollStudentInput, string>>> = [
    {
      name: "classGroupId",
      kind: "select",
      label: t("fields.classGroupId"),
      required: true,
      options: options.classGroups.map((group) => ({ value: group.id, label: group.name })),
    },
    {
      name: "studyPathId",
      kind: "select",
      label: t("fields.studyPathId"),
      required: true,
      options: options.studyPaths.map((path) => ({ value: path.id, label: path.name })),
    },
    { name: "number", kind: "text", label: t("fields.number"), required: true },
  ];

  const definition: FormDefinition<EnrollStudentInput> = {
    schema: enrollStudentSchema,
    fields,
  };

  const defaultValues: DefaultValues<EnrollStudentInput> = {
    studentId,
    classGroupId: "",
    studyPathId: "",
    number: options.suggestedNumber,
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t("trigger")}
      </Button>

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={t("title", { name: studentName })}
        description={t("description")}
        definition={definition}
        defaultValues={defaultValues}
        onSubmit={enrollStudent}
        submitLabel={t("trigger")}
      />
    </>
  );
}
