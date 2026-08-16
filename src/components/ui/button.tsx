import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Botão do EduMoz.
 *
 * Estrutura do shadcn/ui (incluindo `asChild`, que permite estilar uma ligação como
 * botão sem aninhar `<a>` dentro de `<button>`), mas com os tokens e as dimensões da
 * Fase 1 — não com os do shadcn.
 *
 * Duas diferenças deliberadas face ao shadcn de origem:
 *
 * 1. TAMANHOS. O shadcn usa `h-9` (36px) por omissão e `h-10` (40px) em `lg`. Ambos ficam
 *    abaixo dos 44px que a RNF-02 exige, e 44px não é um número arbitrário: é a largura
 *    aproximada de um dedo adulto. Numa secretaria a marcar presenças ao telemóvel, a
 *    diferença entre 36 e 44 é a diferença entre acertar e falhar.
 * 2. VARIANTE POR OMISSÃO. O botão de acção principal é âmbar (`accent`), não teal
 *    (`primary`). O teal é a cor institucional e cobre demasiada superfície da interface
 *    para servir de chamada para acção — o âmbar é o que distingue "a acção" de "o produto".
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium transition-colors duration-200 ease-(--ease-enter)",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ),
  {
    variants: {
      variant: {
        default: "bg-accent text-on-accent hover:bg-accent-hover",
        solid: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary:
          "border border-border-strong bg-surface text-primary hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-on-status hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-11 px-4 text-sm",
        md: "h-12 px-5 text-base",
        lg: "h-14 px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza o filho em vez de um `<button>`, mantendo o estilo. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
