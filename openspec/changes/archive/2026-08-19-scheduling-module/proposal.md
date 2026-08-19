## Why

A escola ainda não tem forma de montar o horário lectivo — `ScheduleEntry`, `TimeSlot` e
`Room` já existem no schema e são a base de Presenças (`AttendanceSession` liga-se a um
`ScheduleEntry`), mas até hoje só existem via `prisma/seed.ts`. O detector de conflitos
(`detectScheduleConflicts`/`conflictsForPlacement`/`isFree`,
`src/features/academic/domain/schedule-conflicts.ts`) já está construído e testado — falta
a interface que o utilize e as Server Actions que gravem uma colocação depois de validada.
Sem isto, uma escola real não consegue gerar `ScheduleEntry`s próprias, e o módulo de
Presenças (Fase 5) fica preso ao horário de demonstração semeado.

## What Changes

- **Definição de tempos lectivos** (`TimeSlot`) por turno — dia da semana, hora de início/
  fim, ordem — gerida pelo gestor, molde igual ao resto de `academic-configuration`.
- **Grelha de montagem do horário** (`/horarios`), por turma, professor ou sala: colocar um
  agrupamento lectivo (`TeachingGroup`) num tempo, com os quatro conflitos possíveis —
  professor, sala, agrupamento (protegidos por índice único **e** verificados no domínio) e
  **aluno** (só verificável no domínio, porque uma matrícula pertence a vários agrupamentos
  ao mesmo tempo) — explicados ANTES de gravar, nunca depois.
- **Aviso, não bloqueio**, quando uma colocação faz um professor exceder
  `Teacher.maxWeeklyHours`.
- **Consulta do horário** por professor e por aluno (`/meu-horario`), legível em telemóvel
  sem scroll horizontal — reutiliza a mesma leitura para os dois papéis.
- **Exportação para impressão** do horário de uma turma.

## Capabilities

### New Capabilities

- `timetable-authoring`: definição de `TimeSlot` e de `Room` (nenhuma das duas tem CRUD
  ainda — descoberto ao ler o schema, ver design.md), grelha de montagem do horário,
  colocação de agrupamentos com verificação de conflitos (professor/sala/agrupamento/aluno)
  antes de gravar, aviso de carga horária excedida.
- `timetable-viewing`: consulta do horário por professor e por aluno, e exportação da
  grelha de uma turma para impressão.

### Modified Capabilities

(nenhuma — `attendance` já assume `ScheduleEntry` como pré-requisito, mas nenhum requisito
seu muda; passa apenas a ter dados reais em vez de só os do seed.)

## Impact

- **Novo**: `src/features/academic/data/scheduling.ts` (leitura), `actions/place-schedule-entry.ts`,
  `actions/create-time-slot.ts`, `actions/create-room.ts` (escrita), `ui/schedule-board.tsx`
  (grelha de montagem), páginas `/horarios`, `/horarios/professor/[id]`, `/meu-horario`.
- **Reutilizado, sem alterações**: `detectScheduleConflicts`/`conflictsForPlacement`/
  `isFree` (`domain/schedule-conflicts.ts`, já testados), `ScheduleEntry`/`TimeSlot`/`Room`
  (schema já existe, com os três índices únicos).
- **Consumido por**: Presenças (`AttendanceSession.scheduleEntryId`), que passa a ter
  `ScheduleEntry`s reais de uma escola em vez de só as do seed.
