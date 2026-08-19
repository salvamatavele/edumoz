Pensado para ser aplicado por etapas (ver design.md, "Migration Plan") — cada grupo dá
valor sozinho. O grupo 2 (superadmin a funcionar) já resolve a queixa mais urgente, sem
esperar pelos papéis configuráveis (grupos 3-4) nem pelo director de turma (grupo 5).

## 1. Schema — catálogo de permissões e papéis configuráveis

- [x] 1.1 `prisma/schema.prisma` — modelos novos: `Permission` (`resource`, `action`,
      `@@unique([resource, action])`), `PermissionRole` (`schoolId`, `name`,
      `description?`, `@@unique([schoolId, name])`), `RolePermission` (junção
      `roleId`×`permissionId`). `Membership` ganha `permissionRoleId String?` (FK opcional
      para `PermissionRole`).
- [x] 1.2 Migração Prisma (`pnpm db:migrate` ou equivalente do projecto).
- [x] 1.3 `prisma/seed.ts` (ou script à parte, `pnpm db:seed:permissions`) — semeia o
      catálogo fixo de `Permission`: recursos `students`, `enrollments`, `attendance`,
      `grades`, `term-closing`, `report-cards`, `academic-structure`, `teaching-staff`,
      `assessment-schemes`; acções `view`/`create`/`edit`/`delete` em cada.
- [x] 1.4 `TENANT_SCOPED_MODELS` (`src/lib/db/tenant.ts`) — acrescentar `PermissionRole`
      (é por escola); `Permission` fica de fora (catálogo global, como `AuditLog` não é
      mas `AssessmentComponent` também não é — junção sem `schoolId` próprio).

## 2. `isPlatformAdmin` na sessão

- [x] 2.1 `src/types/next-auth.d.ts` — `isPlatformAdmin: boolean` no `Session`/`JWT`.
- [x] 2.2 `src/lib/auth/config.ts` — `jwt` callback lê `User.isPlatformAdmin` no login e
      guarda no token; `session` callback propaga para a sessão. Não muda ao trocar de
      escola (`trigger === "update"` só toca em `schoolId`).
- [x] 2.3 Testes de `config.ts` (mesmo padrão de `resolveActiveSchool` — a lógica pura
      isolada, testável sem `next/server`).
- [x] 2.4 Todos os 23 sítios que hoje escrevem `isPlatformAdmin: false` à mão passam a
      usar `session.isPlatformAdmin`. Grep antes de começar para confirmar a lista
      completa; alterar um de cada vez, `pnpm test` verde entre cada um.

## 3. `hasPermission`

- [x] 3.1 `src/features/identity/domain/access.ts` — `hasPermission(context, resource,
      action)`, pura (recebe as permissões do papel já carregadas em `SessionContext`, não
      consulta a base de dados). `SessionContext` ganha
      `permissions: readonly {resource, action}[]` (vazio quando não há papel atribuído —
      nesse caso `hasPermission` para um `SCHOOL_MANAGER` continua sempre verdadeiro, ver
      design.md).
- [x] 3.2 Testes de `hasPermission`: superadmin sempre verdadeiro; não-gestor sempre
      falso; gestor sem papel sempre verdadeiro; gestor com papel só verdadeiro para as
      permissões marcadas.
- [x] 3.3 `src/features/identity/data/permissions.ts` — carrega as `permissions` de uma
      `Membership` (junção `PermissionRole`→`RolePermission`→`Permission`), para
      construir o `SessionContext` onde for preciso.

## 4. UI — gestão de papéis configuráveis

- [x] 4.1 `src/features/identity/domain/permission-role-schema.ts` — Zod para criar um
      `PermissionRole` (nome, descrição, lista de `permissionId`s marcados).
- [x] 4.2 `src/features/identity/actions/create-permission-role.ts`,
      `assign-permission-role.ts` — só quem já tem acesso total (gestor sem papel
      restrito, ou superadmin); `AuditLog`.
- [x] 4.3 `src/features/identity/data/permission-roles.ts` — listar papéis da escola, com
      as suas permissões; listar membros do pessoal para atribuir.
- [x] 4.4 UI — nova secção em `/configuracao` (`settings`): tabela de papéis + `FormModal`
      para criar (grelha de checkboxes recurso×acção — não cabe no `FormModal` genérico,
      mesmo caso de `AssessmentSchemeSection`, formulário próprio); lista de membros do
      pessoal com selector de papel a atribuir.
- [x] 4.5 `messages/{pt,en}.json` — namespace novo, incluindo os nomes dos recursos e
      acções em português corrente (ex.: "Alunos", "Ver", "Criar", "Editar", "Apagar").
- [x] 4.6 Testes: acções (autorização, escrita, `AuditLog`); componente do formulário de
      criar papel.

## 5. Director de turma

- [x] 5.1 `academic-structure-schema.ts`/`create-class-group.ts`/formulário — expor
      `headTeacherId` (selector de `Teacher`, opcional) na criação/edição de `ClassGroup`.
- [x] 5.2 `src/features/academic/data/attendance.ts` — `listTeacherScheduleForDate`/
      `getAttendanceRoster` (ou uma função nova ao lado) verificam
      `ClassGroup.headTeacher.userId === session.user.id` e, quando verdade, alargam a
      todos os agrupamentos da turma.
- [x] 5.3 `src/features/academic/data/grades.ts` — mesma verificação, alargando
      `listTeacherTeachingGroups` (ou vista equivalente) a toda a turma quando director.
- [x] 5.4 UI — distinguir visualmente "os seus agrupamentos" de "a turma que dirige"
      (ex.: secção separada ou emblema), para não confundir posse com visibilidade alargada.
- [x] 5.5 Testes: director de turma vê disciplina que não lecciona; não consegue editar
      nota/presença dessa disciplina; professor sem ser director só vê o que é seu.

## 6. Verificação

- [x] 6.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 6.2 Verificação manual: entrar como superadmin numa escola sem `Membership`; criar
      um papel "Director-adjunto" sem `delete`, atribuí-lo, confirmar que apagar é
      recusado mas ver/criar/editar funciona; atribuir um director de turma e confirmar
      que vê presenças/notas da turma inteira sem poder editar disciplinas alheias.
- [x] 6.3 Actualizar `CHANGELOG.md` e `docs/specs/README.md`.
