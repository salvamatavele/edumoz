"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DefaultValues } from "react-hook-form";

import type { FieldDefinition, FormDefinition } from "@/components/form/field-schema";
import { FormModal } from "@/components/form/form-modal";
import { Button } from "@/components/ui/button";
import { createStudent } from "@/features/academic/actions/create-student";
import {
  createStudentSchema,
  type CreateStudentInput,
} from "@/features/academic/domain/student-schema";
import { Gender } from "@/types";

/**
 * Gatilho + `FormModal` para criar um aluno. Não faz `router.refresh()` depois de
 * submeter: a Server Action já chama `revalidatePath`, e o Next actualiza a rota afectada
 * sozinho a seguir a uma Server Action bem-sucedida.
 */
export function CreateStudentButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("students.create");
  const tGender = useTranslations("students.gender");
  const tForm = useTranslations("form");

  const fields: ReadonlyArray<FieldDefinition<Extract<keyof CreateStudentInput, string>>> = [
    { name: "code", kind: "text", label: t("fields.code"), required: true, autoFocus: true },
    { name: "firstName", kind: "text", label: t("fields.firstName"), required: true },
    { name: "lastName", kind: "text", label: t("fields.lastName"), required: true },
    { name: "birthDate", kind: "date", label: t("fields.birthDate"), required: true },
    {
      name: "gender",
      kind: "select",
      label: t("fields.gender"),
      required: true,
      options: [
        { value: Gender.MALE, label: tGender("MALE") },
        { value: Gender.FEMALE, label: tGender("FEMALE") },
      ],
    },
    { name: "phone", kind: "tel", label: t("fields.phone"), helperText: tForm("optional") },
  ];

  const definition: FormDefinition<CreateStudentInput> = {
    schema: createStudentSchema,
    fields,
  };

  // O campo nativo `<input type="date">` guarda uma string enquanto o formulário está
  // aberto; `z.coerce.date()` só a converte para `Date` ao validar. `TValues` do FormModal
  // segue o tipo de SAÍDA do esquema — o mesmo desajuste que o próprio FormModal já aceita
  // no `resolver as Resolver<TValues>`. `gender` fica vazio até o utilizador escolher.
  const defaultValues = {
    code: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    phone: "",
  } as unknown as DefaultValues<CreateStudentInput>;

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
        onSubmit={createStudent}
        submitLabel={t("trigger")}
      />
    </>
  );
}
