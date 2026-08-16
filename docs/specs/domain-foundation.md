# Spec — Fundação de Domínio (Fase 2)

- **Estado:** Proposta — aguarda aprovação
- **Data:** 2026-08-16
- **Fase anterior:** [`design-system.md`](./design-system.md) (design system + shell, concluída)
- **Âmbito desta fase:** Modelo de dados, tipos, isolamento multi-escola, motores de domínio,
  i18n e componentes de dados. **Sem ecrãs de módulo.**

---

## 1. Contexto

O EduMoz é uma plataforma SaaS de gestão escolar multi-escola para Moçambique. A Fase 1
entregou a camada visual sem qualquer lógica de negócio. Esta fase constrói a fundação de
domínio sobre a qual assentam todos os módulos funcionais.

A decisão estruturante desta fase é o **modelo de matrícula como percurso**: um aluno não
pertence a uma turma, pertence a uma matrícula que define o seu percurso académico
(classe + secção). A turma física é apenas um agrupamento administrativo que pode conter
alunos de percursos diferentes. Todo o resto do modelo — avaliação, presenças, horários,
propinas — deriva da matrícula, nunca da turma.

### O que já existe

Next.js 16.3.1 (App Router), React 19.2, Tailwind 4, TypeScript strict, pnpm. Design system
com tokens semânticos validados para WCAG AA, tema claro/escuro, e quatro primitivos
escritos à mão.

### O que não existe

Prisma, base de dados, autenticação, i18n, testes. O critério `pnpm test` da Fase 1 nunca
foi cumprível — não há script de testes no `package.json`. Esta fase corrige isso.

---

## 2. Requisitos

### Funcionais

| ID | Requisito |
|----|-----------|
| RF-01 | `schema.prisma` completo cobrindo identidade, académico, avaliação, presenças, horários e finanças |
| RF-02 | Suporte a turmas mistas: matrícula define o percurso; a turma física agrega percursos distintos |
| RF-03 | Motor de avaliação com fórmula (componentes + pesos) configurável por ano lectivo, aplicada antes do processamento das notas |
| RF-04 | Modelo de horários que impede conflitos de professor, de sala e de aluno |
| RF-05 | Carga horária atribuível a disciplinas de Tronco Comum, de Secção e de Currículo Interno |
| RF-06 | Isolamento de dados entre escolas forçado na camada de acesso, não por disciplina do programador |
| RF-07 | Autenticação com papéis: Admin, Gestor, Professor, Aluno, Encarregado |
| RF-07a | Início de sessão com **Google** (OAuth), restrito a utilizadores previamente convidados |
| RF-07b | Início de sessão alternativo por e-mail/telefone + palavra-passe, para quem não tem conta Google |
| RF-08 | i18n pt-MZ (omissão, sem prefixo) e en (`/en`) com `next-intl` |
| RF-09 | `DataTable` reutilizável: ordenação, filtro, paginação, selecção, estados de vazio/carregamento |
| RF-10 | Modal de formulário dinâmico gerado a partir de um esquema Zod |
| RF-11 | Porta de integração para pagamentos móveis (m-Pesa, e-Mola, mKesh) com adaptador simulado |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | TypeScript strict; sem `any` no código de domínio |
| RNF-02 | Lógica de domínio pura (sem I/O, sem import de Prisma) e testada unitariamente |
| RNF-03 | Valores monetários em `Decimal(12,2)`; nunca vírgula flutuante |
| RNF-04 | Notas em `Decimal(5,2)`; arredondamento explícito e configurável |
| RNF-05 | Mobile-first: `DataTable` utilizável a 375 px sem scroll horizontal da página |
| RNF-06 | Texto de interface em pt-MZ e en; identificadores de código em inglês |
| RNF-07 | Mantém a paleta e os tokens da Fase 1 — nenhum contraste já validado é descartado |
| RNF-08 | `pnpm build`, `pnpm lint` e `pnpm test` verdes |

