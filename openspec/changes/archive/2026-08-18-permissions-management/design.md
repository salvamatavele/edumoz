## Context

A autorização actual tem duas camadas, nenhuma configurável:

1. `isSchoolAdministrator(context)` — `context.isPlatformAdmin || role === SCHOOL_MANAGER`.
   Usado em 13 Server Actions (estrutura académica, professores, esquemas de avaliação,
   fecho de trimestre). Binário: ou é gestor, ou não é.
2. Comparações de posse escritas à mão (`teachingGroup.teacherId !== teacher.id`) — 3
   Server Actions (presenças, notas, criação de avaliações). Também binário, por dono.

`context.isPlatformAdmin` está sempre a `false` — 23 sítios no código constroem
`SessionContext` com esse valor fixo, porque o JWT nunca o carregou (confirmado por leitura
de código: `src/lib/auth/config.ts`, `src/types/next-auth.d.ts`). O `User.isPlatformAdmin`
real só é lido em `sign-in.ts`, e só decide se o login é permitido — nunca chega à
`SessionContext` usada pelas Server Actions.

`ClassGroup.headTeacherId` existe desde a Fase 2 (`prisma/schema.prisma`, comentário
"Director de turma") mas nunca foi lido por nenhuma consulta, UI ou autorização.

## Goals / Non-Goals

**Goals:**
- Um verdadeiro superadmin (`isPlatformAdmin`) com acesso a qualquer escola, sem depender
  de `Membership`.
- Um gestor de escola pode criar papéis (Director, Director-adjunto, …) e escolher,
  recurso a recurso, o que cada um pode ver/criar/editar/apagar.
- Um professor `ClassGroup.headTeacher` vê presenças e notas de toda a turma.
- Nada do que já funciona hoje deixa de funcionar: uma escola que nunca crie um papel
  configurável continua exactamente como está.

**Non-Goals:**
- Reescrever as 16 Server Actions existentes para usarem o novo `hasPermission` — ficam
  como estão (`isSchoolAdministrator`/posse), que continuam válidas. `hasPermission` é o
  mecanismo para o que é NOVO a partir daqui (e para quando um papel configurável for
  atribuído — ver "Migração sem quebrar").
- Permissões por REGISTO individual (ex.: "só pode editar ESTE aluno") — o catálogo é por
  RECURSO (ex.: "alunos"), não por linha. Refinamentos desse tipo ficam para um caso de uso
  real.
- Papéis configuráveis partilhados entre escolas (templates globais) — cada escola cria os
  seus próprios, do zero. Reutilizar um "molde" fica para quando houver procura.
- Director de turma poder EDITAR notas/presenças de disciplinas que não lecciona — só vê
  (ver Goals). Editar continua limitado a quem lecciona a disciplina.

## Decisions

**Catálogo de recursos e acções é fixo no código, não editável pelo superadmin.** O
superadmin escolhe QUAIS combinações um papel concede, não INVENTA combinações novas — uma
permissão só existe se houver mesmo uma verificação no código a aplicá-la. Sem isto, um
superadmin poderia criar uma permissão "editar propinas" que nada respeita, e ninguém
saberia até uma reclamação. Recursos: `students`, `enrollments`, `attendance`, `grades`,
`term-closing`, `report-cards`, `academic-structure`, `teaching-staff`,
`assessment-schemes`. Acções: `view`, `create`, `edit`, `delete` — o pedido original
distinguia "editar" de "actualizar", mas são a mesma operação (mudar um registo
existente); usar as duas seria uma escolha sem diferença observável.

**`Permission` é uma tabela semeada (código + migração), não gerida por interface.**
`(resource, action)`, `@@unique`. `PermissionRole`/`RolePermission` é que são geridos pelo
gestor da escola — são estes que guardam A ESCOLHA, não o catálogo em si.

**`PermissionRole` é por escola, não um molde partilhado entre escolas.** Mesma razão que
`AssessmentScheme` é por escola: cada escola decide as suas próprias regras, e um `Director`
numa escola pode significar coisas diferentes noutra. `@@unique([schoolId, name])`.

