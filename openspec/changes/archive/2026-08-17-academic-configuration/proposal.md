## Why

Presenças (Fase 6) e o próximo módulo do roadmap (Avaliação) só funcionam hoje com dados
semeados por `prisma/seed.ts` — não há nenhum ecrã para uma escola real criar as suas
próprias classes, turmas, secções, disciplinas, atribuir professores, ou definir as regras
de cálculo de médias. O schema e o motor de avaliação já existem desde a Fase 2
(`AssessmentScheme`, `AssessmentComponent`, `validateScheme` em `grade-engine.ts`); falta
inteiramente a interface que os alimenta. Sem isto, a plataforma nunca sai do modo de
demonstração.

## What Changes

- Ecrãs de gestão para a taxonomia académica: níveis/classes (`GradeLevel`, com ou sem
  exame nacional), secções (`Section`), percursos (`StudyPath`), disciplinas (`Subject`) e
  a relação disciplina↔percurso (`CurriculumSubject`: tronco comum, de secção, currículo
  interno, com peso/coeficiente/carga horária).
- Ecrãs de gestão de professores (`Teacher`) e atribuição a turmas/disciplinas
  (`TeachingGroup`) — hoje só existem via seed.
- Ecrã de configuração de esquemas de avaliação (`AssessmentScheme` +
  `AssessmentComponent`): fórmula de cálculo de médias por classe/disciplina/ano, se há
  exame, pesos dos componentes — usa `validateScheme` (já existe, pura, testada) antes de
  gravar.
- Todos os ecrãs seguem o molde já estabelecido (`create-student.ts`,
  `enroll-student.ts`, `submit-attendance.ts`): Server Action com `isSchoolAdministrator`,
  `FormModal` + Zod partilhado, `AuditLog`.
- Nova secção "Configuração" na barra lateral do painel, visível só a
  `isSchoolAdministrator` — mais um ramo em `(dashboard)/layout.tsx`, que já resolve
  `navItems` por papel desde a Fase 6.

## Capabilities

### New Capabilities
- `academic-structure`: gestão de `GradeLevel`, `Section`, `StudyPath`, `Subject`,
  `CurriculumSubject` e `ClassGroup` (turma) — a taxonomia de que classes, secções,
  percursos, disciplinas e turmas a escola tem, e como se relacionam. Não inclui `Room`
  (sala) — `ClassGroup.homeRoomId` é opcional, e gerir salas fica com o horário
  (`scheduling-module.md`, spec #7), que é quem realmente as usa
  (`ScheduleEntry.roomId`, obrigatório).
- `teaching-staff`: gestão de `Teacher` e atribuição a `TeachingGroup` (professor ×
  disciplina × turma/secção).
- `assessment-schemes`: configuração de `AssessmentScheme`/`AssessmentComponent` — a
  fórmula de cálculo de médias por classe e disciplina, incluindo o regime de exame.

### Modified Capabilities
(nenhuma — `openspec/specs/` continua sem nenhuma capability arquivada; `role-shell` foi
implementado antes deste change usar o workflow OpenSpec, por isso não há uma spec-base
para gerar um delta. A entrada nova na barra lateral fica como requisito de
`academic-structure`, abaixo.)

## Impact

- `src/features/academic/data/academic-structure.ts`,
  `src/features/academic/data/teaching-staff.ts`,
  `src/features/academic/data/assessment-schemes.ts` — consultas tenant-scoped novas.
- `src/features/academic/domain/*-schema.ts` — Zod novos, um por entidade criável/editável.
- `src/features/academic/actions/` — Server Actions novas, mesmo molde das já existentes.
- `src/app/[locale]/(dashboard)/settings/` (nome de rota por confirmar em design.md) —
  páginas novas.
- `src/components/layout/dashboard-shell.tsx` — mais entradas em `NAV_ICONS`.
- `messages/{pt,en}.json` — namespaces novos.
- Sem alterações ao schema — todos os modelos já existem desde a Fase 2. Reutiliza
  `validateScheme`/`grade-engine.ts`, já pura e testada.
