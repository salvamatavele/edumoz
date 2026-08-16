# Changelog

## [Não publicado]

## Fase 2 — Fundação de domínio

Spec: [`docs/specs/domain-foundation.md`](docs/specs/domain-foundation.md).

### Adicionado (Passo 1 — modelo de dados)

- Prisma 7.9 com `@prisma/adapter-mariadb`, ligado a MariaDB 12.3.
- `prisma/schema.prisma`: 40 modelos e 24 enums cobrindo identidade, académico,
  avaliação, presenças, horários, finanças e auditoria. Migração `init` aplicada.
- `prisma/seed.ts` com o caso que justifica o modelo: duas turmas mistas (10A e
  10B), cada uma com alunos de Ciências e de Letras, esquema de avaliação
  `AC 0.40 + AT 0.60`, horário de 13 aulas sem conflitos e tabela de propinas.
- `src/lib/db/client.ts` — cliente Prisma cru, restrito a `src/lib/db/`.
- `src/lib/auth/password.ts` — Argon2id com os parâmetros recomendados pela OWASP
  (19 MiB, 2 iterações, paralelismo 1), com 9 testes.
- `.env.example` e scripts `db:*` no `package.json`.

### Adicionado (Passo 2 — tipos e isolamento entre escolas)

- `src/lib/db/tenant.ts` — `getTenantDb(schoolId)`: extensão do Prisma Client que
  injecta `schoolId` no `where` de todas as leituras e valida o `schoolId` das
  escritas. 11 testes de integração contra a base real.
- Regra ESLint `@typescript-eslint/no-restricted-imports` que impede importar o
  cliente Prisma em runtime fora de `src/lib/db`; tipos continuam livres.
- `src/types/index.ts` — fronteira única de tipos, com o alias `Classroom`.
- `src/features/shared/domain/numeric.ts` — `Money`, `Score`, `roundScore`, `sum`,
  sobre decimal.js. 20 testes.
- Tipos de domínio sem infra-estrutura: `academic/domain/assessment.ts`,
  `academic/domain/scheduling.ts`, `identity/domain/access.ts`, e a porta
  `finance/domain/ports/mobile-money-gateway.ts`.

### Decisões (Passo 2)

- **Escritas continuam a exigir `schoolId` no TypeScript.** A extensão é de runtime
  e o sistema de tipos não a vê. Em vez de contornar isso com casts, aceita-se: um
  `schoolId` em falta passa a erro de compilação e um `schoolId` errado passa a erro
  de runtime. As duas garantias juntas são mais fortes do que a injecção sozinha.
- **A lista `TENANT_SCOPED_MODELS` não é mantida à mão.** Um teste lê o
  `schema.prisma`, extrai os modelos com `schoolId` e falha se divergir — acrescentar
  um modelo sem o registar parte os testes em vez de abrir uma fuga silenciosa.
- **Um `schoolId` contraditório numa escrita lança em vez de ser reescrito.**
  Corrigi-lo em silêncio esconderia um bug de chamada.
- **O domínio usa decimal.js, não `number`.** O Prisma 7 devolve colunas `Decimal`
  como instâncias de decimal.js; converter para `number` reintroduziria o erro
  binário que a coluna existe para evitar.
- **`toDecimal` rejeita `Infinity`**, que o decimal.js aceita em silêncio, e traduz
  a excepção do decimal.js para uma mensagem própria.

### Corrigido

- `vitest.setup.ts` assumia sempre o ambiente jsdom, o que rebentava os testes de
  base de dados que correm em ambiente `node`. Tudo o que toca no DOM ficou atrás de
  uma guarda.

### Adicionado (Passo 3 — motores de domínio)

- `academic/domain/grade-engine.ts` — `computeSubjectResult` e `validateScheme`.
  Funções puras: sem I/O, sem Prisma, sem data actual. 28 testes.
- `academic/domain/schedule-conflicts.ts` — `detectScheduleConflicts`,
  `conflictsForPlacement`, `isFree`. 13 testes.
