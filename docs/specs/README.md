# Specs do EduMoz

Índice do desenvolvimento orientado a spec. Cada funcionalidade tem um documento com
requisitos, desenho e critérios de aceitação, aprovado antes de se escrever código.

## Estado

| # | Spec | Estado | Depende de |
|---|------|--------|------------|
| 1 | [`design-system.md`](./design-system.md) | ✅ Implementado | — |
| 2 | [`domain-foundation.md`](./domain-foundation.md) | ✅ Implementado | 1 |
| 3 | [`pending-fixes.md`](./pending-fixes.md) | ✅ Implementado | 2 |
| 4 | [`role-shell.md`](./role-shell.md) | ✅ Implementado | 2, 3 |
| 5 | [`attendance.md`](./attendance.md) | ✅ Implementado | 2, 3, 4 |
| 6 | [`academic-configuration`](../../openspec/changes/academic-configuration/) (OpenSpec) | ✅ Implementado | 2, 3, 4, 5 |
| 7 | [`assessment-module.md`](./assessment-module.md) / [`assessment-grading`](../../openspec/changes/assessment-grading/) (OpenSpec) | ✅ Implementado (excepto nota de exame) | 2, 3, 4, 6 |
| 8 | [`permissions-management`](../../openspec/changes/permissions-management/) (OpenSpec) | ✅ Implementado | 2, 3, 4 |
| 9 | [`scheduling-module.md`](./scheduling-module.md) / [`scheduling-module`](../../openspec/changes/scheduling-module/) (OpenSpec) | ✅ Implementado | 2, 3, 4, 6 |
| 10 | [`finance.md`](./finance.md) | 📋 Por aprovar | 2, 3, 4 |
| 11 | [`digital-identity.md`](./digital-identity.md) | 📋 Por aprovar | 2, 3, 4, 7 |

**Ordem recomendada:** 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11.

O 6 (Configuração académica, tratado via `/opsx:propose`+`/opsx:apply` em vez de um
documento `docs/specs/`) fecha a lacuna que deixava Presenças (5) sem forma de uma escola
real criar classes, turmas, secções, disciplinas ou professores — até aqui só existiam via
`prisma/seed.ts`. Desbloqueia o 7 (Avaliação), que precisa de `AssessmentScheme` geríveis
pela interface, não só semeados.

O 3 vem primeiro porque contém o selector de escola, sem o qual nenhum módulo funciona
para um utilizador com mais do que uma escola, e a ligação do `FormModal` a uma Server
Action real — o padrão que todos os módulos seguintes vão copiar.

O 4 (casca por papel) vem antes dos módulos de domínio porque corrige uma fuga real (um
papel de família vê hoje a lista completa de alunos em `/alunos`) e estabelece o
encaminhamento e a navegação por papel que os módulos seguintes assumem — sem ele, cada
módulo inventaria a sua própria versão.

O 5 (Presenças) vem a seguir por ser o mais simples de ponta a ponta: um ecrã, uma Server
Action, sem PDF nem integrações externas. Serve para validar o padrão completo antes de o
repetir em módulos com mais superfície.

O 9 depende do 6 porque um certificado de conclusão precisa das pautas fechadas.

