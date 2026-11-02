"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  useForm,
} from "react-hook-form";

import type { ZodType } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { validationMessages } from "./validation-messages";

import type {
  FieldDefinition,
  FormActionResult,
  FormDefinition,
} from "./field-schema";

export interface FormModalProps<TValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: string;

  definition: FormDefinition<TValues>;
  defaultValues: DefaultValues<TValues>;

  /** Normalmente uma Server Action. Devolve sucesso ou erros por campo. */
  onSubmit: (values: TValues) => Promise<FormActionResult<TValues>>;
  onSuccess?: () => void;

  submitLabel?: string;
}

/**
 * Modal de formulário dinâmico.
 *
 * Os campos são gerados a partir de uma `FormDefinition`: um esquema Zod com as regras e
 * uma lista que diz como apresentar cada campo. As regras não são duplicadas entre o
 * cliente e o servidor — é o mesmo esquema dos dois lados.
 *
 * O estado pendente vem de `useTransition` e não de um `useState` próprio: uma Server
 * Action que ainda está a revalidar a página continua "a decorrer" do ponto de vista do
 * utilizador, e um `useState` desligar-se-ia cedo demais, deixando o botão activo enquanto
 * a lista por baixo ainda muda.
 */
export function FormModal<TValues extends FieldValues>(
  props: FormModalProps<TValues>,
) {
  const { open, onOpenChange } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* O `DialogContent` do Radix só monta quando aberto, e o formulário vive aqui
            dentro. É isso que o devolve ao estado inicial a cada abertura — sem um
            `useEffect` a repor campos, que além de frágil viola a regra
            `react-hooks/set-state-in-effect` do React Compiler. Reabrir é remontar. */}
        <FormModalBody {...props} />
      </DialogContent>
    </Dialog>
  );
}

function FormModalBody<TValues extends FieldValues>({
  onOpenChange,
  title,
  description,
  definition,
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: FormModalProps<TValues>) {
  const t = useTranslations("form");
  const locale = useLocale();
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<TValues>({
    // O `zodResolver` é tipado para um esquema concreto; aqui `TValues` é genérico e o
    // TypeScript não consegue provar a variância. O contrato está garantido pelo tipo de
    // `FormDefinition<TValues>`, que liga o esquema aos valores — este cast só desfaz o
    // nó dos genéricos, não relaxa nenhuma validação.
    resolver: zodResolver(definition.schema as ZodType<TValues, TValues>, { error: validationMessages(locale) }),
    defaultValues,
    mode: "onTouched",
  });

  function handleSubmit(values: TValues) {
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await onSubmit(values);

        if (result.status === "success") {
          onSuccess?.();
          onOpenChange(false);
          return;
        }

        for (const [name, message] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (message) {
            form.setError(name as Path<TValues>, { type: "server", message });
          }
        }

        // Só mostra a mensagem geral quando não há nada a dizer junto a um campo:
        // repetir o mesmo erro em dois sítios só faz o utilizador procurar duas vezes.
        if (
          !result.fieldErrors ||
          Object.keys(result.fieldErrors).length === 0
        ) {
          setFormError(result.message ?? t("genericError"));
        }
      } catch {
        setFormError(t("genericError"));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          {formError}
        </p>
      ) : null}

      <form
        id={formId}
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-4 sm:grid-cols-2"
      >
        {definition.fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            form={form}
            disabled={isPending}
          />
        ))}
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? t("saving") : (submitLabel ?? t("save"))}
        </Button>
      </DialogFooter>
    </>
  );
}

function FormField<TValues extends FieldValues>({
  field,
  form,
  disabled,
}: {
  field: FieldDefinition<Extract<keyof TValues, string>>;
  form: ReturnType<typeof useForm<TValues>>;
  disabled: boolean;
}) {
  const t = useTranslations("form");
  // `Extract<keyof TValues, string>` é uma chave de topo e portanto um `Path` válido,
  // mas o `Path` do react-hook-form é recursivo e o TypeScript não o deduz sozinho.
  const name = field.name as unknown as Path<TValues>;
  const message = form.formState.errors[name]?.message as string | undefined;
  const error = message === "endBeforeStart" ? t("endBeforeStart") : message;
  const wrapper = cn(
    field.fullWidth || field.kind === "textarea" ? "sm:col-span-2" : "",
  );

  if (field.kind === "checkbox") {
    const id = `field-${field.name}`;

    return (
      <div className={cn("flex items-center gap-3", wrapper)}>
        <Checkbox
          id={id}
          disabled={disabled}
          checked={!!form.watch(name)}
          onCheckedChange={(value) =>
            form.setValue(name, !!value as never, { shouldDirty: true })
          }
        />
        <Label htmlFor={id}>{field.label}</Label>
      </div>
    );
  }

  if (field.kind === "select") {
    const id = `field-${field.name}`;

    return (
      <div className={cn("flex flex-col gap-1.5", wrapper)}>
        <Label htmlFor={id}>
          {field.label}
          {field.required ? (
            <>
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> ({t("required")})</span>
            </>
          ) : null}
        </Label>
        <Select
          disabled={disabled}
          value={(form.watch(name) as string | undefined) ?? ""}
          onValueChange={(value) =>
            form.setValue(name, value as never, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            id={id}
            aria-invalid={error ? true : undefined}
            className="h-12"
          >
            <SelectValue
              placeholder={field.placeholder ?? t("selectPlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldMessage error={error} helperText={field.helperText} />
      </div>
    );
  }

  if (field.kind === "textarea") {
    const id = `field-${field.name}`;

    return (
      <div className={cn("flex flex-col gap-1.5", wrapper)}>
        <Label htmlFor={id}>{field.label}</Label>
        <textarea
          id={id}
          rows={4}
          disabled={disabled}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-md border border-border-strong bg-surface px-4 py-3 text-base",
            "text-foreground placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
          )}
          {...form.register(name)}
        />
        <FieldMessage error={error} helperText={field.helperText} />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Input
        label={field.label}
        type={field.kind}
        required={field.required}
        disabled={disabled}
        autoFocus={field.autoFocus}
        placeholder={field.placeholder}
        helperText={field.helperText}
        error={error}
        {...form.register(name, {
          valueAsNumber: field.kind === "number",
        })}
      />
    </div>
  );
}

function FieldMessage({
  error,
  helperText,
}: {
  error?: string;
  helperText?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }

  return helperText ? (
    <p className="text-sm text-muted-foreground">{helperText}</p>
  ) : null;
}