- `academic/schedule.integration.test.ts` — cruza o horário gravado pelo seed com o
  motor de conflitos. 5 testes.
- `src/lib/db/schools.ts` — consultas sobre `School`, a única camada onde o acesso
  sem filtro de escola é legítimo (a escola é o próprio tenant).

### Decisões (Passo 3)

- **Componente sem notas renormaliza os pesos.** Com só AT lançado (peso 0.6), a média
  de 12 daria 7.2 sem renormalização — reprovaria um aluno por notas que a escola
  ainda não lançou. O peso é redistribuído e o facto fica registado em `notes`.
- **Sem notas devolve `null`, não zero.** Zero é uma nota; ausência de nota não é.
- **`validateScheme` devolve lista, não lança na primeira falha.** Quem configura o
  esquema deve ver tudo o que está errado de uma vez.
- **Admitido a exame sem nota lançada fica `passed: null`.** Pendente não é reprovado.
- **`isAbsent` não decide sozinho.** Uma entrada conta se tiver nota: uma falta com
  zero atribuído pela escola conta como zero, uma falta sem nota é excluída.
- **`detectScheduleConflicts` devolve todos os conflitos.** Parar no primeiro
  transformaria montar um horário num jogo de tentativa e erro.
- **`conflictsForPlacement` filtra conflitos preexistentes** e não conta uma aula
  contra si própria ao remarcar.
- **Seed: Filosofia e TIC passaram para a professora de Português.** Realista numa
  escola de dimensão média, e torna verificável o critério de aceitação de um
  professor com Tronco Comum, Secção e Currículo Interno no mesmo ano.

### Adicionado (Passo 4 — internacionalização)

- `next-intl` 4.13 com `localePrefix: "as-needed"`: português sem prefixo, inglês
  em `/en`. Caminhos traduzidos — `/sistema-de-design` e `/en/design-system`.
- `src/proxy.ts` — encaminhamento por língua. No Next 16 o ficheiro chama-se
  `proxy.ts`, não `middleware.ts`.
- `src/i18n/{routing,navigation,request}.ts` e `messages/{pt,en}.json`.
- `LocaleSwitcher` — par de ligações, não um `<select>`: funciona sem JavaScript e
  produz URLs indexáveis.
- Formatos centralizados no pedido: moeda MZN, datas curtas/longas, notas com duas
  casas, fuso `Africa/Maputo`.
- Rotas movidas para `src/app/[locale]/`, com `generateStaticParams` e
  `setRequestLocale` para as duas línguas continuarem pré-renderizadas.
- `src/test/intl.tsx` — render com as mensagens reais do catálogo.
- 5 testes de paridade dos catálogos e 7 da página inicial nas duas línguas.

### Decisões (Passo 4)

- **Detecção automática de língua desligada (`localeDetection: false`).** Por
  omissão, um browser configurado em inglês seria encaminhado para `/en`. Em
  Moçambique isso engana-se: muitos telemóveis Android são vendidos com o sistema em
  inglês e usados por quem trabalha em português. `/` é sempre português; o inglês é
  uma escolha explícita que o endereço transporta.
- **`pt-MZ` e `en-GB` no atributo `lang`**, não `pt` e `en`: é o tag completo que
  decide a pronúncia do leitor de ecrã e o formato de datas e números.
- **Ano do rodapé passado como texto.** Em ICU um número leva separador de milhares
  e "2026" sairia "2 026".
- **`HomeSections` separado da rota.** Um Server Component `async` não se renderiza
  no Testing Library; manter a página inteira dentro de um `async` deixaria a página
  inicial sem testes.
- **O corpo do style guide fica em português nas duas línguas.** É documentação para
  quem desenvolve — traduzir `border-strong` tornaria a página inútil. Só o título
  entra no catálogo.
- **Teste de paridade dos catálogos.** O erro típico da tradução é acrescentar uma
  chave numa língua e esquecer a outra, o que não rebenta nada — apenas mostra o
  caminho da chave ao utilizador. Passa a ser falha de build.

### Adicionado (Passo 5 — shadcn/ui, DataTable e FormModal)