O 7 (Avaliação) ficou dividido em dois: RF-01–RF-04 (configuração da fórmula) couberam no
próprio 6, porque `AssessmentScheme`/`AssessmentComponent` já faziam parte dessa
capability. RF-05–RF-10 (lançamento de notas, fecho de trimestre, pautas, "as minhas
notas") ficaram no change `assessment-grading`, incluindo `resolveApplicableScheme` — a
resolução do esquema aplicável que a capability `assessment-schemes` já especificava mas
nunca tinha implementação. A nota de exame (`examScore`) continua por implementar: os
campos de exame do esquema continuam por confirmar com uma escola real (ver
`assessment-module.md` §3.1).

O 8 (Permissões) não vinha do roteiro original — surgiu de um pedido directo do
utilizador depois do 7, para corrigir um superadmin que nunca funcionava de facto
(`isPlatformAdmin` nunca chegava à sessão) e acrescentar papéis configuráveis por escola e
o director de turma. Depende só da fundação de identidade (2, 3, 4), por isso entrou aqui
sem esperar pelo 9/10/11.

O 9 (Horários) reutilizou o detector de conflitos (`schedule-conflicts.ts`) construído na
Fase 2 mas nunca antes chamado por nenhuma interface — só existia testado, à espera de um
módulo que o usasse. Descobriu, ao ler o schema, que `Room` e `TimeSlot` também não tinham
CRUD (mesmo padrão da lacuna encontrada no 7 para `Assessment`); ambos entraram no âmbito
como pré-requisitos da grelha. A verificação manual apanhou um erro real que nenhum teste
unitário tinha coberto — a grelha de consulta/impressão colapsava para uma só aula quando
duas aulas simultâneas de subgrupos diferentes caíam na mesma célula, o caso central de
uma turma mista com Secções em paralelo (ver CHANGELOG, Fase 10).

## O que já está construído e pode ser reutilizado

Antes de escrever um módulo novo, vale a pena saber o que já existe:

| Peça | Onde | Para que serve |
|---|---|---|
| `getTenantDb(schoolId)` | `src/lib/db/tenant.ts` | **Obrigatório** em qualquer acesso a dados de uma escola |
| `auth()` | `src/lib/auth/config.ts` | Sessão, escola activa e papel. A autorização real é sempre na página |
| `DataTable` | `src/components/data-table/` | Listas com ordenação, pesquisa, paginação, selecção |
| `FormModal` | `src/components/form/` | Formulários gerados de um esquema Zod |
| `optionalNumberField` | `src/components/form/field-schema.ts` | Envolve um campo numérico Zod opcional — evita que um campo vazio vire `NaN` |
| `EntitySection` | `src/features/academic/ui/settings/entity-section.tsx` | Secção genérica (tabela + `FormModal`) para uma entidade simples de configuração |
| Motor de avaliação | `src/features/academic/domain/grade-engine.ts` | Cálculo de médias (`computeSubjectResult`) e resolução do esquema aplicável (`resolveApplicableScheme`), puros e testados |
| Conflitos de horário | `src/features/academic/domain/schedule-conflicts.ts` | `conflictsForPlacement`, pura e testada — corre no cliente (`ScheduleBoard`) e no servidor (`placeScheduleEntry`), nunca duas implementações |
| Consulta de horário | `src/features/academic/ui/schedule-view.tsx` | Grelha (dias × tempos) + lista empilhada por telemóvel, só leitura — usada por `/meu-horario` e pela impressão de turma em `/horarios` |
| `Money` / `Score` | `src/features/shared/domain/numeric.ts` | Aritmética exacta. **Nunca usar `number`** |
| Porta de dinheiro móvel | `src/features/finance/domain/ports/` | Interface para m-Pesa, e-Mola, mKesh |
| Argon2id | `src/lib/auth/password.ts` | Hash e verificação de palavras-passe |

## Regras que valem para todos os specs

Herdadas de `~/.claude/CLAUDE.md` e das fases anteriores:

1. **Nenhuma query sem filtro de escola.** Use `getTenantDb`. A regra ESLint impede o
   contrário; as excepções (`src/lib/db`, `src/lib/auth`) estão documentadas e são finais.
2. **A lógica de domínio é pura.** `features/<módulo>/domain` não importa Prisma nem React.
   É o que a torna testável e o que mantém os testes rápidos.
3. **Dinheiro e notas em `Decimal`.** Nunca vírgula flutuante.
4. **Texto de interface em pt-MZ e en**, nos dois catálogos. O teste de paridade falha se
   uma chave existir só numa língua.
5. **Identificadores de código em inglês.** Comentários e documentação em português.
6. **Alvos de toque ≥ 44px** e contraste WCAG AA. Ver `src/components/ui/README.md` antes
   de acrescentar componentes do shadcn.
7. **Testar até estar verde** antes de passar à tarefa seguinte.

## Como retomar noutro editor

```bash
pnpm install
pnpm db:generate          # gera o cliente Prisma para src/generated
pnpm db:seed              # base de demonstração (exige base vazia)
pnpm dev
```

O `.env` não está versionado. Copie o `.env.example` e preencha. Para desenvolvimento
local, a base é `mysql://root:root@127.0.0.1:3306/edumoz` e o administrador semeado é
`admin@edumoz.co.mz` com a palavra-passe predefinida que o seed anuncia na consola.

Para semear de novo é preciso largar a base (`pnpm db:reset`) — o seed não faz teardown de
propósito, porque apagar a escola em cascata falharia em `Enrollment → ClassGroup`, e essa
restrição está certa.