---

## 3. Decisões de arquitectura

### 3.1 Multi-escola: base de dados partilhada com `schoolId` forçado

Uma base de dados, coluna `schoolId` em todas as entidades de negócio, e o isolamento
aplicado por uma **Prisma Client Extension** que injecta o filtro do tenant em cada query.
O código de aplicação obtém o cliente através de `getTenantDb(schoolId)` e nunca importa o
`PrismaClient` cru fora de `src/lib/db/`.

Justificação: migrações únicas, operação simples e custo baixo — apropriado para o mercado
alvo. A alternativa (base por escola) multiplica o custo operacional sem ganho proporcional
nesta fase.

Risco assumido e mitigação: uma query que escape ao filtro é uma fuga de dados entre
escolas. Mitigação em três camadas — (a) a extensão aplica o filtro automaticamente;
(b) uma regra ESLint proíbe importar `@/generated/prisma` fora de `src/lib/db/`;
(c) um teste de integração verifica que uma query feita no contexto da escola A não devolve
linhas da escola B.

`User` e `AuditLog` são deliberadamente **globais** — um utilizador pode pertencer a várias
escolas (um professor que lecciona em duas). O vínculo faz-se por `Membership`.

### 3.2 Módulos por domínio

```
src/features/
├── identity/     Escola, utilizadores, papéis, alunos, encarregados, professores,
│                 cartões de estudante, certificados e declarações
├── academic/     Ano lectivo, trimestres, classes, secções, percursos, disciplinas,
│                 turmas, matrículas, agrupamentos lectivos, avaliação, presenças, horários
├── finance/      Tabelas de propinas, facturas, pagamentos, gateways de dinheiro móvel
└── shared/       Tipos e utilitários transversais
```

Cada módulo tem a mesma estrutura interna:

```
features/<módulo>/
├── domain/       Tipos, invariantes e funções puras. Não importa Prisma nem React.
├── data/         Repositórios: a única camada que fala com a base de dados.
├── actions/      Server Actions (mutações), com validação Zod e verificação de papel.
└── ui/           Componentes do módulo.
```

A regra que dá valor a esta separação: **`domain/` não importa nada de infra-estrutura**.
É o que torna o motor de avaliação e o detector de conflitos de horário testáveis sem base
de dados.

### 3.3 Stack

