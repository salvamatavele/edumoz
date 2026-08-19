## Why

Hoje só há cinco papéis fixos (`PLATFORM_ADMIN`, `SCHOOL_MANAGER`, `TEACHER`, `GUARDIAN`,
`STUDENT`) e a autorização está toda escrita à mão em 16 Server Actions
(`isSchoolAdministrator(...)` ou uma comparação de posse), sem nenhum sítio onde uma escola
defina os seus próprios cargos (Director, Director-adjunto, Secretaria, …) nem o que cada
um pode ver, criar, editar ou apagar. Além disso, o "superadmin" está partido: o campo
`User.isPlatformAdmin` existe na base de dados e o utilizador semeado tem-no a `true`, mas
**nenhuma sessão o transporta** — todas as 23 chamadas a `SessionContext` no código fixam
`isPlatformAdmin: false`, e nenhuma `Membership` tem `role: PLATFORM_ADMIN`. E "director de
turma" já tem campo no schema (`ClassGroup.headTeacherId`) mas nunca foi usado em lado
nenhum — um professor não vê hoje mais do que os seus próprios agrupamentos, mesmo sendo o
director de uma turma inteira.

## What Changes

- **Superadmin a sério**: `isPlatformAdmin` passa a viajar na sessão (JWT), e um
  superadmin passa a ter acesso total, a qualquer escola, sem depender de nenhuma
  `Membership`.
- **Papéis de escola configuráveis**: um catálogo fixo de recursos (alunos, matrículas,
  presenças, notas, fecho de trimestre, pautas, estrutura académica, professores, esquemas
  de avaliação) × acções (ver, criar, editar, apagar) — fixo porque corresponde ao que a
  aplicação sabe mesmo impor; o que passa a ser configurável é QUAIS combinações um papel
  de escola concede. Um gestor com permissão para gerir papéis cria "Director",
  "Director-adjunto", "Secretaria" (ou o que precisar), escolhe as permissões de cada um, e
  atribui-os a membros do pessoal.
- **Director de turma vê a turma inteira**: um professor que seja `ClassGroup.headTeacher`
  passa a ver presenças e notas de TODOS os alunos dessa turma, em todas as disciplinas —
  não só dos seus próprios agrupamentos lectivos.
- **Migração sem quebrar o que já existe**: `SCHOOL_MANAGER` sem nenhum papel
  configurável atribuído continua com acesso total (o mesmo que tem hoje) — a atribuição
  de um papel configurável é uma restrição opcional, não obrigatória, para escolas que
  ainda não a usaram.

## Capabilities

### New Capabilities
- `platform-admin-access`: `isPlatformAdmin` corrigido de ponta a ponta (JWT, sessão,
  `SessionContext`) — acesso total a qualquer escola, sem depender de `Membership`.
- `configurable-roles`: catálogo de permissões (recurso × acção), papéis de escola
  configuráveis, atribuição de um papel a um membro do pessoal.
- `homeroom-teacher-scope`: um professor `ClassGroup.headTeacher` vê presenças e notas de
  toda a turma, em qualquer disciplina.

### Modified Capabilities
- `academic-structure`: o formulário de criar/editar `ClassGroup` ganha o campo
  `headTeacherId` (opcional) — hoje só existe no schema, nunca exposto na interface.

## Impact

- `prisma/schema.prisma` — modelos novos: `Permission` (catálogo fixo, semeado),
  `PermissionRole` (papel configurável, por escola), `RolePermission` (junção); `Membership`
  ganha `permissionRoleId` opcional. Migração nova.
- `src/lib/auth/config.ts`, `src/types/next-auth.d.ts` — `isPlatformAdmin` no JWT/sessão.
- `src/features/identity/domain/access.ts` — `hasPermission(context, resource, action)`
  novo, ao lado de (não substituindo) `isSchoolAdministrator`.
- `src/features/identity/actions/`, `.../data/`, `.../ui/` — gestão de papéis
  configuráveis (criar papel, marcar permissões, atribuir a um membro).
- `src/features/academic/data/attendance.ts`, `.../grades.ts` — alargar a consulta do
  professor quando é director de turma.
- Server Actions existentes **não são reescritas nesta fase** — ver design.md, "Migração
  sem quebrar".