- shadcn/ui (Radix) com `table`, `dialog`, `select`, `checkbox`, `popover`,
  `command`, `label`, `form`, `dropdown-menu`, remapeados aos tokens da Fase 1.
- `src/components/ui/README.md` — o que muda face ao shadcn de origem e o que tem de
  ser reaplicado num `shadcn add` futuro.
- `DataTable` (TanStack Table 8) — ordenação, pesquisa, paginação, selecção,
  visibilidade de colunas, estados de vazio/carregamento/erro. 13 testes.
- `FormModal` — campos gerados de uma `FormDefinition` (Zod + descrição de
  apresentação), erros de servidor mapeados aos campos. 7 testes.
- `Input` ganhou `hideLabel`: rótulo para leitores de ecrã sem o mostrar.

### Decisões (Passo 5)

- **`accent` significa coisas opostas nos dois sistemas.** No shadcn é a superfície
  de *hover* de menus; no EduMoz é o âmbar da chamada para acção. Mapear um no outro
  pintaria cada item de menu de âmbar — as classes do shadcn foram reescritas para
  `bg-muted`/`text-foreground`.
- **`--color-input` aponta para `--edu-border-strong`.** O shadcn usa `border-input`
  nos campos de formulário; com o contorno decorativo (1.2:1) todos falhariam o
  critério de 3:1 do WCAG.
- **Tamanhos de botão próprios.** O shadcn usa 36px por omissão e 40px em `lg`; a
  RNF-02 exige 44px. `sm` 44, `md` 48, `lg` 56, `icon` 44×44.
- **TanStack Table 8, não 9.** A v9 exige registo explícito de *features* com um
  modelo novo e pouco documentado; a v8 é a linha que o próprio shadcn documenta.
- **`sortDescFirst: false`.** O TanStack ordena colunas numéricas de forma
  decrescente ao primeiro clique e as de texto de forma crescente — clicar em "Nome"
  e em "Média" faria coisas opostas.
- **Abaixo de 768px a tabela vira lista de cartões**, em vez de fazer scroll
  horizontal. Uma pauta de 12 colunas num ecrã de 375px é ilegível de qualquer forma.
- **O formulário remonta a cada abertura** em vez de ser reposto por `useEffect`. O
  `DialogContent` do Radix só monta quando aberto; a alternativa violava a regra
  `react-hooks/set-state-in-effect` do React Compiler.
- **Erro de servidor num campo não é repetido no topo.** Repetir a mesma queixa em
  dois sítios faz o utilizador procurar duas vezes.

### Corrigido

- `vitest.setup.ts` — preenchimentos para Pointer Capture, `scrollIntoView` e
  `ResizeObserver`, que o jsdom não implementa e os primitivos do Radix exigem.
- `Input` tinha "(obrigatório)" em português fixo no código; passou ao catálogo.

### Adicionado (Passo 6 — autenticação)

- `identity/domain/sign-in-policy.ts` — `decideSignIn` e `canCreateInvitation`.
  Funções puras, 22 testes, sem Auth.js nem base de dados.
- `identity/data/sign-in.ts` — carrega o contexto, aplica a decisão e aceita convites
  numa transacção.
- `src/lib/auth/config.ts` — Auth.js v5 com Google e credenciais, sessão JWT com
  escola activa e papel nessa escola.
- Rota `/api/auth/[...nextauth]`, tipos de sessão, `AUTH_SECRET` local gerado.

### Decisões (Passo 6)

- **A decisão de acesso é uma função pura.** É a peça de segurança central e vive
  fora da infra-estrutura precisamente para poder ser testada exaustivamente: convite
  expirado, aceite, revogado, domínio errado, conta suspensa, e-mail não verificado.
- **`decideSignIn` devolve os convites a aceitar, não os aceita.** Quem chama aplica
  o efeito dentro da transacção do login, o que o torna atómico.
- **A razão da recusa vai para os registos, não para o ecrã.** Dizer "a sua conta
  está suspensa" confirma a um estranho que aquele e-mail existe naquela escola.