| Camada | Escolha | Nota |
|--------|---------|------|
| ORM | Prisma 7.9 (`provider = "mysql"`) | MariaDB é suportado por este provider |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta`) + `@auth/prisma-adapter` | Google OAuth + credenciais; ver 3.6 |
| i18n | `next-intl` 4.13 | `localePrefix: "as-needed"` |
| Validação | Zod 4 | Partilhada entre Server Actions e formulários |
| Formulários | `react-hook-form` + `@hookform/resolvers` | |
| Tabelas | `@tanstack/react-table` 9 | Headless; a apresentação usa os nossos tokens |
| UI | `shadcn/ui` remapeado aos tokens da Fase 1 | ver 3.5 |
| Testes | Vitest 4 + Testing Library | |

### 3.4 `proxy.ts`, não `middleware.ts`

Next.js 16 renomeou o `middleware.ts` para **`proxy.ts`** (a função exportada passa a
chamar-se `proxy`). O `middleware.ts` está deprecado. O ficheiro `src/proxy.ts` combina o
routing de locale do `next-intl` com a verificação optimista de sessão. Conforme a
documentação do Next 16, o proxy **não** é a camada de autorização — cada Server Action e
route handler revalida a sessão e o papel.

### 3.5 shadcn/ui sobre os tokens existentes

Instala-se `shadcn/ui`, mas as suas variáveis CSS (`--background`, `--primary`,
`--border`, …) são **mapeadas** para os tokens `--edu-*` já validados em `globals.css`, em
vez de trazerem a sua própria paleta. Os quatro primitivos da Fase 1 (`Button`, `Card`,
`Input`, `Badge`) são substituídos pelos equivalentes shadcn com as mesmas variantes
visuais, para não haver dois sistemas em paralelo.

Ganho: `Dialog`, `Select`, `Popover`, `Command`, `Table`, `Checkbox` e `Tooltip` acessíveis
de raiz (Radix), que a `DataTable` e o modal dinâmico precisam. Custo: reescrita dos quatro
primitivos, com a página `/design-system` a servir de verificação visual da equivalência.

**Mapeamento crítico:** o `--border` do shadcn é usado tanto em separadores como em
contornos de campo. Nós temos dois tokens distintos por razões de contraste (`--edu-border`
1.2:1, decorativo; `--edu-border-strong` 3.1:1, funcional). O mapeamento faz
`--border → --edu-border` e os componentes de entrada (`Input`, `Select`, `Checkbox`)
são ajustados para usarem `--edu-border-strong` explicitamente. Sem este ajuste, os campos
de formulário falhariam o critério 3:1 do WCAG.

### 3.6 Autenticação: Google OAuth por convite

Dois métodos de entrada, ambos sobre Auth.js v5:

| Método | Para quem |
|--------|-----------|
| **Google** (`GoogleProvider`) | Direcção, gestores e professores — quem já usa Google no dia-a-dia |
| **Credenciais** (e-mail *ou* telemóvel + palavra-passe) | Alunos e encarregados de educação |

O segundo método não é opcional: em Moçambique, uma parte substancial dos encarregados de
educação não tem conta Google, e muitos identificam-se por número de telemóvel e não por
e-mail. Um sistema só-Google excluiria precisamente o grupo mais numeroso de utilizadores.

#### O problema que o Google levanta

O Google autentica, mas não autoriza. Sem restrição, qualquer pessoa com conta Google
entraria na plataforma — e num sistema multi-escola isso é uma falha de isolamento, não um
inconveniente de registo.

**Decisão: o login Google não cria contas. Só liga contas que já existem.**

```
Gestor convida  →  Invitation { email, schoolId, role, token, expiresAt }
                        │
Utilizador entra com Google
                        │
                        ├─ e-mail verificado corresponde a um User com Membership  → entra
                        ├─ e-mail corresponde a um Invitation válido               → aceita, cria Membership, entra
                        └─ nenhum dos dois                                          → recusa, sem criar User
```

Concretamente no Auth.js: `allowDangerousEmailAccountLinking` fica **a `false`**, e o
callback `signIn` recusa a entrada quando não há `Membership` nem `Invitation` — o adaptador
Prisma nunca chega a criar o registo. A ligação de uma conta Google a um `User` existente
só acontece com `email_verified: true` vindo do Google; sem essa verificação, quem
registasse uma conta Google com o e-mail de um director assumiria a identidade dele.

Opcionalmente, cada escola pode fixar um `allowedEmailDomain` (ex.: `@escolaX.co.mz`) para
restringir ainda mais o universo de contas Google aceites.

#### Papéis e sessão

O papel não vive no `User` — vive na `Membership`, porque um mesmo utilizador pode ser
professor numa escola e encarregado de educação noutra. A sessão JWT transporta
`userId`, `schoolId` activo e `role` nessa escola; trocar de escola reemite o token.

Toda a autorização é revalidada em cada Server Action e route handler. O `proxy.ts` faz
apenas a verificação optimista de sessão, conforme a documentação do Next 16 recomenda.

Variáveis de ambiente necessárias: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`AUTH_URL`. Documentadas em `.env.example`, nunca versionadas com valores reais.

---

## 4. Modelo de domínio

### 4.1 Nomenclatura — desvio a assinalar

O pedido lista uma entidade `Classroom`. Em português, "turma" (grupo de alunos) e "sala de
aula" (espaço físico) são coisas diferentes, e o módulo de horários precisa das duas ao
mesmo tempo. Um único nome `Classroom` para ambas tornaria o motor de horários ilegível.

**Proposta:** `ClassGroup` = turma; `Room` = sala física. O tipo `Classroom` é exportado em
`types/index.ts` como alias de `ClassGroup`, para o vocabulário pedido continuar disponível.
Se preferires `Classroom` como nome do modelo Prisma, é uma alteração de uma linha — diz.

### 4.2 A cadeia matrícula → percurso → turma

Esta é a resposta ao requisito das turmas mistas.

```
GradeLevel (10ª Classe) ─┐
                         ├─→ StudyPath (10ª Classe · Ciências)  ─→ CurriculumSubject[]