**`Membership.permissionRoleId` é opcional, não substitui `Membership.role`.** `role`
continua a dizer QUE TIPO de pessoa é (professor, família, gestor) — isso está tecido em
`isFamilyRole`/`isStaffRole`/posse de `Teacher` e não muda. `permissionRoleId` só se aplica
a `Membership`s com `role: SCHOOL_MANAGER`, e é uma RESTRIÇÃO adicional sobre o que já é
verdade por defeito (acesso total). Sem `permissionRoleId`, um `SCHOOL_MANAGER` continua
com acesso total — exactamente o comportamento actual.

**`hasPermission(context, resource, action)` novo em `access.ts`, ao lado de
`isSchoolAdministrator`, não a substituir.**
```
hasPermission(context, resource, action):
  se context.isPlatformAdmin → true (superadmin nunca é restringido)
  se context.role !== SCHOOL_MANAGER → false (só gestores têm papéis configuráveis)
  se não há permissionRoleId atribuído → true (comportamento actual, acesso total)
  senão → RolePermission tem (permissionRoleId, resource, action)?
```
Pura o suficiente para testar sem base de dados: recebe a lista de permissões do papel já
carregada (não faz a sua própria consulta), tal como `resolveApplicableScheme` recebe os
esquemas já carregados.

**Migração sem quebrar: as Server Actions existentes não mudam nesta fase.** Reescrever 16
ficheiros é um projecto à parte, com o seu próprio risco de regressão em autorização — a
superfície mais perigosa da aplicação para partir sem dar por isso. Esta fase entrega o
mecanismo (`hasPermission`, gestão de papéis) pronto a usar; migrar cada Server Action para
o consultar fica para quando houver um papel configurável real a precisar dele (ex.:
"Director-adjunto" sem permissão de apagar), verificado um de cada vez.

**`isPlatformAdmin` no JWT é um booleano simples, lido uma vez no `signIn`/`jwt`
callback.** Não muda com a troca de escola (ao contrário de `role`, que é por
`Membership`) — um superadmin é superadmin em qualquer escola, sempre.

**Director de turma: `listTeacherTeachingGroups`/`getAttendanceRoster`/`getGradeRoster`
passam a verificar `ClassGroup.headTeacherId === teacher.id` e, quando verdade, alargam a
leitura a todos os agrupamentos da turma — não só aos do professor.** Implementado como um
alargamento da CONSULTA (mais linhas devolvidas), não uma permissão nova — é sempre leitura,
nunca abre escrita em disciplinas que o professor não lecciona (ver Non-Goals).

## Risks / Trade-offs

**[Risk] Duas formas de autorizar em paralelo (`isSchoolAdministrator` e
`hasPermission`) até a migração completa.** Mitigado por serem aditivas — nenhuma Server
Action existente muda de comportamento nesta fase — e por `hasPermission` degradar sempre
para "acesso total" quando não há papel configurável atribuído, nunca para "acesso
negado" por omissão.

**[Risk] Um papel configurável mal desenhado (ex.: sem permissão de `view` em `students`)
pode confundir mais do que ajudar.** Mitigado pela UI mostrar sempre as permissões actuais
de um papel antes de o atribuir, e por um papel recém-criado começar sem nenhuma permissão
marcada (explícito, não um valor por omissão escondido).

**[Trade-off] Catálogo fixo de recursos/acções, não extensível pelo superadmin.** Aceite
(ver Decisões) — o alternativo (permissões arbitrárias sem correspondência no código) seria
pior: pareceria configurável mas não faria nada.

## Migration Plan

1. Migração Prisma: `Permission`, `PermissionRole`, `RolePermission`,
   `Membership.permissionRoleId`. Seed do catálogo fixo de `Permission` (código, não
   interface).
2. `isPlatformAdmin` no JWT/sessão — sem isto, nada do resto tem um superadmin real para
   testar contra.
3. `hasPermission` + testes, isolado, sem nenhum chamador ainda.
4. UI de gestão de papéis (criar, marcar permissões, atribuir a um membro) — só visível a
   quem já tem acesso total (gestor sem papel restrito, ou superadmin).
5. Director de turma — alargar as três consultas, com `headTeacherId` exposto no
   formulário de `ClassGroup` (`academic-structure`).

Sem passo de rollback dedicado: cada passo é aditivo (tabelas novas, campo opcional novo,
função nova) — reverter é remover o código/migração, não desfazer dados de produção.
