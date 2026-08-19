import { z, type ZodType } from "zod";

/**
 * Descrição dos campos de um formulário dinâmico.
 *
 * A validação vive num esquema Zod partilhado entre o cliente e a Server Action — uma só
 * definição das regras, aplicada nos dois lados. Mas um esquema Zod não diz COMO se
 * apresenta um campo: `z.string()` tanto pode ser um nome como um endereço longo ou uma
 * escolha entre opções. Esta descrição acrescenta essa camada, sem duplicar as regras.
 */

/**
 * Campo `kind: "number"` opcional.
 *
 * `FormModal`/`AssessmentSchemeForm` registam campos numéricos com `valueAsNumber: true`
 * (ver `form-modal.tsx`); um campo vazio produz `NaN`, não `undefined` — é assim que o
 * `react-hook-form` interpreta `Number("")`. `z.coerce.number().optional()` sozinho não
 * apanha isto: `NaN` já É um número para o Zod, só não um válido. Este envólucro converte
 * `NaN`/`""`/`null` para `undefined` antes da validação, para "deixar em branco" significar
 * mesmo "sem valor".
 */
export function optionalNumberField(schema: ZodType<number>) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "number" && Number.isNaN(value)) return undefined;
    return value;
  }, schema.optional());
}

export type FieldKind =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

export interface FieldOption {
  readonly value: string;
  readonly label: string;
}

export interface FieldDefinition<TName extends string = string> {
  readonly name: TName;
  readonly kind: FieldKind;
  readonly label: string;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly required?: boolean;
  readonly autoFocus?: boolean;
  /** Obrigatório em `select`; ignorado nos restantes. */
  readonly options?: readonly FieldOption[];
  /** Ocupa a largura toda numa grelha de duas colunas. */
  readonly fullWidth?: boolean;
}

export interface FormDefinition<TValues extends Record<string, unknown>> {
  readonly schema: ZodType<TValues>;
  readonly fields: ReadonlyArray<FieldDefinition<Extract<keyof TValues, string>>>;
}

/**
 * Resultado de uma Server Action.
 *
 * `fieldErrors` existe para o servidor poder devolver erros que o cliente não consegue
 * validar sozinho — "já existe um aluno com este número" só se sabe consultando a base de
 * dados. Sem este canal, esses erros apareceriam como uma mensagem geral solta no topo, em
 * vez de junto ao campo que os causou.
 */
export type FormActionResult<TValues extends Record<string, unknown>> =
  | { readonly status: "success"; readonly message?: string }
  | {
      readonly status: "error";
      readonly message?: string;
      readonly fieldErrors?: Partial<Record<Extract<keyof TValues, string>, string>>;
    };

export const IDLE_RESULT = { status: "idle" } as const;
