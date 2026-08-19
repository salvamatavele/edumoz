"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ComponentProps } from "react";

import { cn } from "@/lib/cn";

type InputProps = Omit<ComponentProps<"input">, "id"> & {
  /** Always visible — never a placeholder standing in for a label. */
  label: string;
  /** Persistent guidance shown below the field. */
  helperText?: string;
  /** Error message; replaces the helper text and marks the field invalid. */
  error?: string;
  /**
   * Esconde o rótulo visualmente, mantendo-o para leitores de ecrã. Para casos como a
   * caixa de pesquisa de uma tabela, onde o ícone já diz o que o campo faz. Continua a
   * ser um `<label>` a sério e não um `aria-label`, que muitos leitores de ecrã tratam
   * pior em campos de formulário.
   */
  hideLabel?: boolean;
};

export function Input({
  label,
  helperText,
  error,
  className,
  required,
  hideLabel = false,
  type,
  ...props
}: InputProps) {
  const t = useTranslations("form");
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  // A palavra-passe começa sempre escondida — só o próprio utilizador a revela, nunca por
  // omissão (ex.: num ecrã partilhado numa secretaria).
  const isPassword = type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}
      >
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> ({t("required")})</span> : null}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isPassword ? (passwordVisible ? "text" : "password") : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-base",
            "text-foreground placeholder:text-muted-foreground",
            "transition-[border-color,box-shadow] duration-200 ease-(--ease-enter)",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            isPassword && "pr-12",
            className,
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setPasswordVisible((value) => !value)}
            aria-label={passwordVisible ? t("hidePassword") : t("showPassword")}
            aria-pressed={passwordVisible}
            className={cn(
              "absolute inset-y-0 right-0 flex w-12 items-center justify-center",
              "text-muted-foreground transition-colors duration-200 ease-(--ease-enter) hover:text-foreground",
            )}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" className="size-5" strokeWidth={1.75} />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export type { InputProps };
