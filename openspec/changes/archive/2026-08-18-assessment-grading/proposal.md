## Why

O painel de configuração da fórmula (`AssessmentScheme` + `AssessmentComponent`, capability
`assessment-schemes`) já está construído e em produção — uma escola pode definir a sua fórmula
de cálculo de médias. Mas não há nenhum sítio onde um professor lance uma nota real, nenhuma
operação que feche um trimestre, nenhuma pauta, e nenhum ecrã onde um aluno ou encarregado de
educação veja um resultado. O motor de cálculo (`computeSubjectResult`,
`src/features/academic/domain/grade-engine.ts`) está pronto e testado (28 testes) desde a
Fase 2 — falta inteiramente a interface que o alimenta e que expõe os resultados.

## What Changes

- Grelha de lançamento de notas por professor: um `TeachingGroup` (agrupamento lectivo), um
  componente do esquema, um trimestre — toque a toque, com a média calculada ao vivo pelo
  MESMO motor que o servidor usa (nunca uma segunda implementação da fórmula em JavaScript).
- As `SubjectResult.notes` do motor (`COMPONENT_WITHOUT_GRADES`, `WEIGHTS_RENORMALISED`,
  `BELOW_COMPONENT_MINIMUM`, `NO_GRADES_AT_ALL`, etc.) aparecem em texto legível, junto da
  média — nunca só um número sem explicação.
- Operação de fecho de trimestre: para cada matrícula × disciplina do `Term`, corre
  `computeSubjectResult` e materializa `TermResult`, com `schemeId` **e** `schemeVersion`
  gravados (o esquema usado fica congelado no resultado, mesmo que a fórmula mude depois);
  marca `Term.status = CLOSED`.
- Pauta imprimível por turma e disciplina, em A4, a partir dos `TermResult` do trimestre.
- Aluno e encarregado de educação vêem as suas próprias notas publicadas — e nenhuma de
  outro aluno — no `/portal` (já existe como destino, ainda vazio de propósito desde a
  Fase 5).
- Todos os ecrãs seguem o molde já estabelecido (`create-student.ts`, `submit-attendance.ts`):
  Server Action com autorização, Zod partilhado onde há formulário, `AuditLog`.
- **Fora de âmbito** (ver design.md): entrada da nota de exame (`examScore`) — os campos de
  exame do esquema continuam por confirmar com uma escola real
  (`docs/specs/assessment-module.md` §3.1, já assinalado assim no próprio schema). O fecho de
  trimestre funciona sem exame: `computeSubjectResult` já trata `examScore: null` como
  "pendente", não "reprovado", quando `hasExam` está desligado.

## Capabilities

### New Capabilities
- `grade-entry`: grelha de lançamento de notas por professor — componente, trimestre, média
  ao vivo, notas explicativas do motor.
- `term-closing`: fecho de trimestre — materializa `TermResult` para todas as
  matrículas × disciplinas do `Term`, congela a versão do esquema usada, marca o trimestre
  como fechado.
- `report-cards`: pauta imprimível por turma e disciplina, a partir dos `TermResult`
  fechados.
- `student-grades`: aluno e encarregado de educação vêem as suas próprias notas publicadas,
  no `/portal`.

### Modified Capabilities
(nenhuma — `assessment-schemes` fica exactamente como está; este change consome os
`AssessmentScheme`/`AssessmentComponent` que já existem, não muda as suas regras.)

## Impact

- `src/features/academic/data/grades.ts`, `.../term-results.ts` (ou equivalente) — consultas
  tenant-scoped novas para `Assessment`, `Grade`, `TermResult`.
- `src/features/academic/domain/grade-schema.ts` (ou similar) — Zod para o delta de notas
  lançadas, mesma forma "esquema + array" que `submitAttendanceSchema` já usa.
- `src/features/academic/actions/` — `record-grades.ts` (ou `submit-grades.ts`),
  `close-term.ts` — Server Actions novas, mesmo molde das já existentes.
- `src/app/[locale]/(dashboard)/grades/` (nome de rota por confirmar em design.md) — grelha
  de lançamento, molde de `/presencas`.
- `src/app/[locale]/(dashboard)/portal/page.tsx` — deixa de estar vazio; ganha a vista de
  notas do aluno/encarregado.
- `messages/{pt,en}.json` — namespaces novos, incluindo a tabela de texto das `notes` do
  motor (`assessment-module.md` §3.4 já tem a cópia em pt).
- Sem alterações ao schema — `Assessment`, `Grade`, `TermResult`, `Term.status` já existem
  desde a Fase 2. Reutiliza `computeSubjectResult`/`grade-engine.ts`, já puro e testado.
