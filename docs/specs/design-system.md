# Spec — Design System e Shell do EduMoz

- **Estado:** Aprovado para implementação
- **Data:** 2026-08-16
- **Âmbito desta fase:** Design system + shell da aplicação. Sem lógica de negócio.
- **Fonte de verdade visual:** [`design-system/edumoz/MASTER.md`](../../design-system/edumoz/MASTER.md) (gerado pela skill `ui-ux-pro-max`)

---

## 1. Contexto e requisitos

O EduMoz é um **SaaS de gestão escolar** para Moçambique. As escolas gerem alunos, turmas,
notas, presenças e propinas; a direcção, os professores e os encarregados de educação
consomem a mesma plataforma com níveis de acesso distintos.

### Requisitos funcionais desta fase

| ID | Requisito |
|----|-----------|
| RF-01 | Sistema de tokens (cor, tipografia, espaçamento, raio, sombra, motion) exposto como variáveis CSS e utilitários Tailwind 4 |
| RF-02 | Tema claro por omissão e tema escuro opcional, ambos com contraste validado |
| RF-03 | Primitivos de UI reutilizáveis: `Button`, `Card`, `Input`, `Badge` |
| RF-04 | Shell da aplicação: cabeçalho com navegação, rodapé, contentor de conteúdo |
| RF-05 | Página inicial pública com a estrutura do padrão *Real-Time / Operations Landing* |
| RF-06 | Página `/design-system` como style guide vivo (tokens + componentes renderizados) |

### Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande e elementos de UI (WCAG AA) |
| RNF-02 | Alvos de toque ≥ 44×44 px |
| RNF-03 | `prefers-reduced-motion` respeitado em todas as transições |
| RNF-04 | Sem *layout shift*: fontes via `next/font` (self-hosted, `display: swap`) |
| RNF-05 | Server Components por omissão; `"use client"` apenas onde há interactividade |
| RNF-06 | Texto de interface em **português (Moçambique)**; identificadores de código em inglês |
| RNF-07 | Sem scroll horizontal em 375 / 768 / 1024 / 1440 px |

---

## 2. Decisões de design

### 2.1 Estilo

**Soft UI Evolution** — profundidade subtil através de sombras suaves e bordas de baixo
contraste, em vez de neumorfismo pesado ou *flat* total. Justificação: o produto é
data-dense (tabelas de notas, listas de alunos, mapas de presenças) e precisa de
hierarquia visual sem ruído. Performance excelente e acessibilidade AA+.

**Padrão de página inicial:** *Real-Time / Operations Landing* — herói com pré-visualização
do produto, indicadores-chave, "como funciona", CTA final. CTA primário também na navegação.

### 2.2 Paleta

Base recomendada pela skill (categoria *LMS / Educational App*): teal institucional +
âmbar para acção. O teal distingue-nos do azul genérico de dashboards e mantém leitura
"educativa"; o âmbar dá um CTA quente e inequívoco.

| Papel | Claro | Escuro | Uso |
|-------|-------|--------|-----|
| `brand` | `#0D9488` | `#2DD4BF` | Marca; apenas gráficos, ícones decorativos e `ring` |
| `primary` | `#0F766E` | `#2DD4BF` | Superfícies interactivas e texto de ligação |
| `primary-hover` | `#115E59` | `#5EEAD4` | Estado hover/active do primário |
| `accent` | `#B45309` | `#F59E0B` | CTA primário, destaques de acção |
| `background` | `#F0FDFA` | `#0B1F1D` | Fundo da página |
| `surface` | `#FFFFFF` | `#122A28` | Cartões, painéis, modais |
| `foreground` | `#134E4A` | `#E6F5F2` | Texto principal |
| `muted` | `#E8F1F4` | `#17332F` | Fundos secundários, linhas alternadas |
| `muted-foreground` | `#4B6360` | `#9DB5B1` | Texto secundário |
| `border` | `#CCE9E4` | `#1F3F3B` | Separadores decorativos |
| `border-strong` | `#6E9A94` | `#608B84` | Contornos de campos e componentes (≥3:1) |
| `success` / `warning` / `destructive` | `#15803D` / `#B45309` / `#B91C1C` | `#4ADE80` / `#FBBF24` / `#F87171` | Estados semânticos |

**Contrastes verificados** (rácio WCAG calculado, não estimado):

| Par | Rácio | Nível |
|-----|-------|-------|
| `foreground` / `background` (claro) | 9.09:1 | AAA |
| `foreground` / `surface` (claro) | 9.48:1 | AAA |
| `muted-foreground` / `surface` (claro) | 6.46:1 | AAA |
| branco / `primary` (claro) | 5.47:1 | AA |
| branco / `accent` (claro) | 5.02:1 | AA |
| branco / `destructive` (claro) | 6.47:1 | AAA |
| `destructive` / `destructive-surface` (claro) | 5.30:1 | AA |
| `success` / `success-surface` (claro) | 4.57:1 | AA |
| `warning` / `warning-surface` (claro) | 4.51:1 | AA |
| `border-strong` / `surface` (claro) | 3.13:1 | AA (componentes) |
| `foreground` / `surface` (escuro) | 13.48:1 | AAA |
| `muted-foreground` / `surface` (escuro) | 6.97:1 | AAA |
| `primary` / `surface` (escuro) | 8.13:1 | AAA |
| `border-strong` / `surface` (escuro) | 3.98:1 | AA (componentes) |

**Desvios face ao MASTER.md (justificados):**