- **Verificação de e-mail só se exige ao Google.** No login por credenciais não há
  terceiro a quem confiar: a escola criou a conta e definiu a palavra-passe.
- **A troca de escola é validada contra as `Membership` do token.** Sem isso,
  bastaria pedir a troca para um `schoolId` qualquer.
- **Terceira excepção à regra do cliente Prisma cru.** A autenticação acontece antes
  de haver escola — descobrir a que escolas um e-mail pertence é a pergunta que o
  `getTenantDb(schoolId)` já pressupõe respondida.
- **`AppToken` tipado à mão.** A augmentação de módulo do `next-auth/jwt` não aplica
  de forma fiável na v5 beta, e um token silenciosamente `any` é pior do que um cast
  explícito e confinado.

### Adicionado (Passo 7 — login, protecção de rotas e /alunos)

- Ecrã de início de sessão em `/entrar` e `/en/sign-in`, com Google e credenciais.
- `src/proxy.ts` passou a proteger rotas: verificação optimista do cookie de sessão,
  com redireccionamento para o login **na língua do pedido**.
- `/alunos` e `/en/students` — lista de matriculados do ano lectivo activo, com a
  `DataTable`, a escola resolvida pela sessão e o isolamento por `getTenantDb`.
- `features/academic/data/students.ts` — consulta que parte da MATRÍCULA, não do
  aluno, para o percurso vir do sítio certo.

### Decisões (Passo 7)

- **A autorização real está na página, não no proxy.** O proxy só vê se o cookie
  existe; é `auth()` na página que valida a sessão. Um cookie forjado passa lá e
  morre aqui — que é o que a documentação do Next 16 recomenda.
- **O redireccionamento respeita a língua.** Quem está em `/en/students` vai para
  `/en/sign-in`, não para uma página portuguesa.
- **A mensagem de erro do login é sempre a mesma.** Conta inexistente,
  palavra-passe errada e acesso recusado pela política são indistinguíveis do lado
  de fora; distingui-las revelaria que e-mails existem na escola.

### Problema conhecido

- **Datas em inglês saem em ordem americana.** O `lang` do HTML declara `en-GB`, mas
  o formatador do next-intl usa o código curto `en`, que o `Intl` trata como `en-US`
  — 4 de Maio aparece como `05/04/2010` em vez de `04/05/2010`. A página contradiz
  o que declara de si própria. Resolve-se com um locale de formatação distinto do
  locale de encaminhamento; ainda não está feito.

### Corrigido (revisão do esquema)

Revisão feita contra a base de dados real, não contra o ficheiro. Quatro falhas
encontradas e corrigidas antes de haver dados:

- **`Student`, `Teacher` e `Guardian` sem unicidade em `userId`.** O mesmo `User`
  podia ficar ligado a dois alunos da mesma escola. Adicionado
  `@@unique([schoolId, userId])`; NULLs continuam distintos em MySQL, portanto
  alunos sem conta continuam a ser permitidos.
- **Índice único do `AssessmentScheme` não protegia o esquema base.** Incluía duas
  colunas nuláveis; com ambas a NULL — que é exactamente o esquema base do ano — o
  MySQL aceitava duplicados ilimitados e a resolução do esquema deixava de ser
  determinística. Adicionado `@@unique([academicYearId, name, version])`.
- **`Invitation` impedia reconvidar.** O único `(schoolId, email, role)` bloqueava
  para sempre um e-mail depois de o convite ser aceite ou revogado. Substituído por
  índice não-único; a regra "um só convite PENDING" passa para o domínio.
- **`IssuedDocument` caía em cascata com o aluno.** Apagar um aluno destruía
  certificados e declarações emitidos. Passou a `onDelete: Restrict`.

### Notas de infra-estrutura

- O `prisma init` do Prisma 7 instala skills de agente em `.agents/`, `.windsurf/`
  e `.claude/`. Consolidadas numa só cópia real em `.claude/skills/`.
