## Why

O modelo de dados para presenças já existe desde a Fase 2 (`AttendanceSession`,
`AttendanceRecord`) mas não há nenhuma interface. Sem isto, nenhum professor consegue
marcar presenças na plataforma, e a direcção não tem visibilidade de assiduidade — que é o
módulo mais simples de ponta a ponta do roadmap (`docs/specs/README.md`) e o que valida o
padrão de mutação em lote (`useOptimistic` + Server Action) antes dos módulos com mais
superfície (Avaliação, Horários, Finanças).

## What Changes

- Ecrã de marcação para o professor: agrupamentos do dia (derivados do horário real —
  `ScheduleEntry`/`TimeSlot` — não escolhidos à mão), folha por agrupamento com todos os
  alunos "Presente" por omissão, alternância por toque sem confirmação.
- Server Action `submitAttendance`: grava só o delta (excepções ao "presente"), numa
  transacção, fecha a sessão (`DRAFT` → `SUBMITTED`).
- Reabrir uma sessão `SUBMITTED` fica registado em `AuditLog` (autor, estado antes/depois).
- Ecrã de mapa de assiduidade para a direcção: por turma, aluno e período, com contagem de
  faltas por disciplina.
- Navegação do painel (`(dashboard)/layout.tsx`, `docs/specs/role-shell.md`) ganha
  itens por papel: professor vê "Presenças" (marcação), gestor vê "Assiduidade" (mapa) —
  a lista de `navItems` deixa de ser um binário staff/família.

## Capabilities

### New Capabilities
- `attendance`: marcação de presenças por sessão lectiva (professor) e consulta de
  assiduidade agregada (direcção) — inclui a resolução do professor autenticado às suas
  próprias sessões lectivas do dia.

### Modified Capabilities
(nenhuma — `openspec/specs/` ainda não tem nenhuma capability arquivada; `role-shell` e
`enrollment-screen` são anteriores a este workflow ou ainda não foram arquivadas)

## Impact

- `src/features/academic/domain/attendance.ts` — `computeAttendanceSummary`,
  `isExcludedByAbsences` (regra configurável, número exacto por confirmar — ver
  `docs/specs/attendance.md` §3.3), `todaysDayOfWeek` (pura, mapeia `Date` → `DayOfWeek`).
- `src/features/academic/data/attendance.ts` — `findTeacherByUserId`, sessões do dia por
  professor (via `ScheduleEntry`), roster de um agrupamento (via `TeachingGroupMember`),
  mapa de assiduidade por turma/período.
- `src/features/academic/actions/submit-attendance.ts` — nova Server Action, molde
  `create-student.ts`/`enroll-student.ts`.
- `src/app/[locale]/(dashboard)/attendance/` (`/presencas`), rota nova em
  `routing.pathnames` + `PROTECTED_PATHNAMES`.
- `src/app/[locale]/(dashboard)/layout.tsx` — `navItems` passa a variar por papel
  (`TEACHER`, `SCHOOL_MANAGER`), não só staff/família.
- `messages/{pt,en}.json` — novo namespace `attendance`.
- Sem alterações ao schema — `AttendanceSession`/`AttendanceRecord`/`ScheduleEntry`/
  `TimeSlot` já existem desde a Fase 2.
