Âmbito grande de propósito (ver proposal.md/design.md) — pensado para ser aplicado por
etapas, não tudo de uma vez. O grupo 1-3 (lançamento de notas) já dá valor sozinho, sem
esperar pelo fecho de trimestre (grupo 4), pauta (grupo 5) ou vista do aluno (grupo 6) —
tal como aconteceu com `academic-configuration`.

## 1. Domínio — resolução do esquema aplicável

- [x] 1.1 `src/features/academic/domain/grade-engine.ts` — acrescentar
      `resolveApplicableScheme(schemes, { gradeLevelId, subjectId })`, pura, devolvendo o
      esquema mais específico (gradeLevel+subject → subject → gradeLevel → base do ano) ou
      `null` se nenhum se aplicar. Testes: as quatro combinações de especificidade, e o
      caso sem nenhum esquema.
- [x] 1.2 `src/features/academic/domain/grade-schema.ts` — Zod para o delta de notas
      lançadas: `{ assessmentId, changes: [{ enrollmentId, score?, isAbsent, note? }] }`,
      mesma forma "esquema + array" que `submitAttendanceSchema` já usa.

## 2. Dados & Server Actions — avaliações e lançamento de notas

- [x] 2.1 `src/features/academic/data/grades.ts` — `findTeacherByUserId` (reutilizar de
      `data/attendance.ts`, não duplicar), `listTeacherTeachingGroups` (agrupamentos do
      professor no ano activo, com o esquema aplicável resolvido via
      `resolveApplicableScheme` — dá os componentes disponíveis), `listTeachingGroupAssessments`
      (agrupamento × trimestre → `Assessment`s já criadas, por componente), `getGradeRoster`
      (membros do agrupamento + notas já lançadas de uma `Assessment`).
- [x] 2.2 `src/features/academic/domain/assessment-entry-schema.ts` — Zod para criar uma
      `Assessment` (nome, `componentId`, `termId`, `maxScore`, `weight`, `date`).
- [x] 2.3 `createAssessment` (`src/features/academic/actions/create-assessment.ts`) —
      autorização por posse do `TeachingGroup` (mesmo padrão de `submit-attendance.ts`, não
      `isSchoolAdministrator`); `componentId` tem de pertencer ao esquema aplicável ao
      agrupamento (validado no servidor, não confiado do cliente); `AuditLog`.
- [x] 2.4 `recordGrades` (`src/features/academic/actions/record-grades.ts`) — Zod (forma) →
      resolve `TeachingGroupMember` no servidor (nunca confia em `enrollmentId`s do
      cliente) → autorização por posse do `TeachingGroup` → transacção (`Grade.upsert` por
      alteração) → `AuditLog`.
- [x] 2.5 Testes de `createAssessment` e `recordGrades`: autorização (professor dono aceita,
      outro professor e gestor recusam), validação, escrita, `AuditLog`, `enrollmentId`
      estranho ao agrupamento é ignorado, `componentId` estranho ao esquema é recusado.

## 3. UI — avaliações e grelha de lançamento

- [x] 3.0 `src/features/academic/ui/create-assessment-button.tsx` — gatilho + `FormModal`
      para o professor criar uma `Assessment` num componente/trimestre do seu agrupamento
      (molde de `create-student-button.tsx`).
- [x] 3.1 `src/features/academic/ui/grade-sheet.tsx` (client) — molde de
      `attendance-sheet.tsx`: `useState` local (não `useOptimistic`), média ao vivo via
      `computeSubjectResult` (mesmo módulo do servidor), notas explicativas do motor em
      texto legível, delta calculado ao submeter.
- [x] 3.2 `src/app/[locale]/(dashboard)/grades/page.tsx` (rota — nome pt/en a decidir ao
      implementar, ex. `/notas`) — lista de agrupamentos/avaliações do professor, molde de
      `/presencas`.
- [x] 3.3 `routing.pathnames` + `PROTECTED_PATHNAMES` — rota nova; `(dashboard)/layout.tsx`
      — `TEACHER` ganha a ligação; `dashboard-shell.tsx` — ícone novo.
- [x] 3.4 `messages/{pt,en}.json` — namespace novo, incluindo a tabela de texto das
      `SubjectResult.notes` (`assessment-module.md` §3.4 já tem a cópia em pt).
- [x] 3.5 Teste de componente de `grade-sheet.tsx` (mesmo padrão de
      `attendance-sheet.test.tsx`).

## 4. Fecho de trimestre

- [x] 4.1 `src/features/academic/data/term-results.ts` — `listOpenTerms`,
      `listTermClosingScope` (todas as matrículas activas × disciplinas do seu percurso,
      para um `Term`).
- [x] 4.2 `closeTerm` (`src/features/academic/actions/close-term.ts`) — só
      `isSchoolAdministrator`; recusa se `Term.status` já for `CLOSED`; para cada
      matrícula×disciplina resolve o esquema (`resolveApplicableScheme`), chama
      `computeSubjectResult`, grava `TermResult` (`schemeId`+`schemeVersion`); só no fim
      marca `Term.status = CLOSED`; tudo numa `$transaction`; `AuditLog`.
- [x] 4.3 Testes de `closeTerm`: autorização, recusa em trimestre já fechado, `TermResult`
      gravado com a versão correcta do esquema, disciplina sem notas não falha o fecho.
- [x] 4.4 UI — ecrã de fecho (gestor escolhe o trimestre, vê um resumo antes de confirmar
      — nunca um botão sem confirmação, dado o raio de acção). Rota nova ou secção de
      `/avaliacao`, a decidir ao implementar.
- [x] 4.5 `messages/{pt,en}.json` — textos do ecrã de fecho e confirmação.

## 5. Pauta

- [x] 5.1 `src/features/academic/data/report-cards.ts` — `getReportCard` (turma +
      disciplina + trimestre fechado → `TermResult`s), lê só de `TermResult`, nunca
      recalcula.
- [x] 5.2 UI — página imprimível em A4 (`print:` do Tailwind, molde de qualquer ecrã já
      preparado para impressão no projecto, se existir; senão CSS `@media print` novo).
- [x] 5.3 `messages/{pt,en}.json` — textos da pauta.
- [x] 5.4 Teste de `getReportCard`: só trimestres fechados, colunas correctas.

## 6. Vista do aluno/encarregado

- [x] 6.1 `src/features/academic/data/student-grades.ts` — `getOwnGrades` (aluno: as suas
      matrículas; encarregado: as dos seus educandos com `GuardianRelationship` activa),
      só trimestres `CLOSED`.
- [x] 6.2 `src/app/[locale]/(dashboard)/portal/page.tsx` — deixa de estar vazio; mostra os
      `TermResult` do próprio aluno ou, para encarregado com mais de um educando, um
      selector.
- [x] 6.3 `messages/{pt,en}.json` — textos do portal.
- [x] 6.4 Testes de `getOwnGrades`: aluno só vê as suas, encarregado só vê educandos com
      relação válida, trimestre `OPEN` não aparece.

## 7. Verificação

- [x] 7.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 7.2 Verificação manual: como professor, lançar notas de um componente e ver a média
      ao vivo; como gestor, fechar o trimestre e confirmar que a pauta e o portal do aluno
      mostram os mesmos números; confirmar que alterar o esquema depois do fecho não muda
      o `TermResult` já gravado.
- [x] 7.3 Actualizar `CHANGELOG.md` (nova fase) e o estado de `docs/specs/README.md` /
      `docs/specs/assessment-module.md` (RF-01–RF-04 já cobertos por
      `academic-configuration`; RF-05–RF-10 cobertos por este change; nota de exame
      registada como fora de âmbito).
