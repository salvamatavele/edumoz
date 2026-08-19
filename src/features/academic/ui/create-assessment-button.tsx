"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DefaultValues } from "react-hook-form";

import type { FieldDefinition, FormDefinition } from "@/components/form/field-schema";
import { FormModal } from "@/components/form/form-modal";
import { Button } from "@/components/ui/button";
import { createAssessment } from "@/features/academic/actions/create-assessment";
import {
  createAssessmentSchema,
  type CreateAssessmentInput,
} from "@/features/academic/domain/assessment-entry-schema";

interface CreateAssessmentButtonProps {
  readonly teachingGroupId: string;
  readonly termId: string;
  readonly components: ReadonlyArray<{ readonly id: string; readonly name: string; readonly code: string }>;
}

/**
 * Gatilho + `FormModal` para o professor criar uma `Assessment` (um teste, um trabalho)
 * num componente do esquema aplicável ao seu agrupamento. Molde de
 * `create-student-button.tsx`. `teachingGroupId`/`termId` nunca vêm do formulário — vêm da
 * página onde o botão vive, tal como `studentId` em `enroll-student-button.tsx`.
 */
export function CreateAssessmentButton({ teachingGroupId, termId, components }: CreateAssessmentButtonProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("gradeEntry.create");

  const fields: ReadonlyArray<FieldDefinition<Extract<keyof CreateAssessmentInput, string>>> = [
    { name: "name", kind: "text", label: t("fields.name"), required: true, autoFocus: true },
    {
      name: "componentId",
      kind: "select",
      label: t("fields.componentId"),
      required: true,
      options: components.map((component) => ({
        value: component.id,
        label: `${component.name} (${component.code})`,
      })),
    },
    { name: "maxScore", kind: "number", label: t("fields.maxScore"), required: true },
    { name: "weight", kind: "number", label: t("fields.weight"), required: true, helperText: t("fields.weightHint") },
    { name: "date", kind: "date", label: t("fields.date"), required: true },
  ];

  const definition: FormDefinition<CreateAssessmentInput> = {
    schema: createAssessmentSchema,
    fields,
  };

  const defaultValues = {
    teachingGroupId,
    termId,
    componentId: "",
    name: "",
    maxScore: 20,
    weight: 1,
    date: new Date().toISOString().slice(0, 10),
  } as unknown as DefaultValues<CreateAssessmentInput>;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" strokeWidth={1.75} />
        {t("trigger")}
      </Button>

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
        definition={definition}
        defaultValues={defaultValues}
        onSubmit={createAssessment}
        submitLabel={t("trigger")}
      />
    </>
  );
}
