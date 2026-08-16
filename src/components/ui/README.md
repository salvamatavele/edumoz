# Primitivos de UI

Componentes do [shadcn/ui](https://ui.shadcn.com) (Radix por baixo), **remapeados aos
tokens do EduMoz** definidos em `src/app/globals.css`. Ver
[`docs/specs/design-system.md`](../../../docs/specs/design-system.md) e
[`docs/specs/domain-foundation.md`](../../../docs/specs/domain-foundation.md) §3.5.

## O que muda face ao shadcn de origem

Se voltares a correr `pnpm dlx shadcn@latest add <componente>`, o ficheiro novo vem com o
vocabulário do shadcn e **estas três correcções têm de ser reaplicadas**.

### 1. `accent` significa coisas diferentes nos dois sistemas

| | shadcn | EduMoz |
|---|---|---|
| `accent` | superfície de *hover* de menus e listas | âmbar `#B45309` da chamada para acção |

Deixar o mapeamento directo pintaria de âmbar cada item de menu sob o rato. As classes do
shadcn são reescritas para as nossas:

```
focus:bg-accent                  → focus:bg-muted
focus:text-accent-foreground     → focus:text-foreground
hover:bg-accent                  → hover:bg-muted
data-[state=open]:bg-accent      → data-[state=open]:bg-muted
data-[selected=true]:bg-accent   → data-[selected=true]:bg-muted
```

### 2. `border-input` tem de ser o contorno forte

Temos dois tokens de contorno por razões de contraste: `--edu-border` (1.2:1, decorativo)
e `--edu-border-strong` (3.1:1, funcional). O shadcn usa `border-input` nos campos de
formulário, e é lá que entra o forte — está tratado na ponte em `globals.css`
(`--color-input: var(--edu-border-strong)`). Sem isso, todos os campos falhariam o
critério de 3:1 do WCAG para elementos de interface.

### 3. Alvos de toque de 44px

O shadcn usa `h-9` (36px) por omissão e `h-10` (40px) em `lg`. A RNF-02 exige 44px, que é
a largura aproximada de um dedo adulto. O `Button` tem tamanhos próprios: `sm` 44px,
`md` 48px, `lg` 56px, `icon` 44×44.

## Componentes escritos de raiz

`badge.tsx`, `card.tsx` e `input.tsx` são da Fase 1 e não vêm do shadcn. Não os
substituas por `shadcn add` sem reaplicar os tokens e as dimensões.
