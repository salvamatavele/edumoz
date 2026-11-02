# EduMoz — Sistema de design consolidado

Actualizado em 2026-10-27 durante a tarefa 1.7. Preserva as decisões implementadas e aprovadas; substitui as sugestões genéricas do documento gerado em Agosto.

## Fontes de verdade

1. `src/app/globals.css`: valores executáveis, temas e aliases Tailwind 4.
2. `docs/specs/design-system.md`: requisitos e decisões de acessibilidade aprovados.
3. Este documento: orientação de aplicação; valores abaixo extraídos dos tokens actuais.
4. `src/components/ui/README.md`: composição dos primitivos Radix/shadcn com tokens EduMoz.
5. `/sistema-de-design` e `/en/design-system`: referência visual viva.

Uma orientação de página pode complementar estas regras, mas não substituir a marca, contraste, temas ou idiomas sem requisito explícito. Não aplicar automaticamente paletas/fontes recomendadas por uma pesquisa de skill a um produto já estabelecido.

## Identidade e experiência

EduMoz é uma ferramenta de gestão escolar para a realidade moçambicana, com várias escolas e perfis. Estilo Soft UI Evolution: superfícies legíveis, profundidade discreta e hierarquia adequada a dados densos. Preservar layout e shell existentes. Marca teal, acções âmbar, estados semânticos com texto/ícone. Ícones Lucide consistentes com a aplicação.

Texto claro e directo em pt-MZ e inglês; mensagens por chave nos catálogos, datas e moeda com formatadores do projecto. Mostrar sempre a escola activa onde necessário para evitar operações no contexto errado. A ocultação de navegação por permissão é apenas apresentação; o servidor valida cada acesso.

## Tipografia

- Títulos: Lexend, `--font-heading` / `--font-lexend`.
- Corpo: Source Sans 3, `--font-sans` / `--font-source-sans`.
- Fontes carregadas por `next/font`, com `display: swap`.
- Corpo de 16px, escala e entrelinhas definidas em `globals.css`; números tabulares em tabelas.
- Fira Code/Fira Sans eram sugestões anteriores e não fazem parte da identidade implementada.

## Temas e tokens

Claro por omissão; escuro opcional por `[data-theme="dark"]`. Ambos são suportados e obrigatórios nas verificações de contraste. Nunca remover o tema escuro com base nas recomendações genéricas antigas.

| Token `--edu-*` | Claro | Escuro |
|---|---|---|
| `brand` | `#0d9488` | `#2dd4bf` |
| `primary` | `#0f766e` | `#2dd4bf` |
| `primary-hover` | `#115e59` | `#5eead4` |
| `on-primary` | `#ffffff` | `#062521` |
| `accent` | `#b45309` | `#f59e0b` |
| `accent-hover` | `#92400e` | `#fbbf24` |
| `on-accent` | `#ffffff` | `#0b1f1d` |
| `background` | `#f0fdfa` | `#0b1f1d` |
| `surface` | `#ffffff` | `#122a28` |
| `surface-raised` | `#ffffff` | `#17332f` |
| `foreground` | `#134e4a` | `#e6f5f2` |
| `muted` | `#e8f1f4` | `#17332f` |
| `muted-foreground` | `#4b6360` | `#9db5b1` |
| `border` | `#cce9e4` | `#1f3f3b` |
| `border-strong` | `#6e9a94` | `#608b84` |
| `ring` | `#0d9488` | `#2dd4bf` |
| `success` | `#15803d` | `#4ade80` |
| `success-surface` | `#dcfce7` | `#16321f` |
| `warning` | `#b45309` | `#fbbf24` |
| `warning-surface` | `#fef3c7` | `#33260c` |
| `destructive` | `#b91c1c` | `#f87171` |
| `destructive-surface` | `#fee2e2` | `#3a1a1a` |
| `on-status` | `#ffffff` | `#0b1f1d` |

`brand` serve usos decorativos; superfícies interactivas e texto usam `primary`. Não trocar `border-strong` por `border` em campos: o primeiro tem contraste funcional. Consumir aliases semânticos Tailwind (`bg-surface`, `text-foreground`, `border-input`); hexadecimais permanecem na definição dos tokens. No EduMoz, `accent` significa CTA âmbar; o hover de menus usa `muted`, não o `accent` do shadcn original.

## Componentes e layout

Reutilizar `Button`, `Input`, `Card`, `Badge`, `FormModal`, `DataTable` e os restantes primitivos locais. Não reinstalar componentes por cima das adaptações sem preservar tokens, foco, acessibilidade e dimensões. Estado de leitura, pendente, sucesso, erro e vazio deve ser perceptível.

- Alvos de toque mínimos de 44×44px; campos principais com 48px.
- Ritmo de espaçamento baseado em 4/8px; contentores e breakpoints seguem os componentes existentes.
- Bordas, raios e sombras usam tokens locais, sem transformar cartões de leitura em elementos clicáveis.
- Formulários com labels visíveis, ajuda e erros associados ao campo; permitir navegação por teclado e retorno previsível.
- Grelhas extensas podem ter scroll interno próprio; não criar scroll horizontal da página em telemóvel.
- Impressos mantêm finalidade, campos e assinaturas da origem, com identidade da escola activa e revisão própria de paginação.

## Movimento e acessibilidade

Micro-interacções discretas, tipicamente 150–300ms, sem deslocamento de layout. Não introduzir GSAP nem overlays de transição só porque constavam de um template. Respeitar `prefers-reduced-motion`. Foco visível, rótulos acessíveis para ícones, semântica HTML e mensagens compreensíveis. Contraste mínimo de 4.5:1 para texto normal e 3:1 para texto grande e controlos.

## Verificação por entrega

Rever claro/escuro, pt-MZ/en, teclado, labels e erros; dimensões móveis e desktop; nenhuma informação comunicada apenas pela cor; sem dados da escola errada; impressos/PDF verificados separadamente. A consolidação de 2026-10-27 alterou apenas documentação: CSS, fontes e componentes foram preservados.
