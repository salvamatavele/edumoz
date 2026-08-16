# Specs do EduMoz

Índice do desenvolvimento orientado a spec. Cada funcionalidade tem um documento com
requisitos, desenho e critérios de aceitação, aprovado antes de se escrever código.

## Estado

| # | Spec | Estado | Depende de |
|---|------|--------|------------|
| 1 | [`design-system.md`](./design-system.md) | ✅ Implementado | — |
| 2 | [`domain-foundation.md`](./domain-foundation.md) | ✅ Implementado | 1 |
| 3 | [`pending-fixes.md`](./pending-fixes.md) | 📋 Por aprovar | 2 |
| 4 | [`attendance.md`](./attendance.md) | 📋 Por aprovar | 2, 3 |
| 5 | [`assessment-module.md`](./assessment-module.md) | 📋 Por aprovar | 2, 3 |
| 6 | [`scheduling-module.md`](./scheduling-module.md) | 📋 Por aprovar | 2, 3 |
| 7 | [`finance.md`](./finance.md) | 📋 Por aprovar | 2, 3 |
| 8 | [`digital-identity.md`](./digital-identity.md) | 📋 Por aprovar | 2, 3, 5 |

**Ordem recomendada:** 3 → 4 → 5 → 6 → 7 → 8.

O 3 vem primeiro porque contém o selector de escola, sem o qual nenhum módulo funciona
para um utilizador com mais do que uma escola, e a ligação do `FormModal` a uma Server
Action real — o padrão que todos os módulos seguintes vão copiar.

O 4 (Presenças) vem antes dos outros por ser o mais simples de ponta a ponta: um ecrã, uma
Server Action, sem PDF nem integrações externas. Serve para validar o padrão completo
antes de o repetir em módulos com mais superfície.

O 8 depende do 5 porque um certificado de conclusão precisa das pautas fechadas.

## O que já está construído e pode ser reutilizado

Antes de escrever um módulo novo, vale a pena saber o que já existe:

| Peça | Onde | Para que serve |
|---|---|---|
| `getTenantDb(schoolId)` | `src/lib/db/tenant.ts` | **Obrigatório** em qualquer acesso a dados de uma escola |
| `auth()` | `src/lib/auth/config.ts` | Sessão, escola activa e papel. A autorização real é sempre na página |
| `DataTable` | `src/components/data-table/` | Listas com ordenação, pesquisa, paginação, selecção |
| `FormModal` | `src/components/form/` | Formulários gerados de um esquema Zod |
| Motor de avaliação | `src/features/academic/domain/grade-engine.ts` | Cálculo de médias, puro e testado |
| Conflitos de horário | `src/features/academic/domain/schedule-conflicts.ts` | Detecção de colisões, pura e testada |
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
