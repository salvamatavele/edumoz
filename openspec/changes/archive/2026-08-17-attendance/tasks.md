## 1. Domínio & dados

- [x] 1.1 `src/features/academic/domain/attendance.ts` — `computeAttendanceSummary(records)`
      e `isExcludedByAbsences(summary, rule)`, puras, sem Prisma. `rule` como argumento, não
      constante — o número exacto está por confirmar (ver design.md).
- [x] 1.2 Mesmo ficheiro — `todaysDayOfWeek(date: Date): DayOfWeek`, pura, mapeia
      `Date.getDay()` para o enum `DayOfWeek`.
- [x] 1.3 `src/features/academic/data/attendance.ts` — `findTeacherByUserId(schoolId,
      userId)`: primeira ponte sessão → perfil profissional; devolve `null` se não houver
      `Teacher` ligado.
- [x] 1.4 Mesmo ficheiro — `listTeacherScheduleForDate(schoolId, teacherId, date)`:
      `ScheduleEntry` do professor cujo `timeSlot.dayOfWeek` corresponde à data, ordenado
      por `timeSlot.order`; para cada entrada, o estado da `AttendanceSession` desse dia
      se existir (`DRAFT`/`SUBMITTED`/nenhuma).
- [x] 1.5 Mesmo ficheiro — `getAttendanceRoster(schoolId, scheduleEntryId, date)`: alunos
      do agrupamento (`TeachingGroupMember` → `Enrollment` → `Student`) com o registo
      existente ou `PRESENT` por omissão.
- [x] 1.6 Mesmo ficheiro — `getAttendanceReport(schoolId, classGroupId, termId)`: registos
      agregados por aluno e disciplina, para o mapa da direcção.

## 2. Server Actions

- [x] 2.1 `src/features/academic/actions/submit-attendance.ts`, `"use server"` — `auth()`,
      confirma que o professor autenticado é o dono da `ScheduleEntry` da sessão (não só
      `isSchoolAdministrator`, é dono específico); cria a `AttendanceSession` se não
      existir, grava só o delta (`AttendanceRecord` upsert em lote) numa transacção com
      `AuditLog`, marca `SUBMITTED`.
- [x] 2.2 `src/features/academic/actions/reopen-attendance.ts`, `"use server"` — só
      `isSchoolAdministrator` ou o professor dono; `SUBMITTED` → `DRAFT`, `AuditLog` com o
      estado anterior dos registos.
- [x] 2.3 `src/features/academic/domain/attendance-schema.ts` — Zod para o payload do
      delta (`sessionId`/`scheduleEntryId`, `date`, lista de `{ enrollmentId, status,
      minutesLate?, note? }`), partilhado cliente/servidor.

## 3. UI

- [x] 3.1 `src/app/[locale]/(dashboard)/attendance/page.tsx` (`/presencas` pt,
      `/attendance` en) — lista de `listTeacherScheduleForDate` para a data escolhida
      (selector de data, por omissão hoje), estado vazio explícito sem aulas nesse dia.
- [x] 3.2 `src/app/[locale]/(dashboard)/attendance/[scheduleEntryId]/page.tsx` — a folha:
      `useOptimistic` sobre os registos, alternância por toque (Presente → Falta →
      Atrasado → Justificado, sem diálogo), botão de submeter que chama
      `submitAttendance`.
- [x] 3.3 `src/app/[locale]/(dashboard)/attendance-report/page.tsx`
      (`/turmas/assiduidade` pt/en) — selectores de turma e período, tabela por aluno com
      contagem de faltas por disciplina (`getAttendanceReport`).
- [x] 3.4 `routing.pathnames` + `PROTECTED_PATHNAMES` — novas rotas.
- [x] 3.5 `(dashboard)/layout.tsx` — `navItems` passa a variar por `role`: `TEACHER` →
      "Presenças"; `isSchoolAdministrator` → "Alunos" + "Assiduidade"; família → "Portal"
      (sem alterar `DashboardShell`, só a lista que o layout lhe passa).

## 4. Internacionalização

- [x] 4.1 Novo namespace `attendance` em `messages/{pt,en}.json` — títulos, estados
      (Presente/Falta/Atrasado/Justificado), mensagens vazias, rótulos da navegação.
- [x] 4.2 `src/i18n/messages.test.ts` continua verde (paridade).

## 5. Tests

- [x] 5.1 Testes unitários de `computeAttendanceSummary`, `isExcludedByAbsences`,
      `todaysDayOfWeek`.
- [x] 5.2 `submit-attendance.test.ts` (mocks de `next-intl/server`, `@/i18n/navigation`,
      `next/cache`, `@/lib/auth/config`, mesmo padrão de `enroll-student.test.ts`): recusa
      um professor que não é dono da `ScheduleEntry`, grava só o delta, fecha a sessão,
      regista `AuditLog`.
- [x] 5.3 `reopen-attendance.test.ts`: só dono ou administrador; `AuditLog` com estado
      anterior.
- [x] 5.4 Teste de componente da folha de marcação: alternar muda o ecrã antes de resolver
      a acção (mock), submeter chama a acção só com o delta.

## 6. Verificação

- [x] 6.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 6.2 Verificação manual: criar um utilizador de teste com `Teacher.userId` e
      `Membership` `TEACHER` ligados a um professor semeado com horário real (ex.: P001,
      segunda-feira), marcar uma sessão, submeter, confirmar o mapa de assiduidade como
      gestor. Apagar o utilizador de teste no fim.
- [x] 6.3 Actualizar `CHANGELOG.md` (nova fase) e `docs/specs/attendance.md` /
      `docs/specs/README.md` com o estado final.