Section (Ciências) ──────┘            │
                                      │
Student ──→ Enrollment ───────────────┘
               │
               └──→ ClassGroup (Turma 10A)  ← agrega matrículas de percursos diferentes
```

- `StudyPath` (**Percurso**) é a combinação classe + secção num ano lectivo. É daqui que
  saem as disciplinas do aluno.
- `Enrollment` (**Matrícula**) liga aluno, ano lectivo, percurso e turma. Único por
  `(studentId, academicYearId)`.
- `ClassGroup` (**Turma**) é administrativa. Não determina disciplinas.

Consequência prática: perguntar "que disciplinas tem este aluno?" resolve-se por
`Enrollment → StudyPath → CurriculumSubject[]`. A turma nunca entra na resposta.

### 4.3 Agrupamento lectivo — onde a aula acontece de verdade

Com turmas mistas, nem a turma nem o percurso descrevem sozinhos quem se senta na mesma
aula. Uma aula de Matemática (Tronco Comum) junta a turma toda; uma de Biologia (Secção)
junta só os alunos de Ciências, possivelmente vindos de duas turmas.

`TeachingGroup` (**Agrupamento lectivo**) resolve isto: é o conjunto efectivo de matrículas
que assistem em conjunto a uma disciplina, com um professor atribuído.

```
TeachingGroup { curriculumSubject, teacher, academicYear }
      └── TeachingGroupMember[] ──→ Enrollment
```

`Assessment`, `AttendanceSession` e `ScheduleEntry` ligam-se todos ao `TeachingGroup` —
nunca à turma. É o que faz os três `SubjectScope` funcionarem sem casos especiais:

| `SubjectScope` | Composição típica do agrupamento |
|----------------|----------------------------------|
| `CORE` (Tronco Comum) | todas as matrículas de uma turma |
| `SECTION` (Secção) | matrículas de um percurso, de uma ou mais turmas |
| `INTERNAL` (Currículo Interno) | selecção arbitrária (inglês extra, informática, apoio) |

### 4.4 Motor de avaliação

Estrutura configurável, com a fórmula em dados e não em código:

```
AssessmentScheme {
  academicYear, gradeLevel?, subject?          // âmbito de aplicação
  scaleMin 0, scaleMax 20, passMark 10         // escala
  roundingMode, decimalPlaces                  // arredondamento explícito
  regime: WITH_ASSESSMENT | WITHOUT_ASSESSMENT
  hasExam, examWeight                          // exame separado dos componentes
  minGradeForExam                              // nota de frequência
  exemptionGrade                               // dispensa de exame
  minExamGrade                                 // nota mínima do próprio exame
  version, publishedAt                         // versionamento e publicação
}
   └── AssessmentComponent { code "AC", name "Avaliação Contínua",
                             type, weight 0.40, minGrade?, order }
       AssessmentComponent { code "AT", name "Avaliação Trimestral",
                             type, weight 0.60, minGrade?, order }