- `prisma migrate reset` é bloqueado pelo Prisma quando invocado por um agente;
  exige consentimento explícito do utilizador via
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.
- O seed não faz teardown: apagar a escola em cascata falha em
  `Enrollment → ClassGroup` (RESTRICT), e essa restrição está certa. Para semear de
  novo usa-se `pnpm db:reset`.

### Decisões (Passo 1)

- **`TeachingGroup` aponta para `Subject`, não para `CurriculumSubject`.** Num
  grupo de Tronco Comum os alunos vêm de percursos diferentes, logo de linhas de
  `CurriculumSubject` diferentes — uma chave estrangeira única para
  `CurriculumSubject` tornaria as turmas mistas inexprimíveis.
- **`ClassGroup` + `Room` em vez de um só `Classroom`.** Turma e sala física são
  entidades distintas e o motor de horários precisa das duas em simultâneo.
  `Classroom` fica como alias de tipo em `src/types`.
- **Carimbos de autoria (`recordedById`, `issuedById`, …) são `String` sem chave
  estrangeira.** São registo histórico: apagar um utilizador não deve apagar a
  prova de quem lançou uma nota.
- **Horas como `String` "HH:mm".** O tipo `TIME` do MySQL chega ao Prisma como
  `DateTime` com data fictícia, o que convida a erros de fuso horário.
- **Unicidade real do `StudyPath` garantida por `(academicYearId, code)`.** Em
  MySQL, NULLs num índice único são sempre distintos, portanto
  `(ano, classe, secção)` não impede duplicados quando `sectionId` é nulo.
- **Campos de exame do `AssessmentScheme` marcados POR CONFIRMAR.** Derivam de um
  modelo de ensino superior, não de prática de ensino secundário validada; ficam
  nulos até confirmação, mas existem desde a primeira migração porque acrescentar
  colunas de regra a um motor de notas com pautas reais é migração destrutiva.

### Adicionado

- Sistema de design gerado com a skill `ui-ux-pro-max` e persistido em
  `design-system/edumoz/MASTER.md`; decisões e desvios documentados em
  [`docs/specs/design-system.md`](docs/specs/design-system.md).
- Tokens semânticos (cor, tipografia, espaçamento, raio, elevação, motion) em
  `src/app/globals.css`, expostos como utilitários Tailwind 4 via `@theme`.
- Tema claro e escuro com preferência persistida e script anti-*flash*
  (`data-theme` no elemento raiz).
- Primitivos de UI: `Button`, `Card`, `Input`, `Badge`.
- Shell da aplicação: cabeçalho fixo com navegação e menu móvel, rodapé,
  ligação "saltar para o conteúdo".
- Página inicial pública e style guide vivo em `/design-system`.
- Vitest + Testing Library com 15 testes (comportamento, acessibilidade e uso de
  tokens).

### Decisões

- **Lexend + Source Sans 3** em vez do par Fira Code/Fira Sans sugerido pela
  skill: uma monoespaçada em títulos comunica ferramenta técnica, não uma
  instituição de ensino, e o público inclui encarregados de educação.
- **Paleta ajustada para WCAG AA.** `primary` `#0D9488` → `#0F766E` e `accent`
  `#D97706` → `#B45309` (ambos falhavam 4.5:1 com texto branco); `border`
  desdobrado em decorativo (`#CCE9E4`) e funcional (`#6E9A94`, 3:1);
  `destructive` `#DC2626` → `#B91C1C` para passar sobre o seu próprio fundo.
- **Sem GSAP nesta fase.** A transição de página sugerida introduz um overlay que
  atrasa a navegação — penaliza ligações lentas, cenário comum em Moçambique.
  Usa-se o carregamento nativo do App Router.
- **Modo escuro implementado**, contra a recomendação genérica da skill: aqui é
  preferência do utilizador (secretarias com trabalho nocturno), não estética
  predominante. O claro continua a ser o predefinido.
- **`useSyncExternalStore` no selector de tema** em vez de `useEffect` +
  `setState`: o elemento raiz é a fonte de verdade e a regra
  `react-hooks/set-state-in-effect` do React Compiler rejeita a alternativa.