1. **`primary` escurecido de `#0D9488` para `#0F766E`** nas superfícies interactivas.
   `#0D9488` com texto branco dá apenas 3.74:1 — falha AA para texto normal. O `#0D9488`
   original mantém-se como `brand`, restrito a usos onde 3:1 basta (ícones, `ring`, gráficos).
2. **`accent` escurecido de `#D97706` para `#B45309`.** `#D97706` com texto branco dá
   3.19:1; `#B45309` dá 5.02:1.
3. **`border` `#5EEAD4` desdobrado em dois tokens.** O teal original (1.28:1 sobre branco)
   é invisível como contorno de campo. `border` (`#CCE9E4`) fica para separadores
   decorativos; `border-strong` (`#6E9A94`, 3.13:1) para contornos funcionais.
4. **`surface` branco separado do `background` teal-claro**, para o cartão "levantar" do
   fundo sem depender só da sombra — essencial em ecrãs de baixo brilho e projectores.

### 2.3 Tipografia

O MASTER.md propôs **Fira Code + Fira Sans** (mood "dashboard/código"). **Rejeitado** para
títulos: uma monoespaçada em cabeçalhos comunica ferramenta técnica, não instituição de
ensino — e o público inclui encarregados de educação, não programadores.

**Escolha:** par *Corporate Trust* da mesma base de dados —

- **Títulos:** Lexend — desenhada especificamente para reduzir esforço de leitura; carga
  simbólica adequada a um produto educativo.
- **Corpo:** Source Sans 3 — excelente legibilidade em tamanhos pequenos e em tabelas.
- **Numérico/tabular:** Source Sans 3 com `font-variant-numeric: tabular-nums` em notas,
  propinas e datas, evitando saltos de largura.

Escala: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48. Corpo base 16 px, `line-height` 1.6.

### 2.4 Espaçamento, raio e elevação

Ritmo de 4 px (densidade 7/10 — padrão, adequado a ecrãs administrativos):
`4 / 8 / 16 / 24 / 32 / 48 / 64`. Raios: `sm 6px`, `md 8px`, `lg 12px`, `xl 16px`, `full`.
Quatro níveis de sombra (`sm` → `xl`) usados de forma consistente: `sm` em inputs, `md` em
cartões, `lg` em dropdowns, `xl` em modais.

### 2.5 Movimento

Dial de motion 4/10 — padrão. Transições de 150–250 ms com `ease-out` à entrada e
`ease-in` à saída. Sem GSAP nesta fase: o padrão de transição de página sugerido pela skill
introduz um overlay que atrasa a navegação, o que penaliza utilizadores em ligações lentas —
cenário comum em Moçambique. Usa-se apenas o *loading* nativo do App Router.
Todas as animações desactivadas sob `prefers-reduced-motion: reduce`.

### 2.6 Modo escuro

O MASTER.md lista "dark modes" como anti-padrão para o padrão de landing escolhido.
**Decisão: implementar, com claro por omissão.** O anti-padrão refere-se a interfaces
predominantemente escuras como escolha estética; aqui o tema escuro é uma preferência do
utilizador, valiosa para secretarias com trabalho nocturno e para poupança de bateria em
portáteis. O tema segue o sistema (`prefers-color-scheme`) com override manual persistido.

### 2.7 Ícones

**Lucide** (`lucide-react`), traço 1.5–2 px, tamanhos por token (16 / 20 / 24). Nunca emojis
como ícones estruturais. Botões só-ícone têm sempre `aria-label`.

---

## 3. Arquitectura

```
src/
├── app/
│   ├── layout.tsx          # fontes, tema, metadata pt-MZ
│   ├── page.tsx            # página inicial pública
│   ├── globals.css         # tokens @theme + base layer
│   └── design-system/
│       └── page.tsx        # style guide vivo
├── components/
│   ├── layout/             # SiteHeader, SiteFooter
│   ├── theme/              # ThemeToggle (client)
│   └── ui/                 # Button, Card, Input, Badge
└── lib/
    └── cn.ts               # merge de classes
```

Princípios: primitivos sem dependência de domínio (DDD — a camada de UI não conhece
alunos nem turmas); variantes de componente derivadas de tokens semânticos, nunca de hex
literais; um único ponto de definição por token (DRY).

---

## 4. Critérios de aceitação

- [x] `pnpm build` conclui sem erros de TypeScript nem avisos de ESLint
- [x] `pnpm lint` limpo
- [x] `pnpm test` verde — 15 testes em 4 ficheiros
- [x] Todos os tokens da secção 2.2 disponíveis como utilitários Tailwind e variáveis CSS
- [x] Tema claro e escuro alternáveis, com preferência persistida e sem *flash* no carregamento
- [x] Todo o texto visível em português (Moçambique)
- [x] Nenhum emoji usado como ícone (Lucide em todo o lado)
- [x] Todos os elementos interactivos com estado de foco visível e `cursor-pointer`
- [x] Sem scroll horizontal a 375 px (verificado em 375 / 1440 px, ambos os temas)
- [x] Alvos de toque ≥ 44 px verificados no navegador em `/` e `/design-system`
- [x] Página `/design-system` renderiza todos os tokens e variantes de componente
- [x] Sem erros de consola em ambas as páginas

---

## 5. Fora de âmbito (fases seguintes)

Autenticação e papéis, modelo de dados (aluno, turma, matrícula, avaliação, propina),
dashboards por perfil, tabelas de dados com ordenação/filtros, relatórios, i18n formal
(pt-MZ é actualmente hard-coded), integração com pagamentos móveis (M-Pesa, e-Mola).