```

Resolução do esquema aplicável, do mais específico para o mais geral:
`(gradeLevel + subject)` → `(subject)` → `(gradeLevel)` → esquema base do ano.

**Nota sobre os campos de exame.** A fórmula do pedido (`AC*0.4 + AT*0.6`) é o caso simples.
A prática moçambicana nas classes de exame acrescenta regras que não são exprimíveis só com
pesos e que, se ficarem de fora agora, obrigam a migração destrutiva depois:

| Campo | Regra que representa |
|-------|----------------------|
| `minGradeForExam` | Nota de frequência mínima para o aluno ser admitido a exame |
| `exemptionGrade` | Média a partir da qual o aluno dispensa o exame |
| `hasExam` / `examWeight` | O exame pesa **fora** da média das componentes, não como mais um componente |
| `minExamGrade` | Nota mínima no próprio exame, independentemente da média |
| `AssessmentComponent.minGrade` | Nota mínima por componente (reprova mesmo com média positiva) |
| `regime` | Disciplinas sem avaliação numérica (ex.: Educação Moral e Cívica em certas escolas) |

**Estes seis campos estão POR CONFIRMAR.** Derivam de um modelo de *ensino superior*, não de
prática de ensino secundário verificada. "Nota de frequência" e "dispensa de exame" são
vocabulário universitário; no ESG moçambicano o que é certo são os três trimestres e os
exames nas classes de exame (10ª e 12ª). Ficam no schema por serem nuláveis — acrescentar
colunas de regra a um motor de notas com pautas reais lá dentro é migração destrutiva —
mas o motor ignora cada campo que estiver nulo, e nenhum deles entra no seed sem validação
do utilizador.

**Invariantes**, validados na escrita do esquema e no motor:

1. Os pesos dos componentes somam exactamente `1.0` (comparação em Decimal, nunca `number`).
2. `scaleMin ≤ passMark ≤ scaleMax`; o mesmo para `exemptionGrade` e `minGradeForExam`.
3. `hasExam = false` implica `examWeight = 0`.
4. Um esquema publicado não pode ser alterado — altera-se criando uma nova **versão**.

O cálculo vive em `features/academic/domain/grade-engine.ts` como função pura:

```ts
computeSubjectResult(scheme: AssessmentScheme, entries: GradeEntry[]): SubjectResult
```

Sem I/O. Trata componente sem notas (excluído e pesos renormalizados, com o facto registado
no resultado), arredondamento explícito, e devolve as médias por componente, o estado de
admissão/dispensa a exame e a média final. `TermResult` guarda o valor calculado **e** a
versão do esquema usada, para que reconfigurar a fórmula não reescreva o histórico.

### 4.5 Horários

```
TimeSlot      { dayOfWeek, startTime, endTime, shift: MORNING|AFTERNOON|EVENING }
ScheduleEntry { teachingGroup, teacher, room, timeSlot, academicYear }
```

Três conflitos possíveis, tratados em camadas diferentes:

| Conflito | Como é impedido |
|----------|-----------------|
| Professor em dois sítios | Índice único `(academicYearId, teacherId, timeSlotId)` |
| Sala ocupada duas vezes | Índice único `(academicYearId, roomId, timeSlotId)` |
| Aluno com duas aulas | **Não é exprimível como índice** — um aluno pertence a vários agrupamentos. Verificado em `detectScheduleConflicts()` dentro da transacção de escrita |

A verificação de aluno é uma função pura sobre o horário existente, testável sem base de
dados. A escrita corre em transacção para o índice único servir de rede de segurança contra
condições de corrida.

**Limitação assumida na v1:** o índice único não acomoda aulas quinzenais ou alternadas
(semana A / semana B). Se essa necessidade aparecer, os índices passam a
`(ano, professor, slot, weekParity)`. Fica documentado por ser mais barato assumir agora
do que descobrir depois.

### 4.6 Presenças

`AttendanceSession` (uma aula concreta) + `AttendanceRecord` (uma matrícula). Optimizado
para marcação rápida: a sessão abre com todos presentes por omissão e o professor apenas
alterna as excepções; uma única Server Action grava o delta com `upsert` em lote. Único por
`(sessionId, enrollmentId)`.

### 4.7 Finanças

`FeeSchedule` → `FeeItem` (propina mensal, matrícula, uniforme, exame) → `Invoice` →
`InvoiceLine` → `Payment`. Tudo em `Decimal(12,2)`, moeda `MZN`.

A integração com dinheiro móvel entra por uma porta hexagonal:

```ts
// features/finance/domain/ports/mobile-money-gateway.ts
interface MobileMoneyGateway {
  readonly provider: PaymentProvider          // MPESA | EMOLA | MKESH
  initiate(request: PaymentRequest): Promise<PaymentInitiation>
  getStatus(reference: string): Promise<PaymentStatus>
}
```

Nesta fase entrega-se a porta, os tipos e o `SimulatedGateway` (sucesso, falha, timeout e
pendente-depois-confirmado, para os ecrãs poderem ser desenvolvidos e testados). Os
adaptadores reais ficam para a fase de Finanças.

`Payment.idempotencyKey` é único e obrigatório: os callbacks de dinheiro móvel repetem-se, e
sem isto um pagamento é contado duas vezes.

### 4.8 Auditoria

`AuditLog` regista actor, acção, entidade, e o estado antes/depois em JSON. Obrigatório em
alterações de nota, de matrícula e de pagamento. Uma plataforma escolar onde uma nota muda
sem rasto não é defensável perante uma direcção.

---

## 5. Entregáveis

### Passo 1 — `prisma/schema.prisma`

Modelos: `School`, `User`, `Account`, `Session`, `VerificationToken`, `Membership`,
`Invitation`, `Student`, `Guardian`,
`StudentGuardian`, `Teacher`, `StudentCard`, `IssuedDocument`, `AcademicYear`, `Term`,
`GradeLevel`, `Section`, `StudyPath`, `Subject`, `CurriculumSubject`, `ClassGroup`, `Room`,
`Enrollment`, `TeachingGroup`, `TeachingGroupMember`, `AssessmentScheme`,
`AssessmentComponent`, `Assessment`, `Grade`, `TermResult`, `TimeSlot`, `ScheduleEntry`,
`AttendanceSession`, `AttendanceRecord`, `FeeSchedule`, `FeeItem`, `Invoice`, `InvoiceLine`,
`Payment`, `AuditLog`.

Mais: migração inicial aplicada a MariaDB e `prisma/seed.ts` com uma escola de demonstração
— duas turmas mistas partilhando percursos de Ciências e Letras, um esquema de avaliação
`AC 0.4 / AT 0.6`, um horário sem conflitos e uma tabela de propinas.

### Passo 2 — Tipos

`src/types/index.ts` reexporta os tipos de domínio (incluindo o alias `Classroom`).
Os tipos ricos — os que têm invariantes — vivem em `features/*/domain/`, não são gerados
pelo Prisma. Enums partilhados entre schema e TypeScript numa fonte única.

### Passo 3 — i18n

`next-intl` com `localePrefix: "as-needed"`; `pt` sem prefixo, `en` em `/en`.
`src/app/[locale]/`, mensagens em `messages/pt.json` e `messages/en.json` organizadas por
módulo, `src/proxy.ts` a combinar locale e sessão. Formatação de datas, números e moeda
(MZN) por locale.

### Passo 4 — Componentes

- **`DataTable`** sobre TanStack Table: ordenação, filtro global e por coluna, paginação no
  servidor, selecção de linhas, visibilidade de colunas, estados de vazio/carregamento/erro,
  e colapso para cartões abaixo de 768 px (uma tabela de 12 colunas não se lê num telemóvel).
- **`FormModal`**: Dialog do shadcn + `react-hook-form`, campos derivados de um esquema Zod
  (`text`, `number`, `select`, `date`, `checkbox`, `textarea`, `combobox` assíncrono), erros
  de servidor mapeados aos campos, estado pendente via `useActionState`.

### Passo 5 — Infra-estrutura de qualidade

Vitest configurado, script `test` no `package.json`, e testes que cobrem:
o motor de avaliação (pesos, renormalização, arredondamento, invariantes),
`detectScheduleConflicts` (professor, sala, aluno), o isolamento por `schoolId`,
e a montagem básica de `DataTable` e `FormModal`.

---

## 6. Critérios de aceitação

- [ ] `pnpm build`, `pnpm lint` e `pnpm test` verdes
- [ ] Migração aplica-se de raiz a uma base MariaDB vazia; `pnpm db:seed` corre sem erros
- [ ] Um aluno de Ciências e um de Letras coexistem na mesma turma, cada um com a sua lista
      de disciplinas correcta, derivada do percurso
- [ ] Um professor consegue estar atribuído a Tronco Comum, Secção e Currículo Interno no
      mesmo ano lectivo, sem colisão de horário
- [ ] O motor de avaliação devolve o mesmo resultado para o exemplo `(AC*0.4)+(AT*0.6)`
      calculado à mão, e muda de resultado ao alterar os pesos sem alterar código
- [ ] Alterar o esquema de avaliação não altera um `TermResult` de um trimestre fechado
- [ ] Um aluno com média acima de `exemptionGrade` é marcado como dispensado de exame
- [ ] Um aluno abaixo de `minGradeForExam` é marcado como não admitido a exame
- [ ] Um aluno com média positiva mas abaixo do `minGrade` de um componente reprova
- [ ] Tentar marcar dois agrupamentos com o mesmo professor no mesmo `TimeSlot` é rejeitado
- [ ] Uma consulta no contexto da escola A não devolve nenhuma linha da escola B
- [ ] Login Google com e-mail sem `Membership` nem `Invitation` é recusado **sem criar `User`**
- [ ] Login Google com e-mail de um `Invitation` válido cria a `Membership` com o papel convidado
- [ ] Um `Invitation` expirado ou já usado é recusado
- [ ] Aluno/encarregado autentica-se por telemóvel + palavra-passe, sem conta Google
- [ ] Utilizador com `Membership` em duas escolas troca de escola e a sessão reflecte o papel correcto em cada uma
- [ ] Interface completa em pt e en; `/alunos` e `/en/students` ambos funcionais
- [ ] `DataTable` legível a 375 px sem scroll horizontal da página
- [ ] Nenhum `any` em `features/*/domain/`
- [ ] Zero regressões visuais na página `/design-system` após a migração para shadcn

---

## 7. Fora de âmbito (fases seguintes)

Ecrãs dos módulos (dashboards por papel, pautas, mapa de presenças, tesouraria), geração de
PDF de certificados e declarações, cartão de estudante com QR renderizado, adaptadores reais
de m-Pesa/e-Mola/mKesh, relatórios e exportações, notificações por SMS, e o modo offline
para marcação de presenças sem rede.

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Auth.js v5 ainda em beta | API estável há vários meses; a superfície usada é pequena e está isolada em `src/lib/auth/` |
| Apropriação de conta por e-mail Google não verificado | `allowDangerousEmailAccountLinking: false`; ligação só com `email_verified: true` |
| Escola sem processo de convite fica sem forma de entrar | O seed cria o primeiro Admin da plataforma; o Admin convida os gestores de cada escola |
| Palavras-passe de alunos/encarregados | Argon2id, nunca reversíveis; recuperação por SMS fica para a fase de notificações |
| Prisma 7 mudou o gerador de cliente e a saída | Cliente gerado para `src/generated/prisma`, importado apenas por `src/lib/db/` |
| Migração dos primitivos para shadcn pode alterar o aspecto | `/design-system` serve de comparação lado a lado antes e depois |
| `Decimal` do Prisma não é `number` | Conversão explícita nas fronteiras; o domínio usa um tipo `Money`/`Score` próprio |
| Modelo de percursos pode não cobrir todas as escolas | O seed inclui um caso misto real; validar com utilizador antes dos módulos |
