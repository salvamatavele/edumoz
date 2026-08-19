Âmbito grande de propósito (ver proposal.md) — pensado para ser aplicado por grupos, não
tudo de uma vez. Cada grupo é utilizável isoladamente: o grupo 1 (disciplinas) já dá valor
sozinho, sem esperar pelo grupo 5 (esquemas de avaliação).

## 1. Domínio & dados — disciplinas e estrutura

- [x] 1.1 `src/features/academic/domain/academic-structure-schema.ts` — Zod para
      `GradeLevel`, `Section`, `StudyPath`, `Subject`, `CurriculumSubject`, `ClassGroup`
      (um esquema por entidade, partilhados cliente/servidor).
- [x] 1.2 `src/features/academic/data/academic-structure.ts` — consultas de listagem
      (tenant-scoped, `getTenantDb`) para as seis entidades acima, e as opções resolvidas
      (`GradeLevel` para o selector de `StudyPath`, etc.).

## 2. Server Actions — estrutura académica

- [x] 2.1 `create-grade-level.ts`, `create-section.ts` — sem dependências de outras
      entidades; molde `create-student.ts`.
- [x] 2.2 `create-study-path.ts` — depende de `GradeLevel` (+ `Section` opcional); recusa
      com mensagem clara se não houver `GradeLevel` ainda.
- [x] 2.3 `create-subject.ts` — sem dependências.
- [x] 2.4 `create-curriculum-subject.ts` — depende de `StudyPath` + `Subject`; índice
      único `(studyPathId, subjectId)` mapeado a `fieldErrors`, mesmo padrão de
      `create-student.ts` para `code` duplicado.
- [x] 2.5 `create-class-group.ts` — depende do ano lectivo activo; recusa com mensagem
      clara se não houver.
- [x] 2.6 Todas as seis: só `isSchoolAdministrator`, `AuditLog`, `revalidatePath` da
      página de configuração.

## 3. Domínio, dados & Server Actions — professores e atribuições

- [x] 3.1 `src/features/academic/domain/teaching-staff-schema.ts` — Zod para `Teacher` e
      `TeachingGroup`.
- [x] 3.2 `src/features/academic/data/teaching-staff.ts` — listagem de professores e de
      atribuições, com as opções resolvidas (disciplinas, turmas, ano activo).
- [x] 3.3 `create-teacher.ts` — sem dependências; `userId` nunca faz parte do formulário
      (gerido só pela base de dados, ver design.md).
- [x] 3.4 `create-teaching-group.ts` — depende de `Subject` + `Teacher` + ano lectivo
      activo; recusa com mensagem clara se faltar alguma.
- [x] 3.5 Ambas: só `isSchoolAdministrator`, `AuditLog`, `revalidatePath`.

## 4. Domínio, dados & Server Actions — esquemas de avaliação

- [x] 4.1 `src/features/academic/domain/assessment-scheme-schema.ts` — Zod para
      `AssessmentScheme` e a lista de `AssessmentComponent` (mesma forma de "esquema +
      lista" que `enroll-student-schema.ts` não tem, mas `submit-attendance` tem para o
      delta — um objecto com um array aninhado).
- [x] 4.2 `src/features/academic/data/assessment-schemes.ts` — listagem de esquemas por
      ano/classe/disciplina, com os componentes.
- [x] 4.3 `create-assessment-scheme.ts` — Zod (forma) → `validateScheme` de
      `grade-engine.ts` (coerência: pesos somam 1.0000) → transacção (esquema +
      componentes) → `AuditLog`. Só `isSchoolAdministrator`.
- [x] 4.4 Mapear as falhas de `validateScheme` para `fieldErrors`/mensagem específica, não
      um erro genérico.

## 5. UI — página de configuração

- [x] 5.1 `src/app/[locale]/(dashboard)/settings/page.tsx` (rota — nome pt/en a decidir
      ao implementar, ex. `/configuracao`) — três secções (Estrutura académica,
      Professores, Avaliação), cada uma com a sua `DataTable` + botão que abre um
      `FormModal`.
- [x] 5.2 Cada `FormModal` reutiliza os Zod schemas dos grupos 1/3/4; nenhuma validação
      duplicada entre cliente e servidor.
- [x] 5.3 Selectores que dependem de outra entidade (`StudyPath`→`GradeLevel`,
      `CurriculumSubject`→`StudyPath`+`Subject`, `TeachingGroup`→`Subject`+`Teacher`,
      `AssessmentScheme`→`GradeLevel`+`Subject` opcionais) mostram "crie X primeiro"
      quando a lista de opções está vazia, em vez de um selector vazio.
- [x] 5.4 Campos de exame do esquema de avaliação (`hasExam` e os que dependem dele)
      mostram o aviso "ainda por confirmar com uma escola real" (RNF da spec
      `assessment-schemes`).
- [x] 5.5 `routing.pathnames` + `PROTECTED_PATHNAMES` — rota nova.

## 6. Navegação

- [x] 6.1 `(dashboard)/layout.tsx` — `isSchoolAdministrator` ganha "Configuração" em
      `navItems`, ao lado de "Alunos" e "Assiduidade".
- [x] 6.2 `dashboard-shell.tsx` — ícone novo em `NAV_ICONS` para a rota de configuração.

## 7. Internacionalização

- [x] 7.1 Novo namespace (ou namespaces) em `messages/{pt,en}.json` para as três secções —
      títulos, campos, mensagens de "crie X primeiro", aviso dos campos de exame.
- [x] 7.2 `src/i18n/messages.test.ts` continua verde (paridade).

## 8. Tests

- [x] 8.1 Testes das seis Server Actions de estrutura académica (grupo 2): autorização,
      validação, escrita, `AuditLog`, mensagem clara quando falta uma dependência —
      mesmo padrão de `enroll-student.test.ts`.
- [x] 8.2 Testes de `create-teacher.ts`/`create-teaching-group.ts` (grupo 3).
- [x] 8.3 Testes de `create-assessment-scheme.ts` (grupo 4): inclui o caso de
      `validateScheme` recusar pesos que não somam 1.0000.
- [x] 8.4 Teste de componente de pelo menos um `FormModal` desta página (mesmo padrão de
      `enroll-student-button.test.tsx`).

## 9. Verificação

- [x] 9.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 9.2 Verificação manual como gestor: criar uma classe, uma secção, um percurso, uma
      disciplina, associar disciplina a percurso, criar uma turma, criar um professor,
      atribuir a uma disciplina/turma, criar um esquema de avaliação com componentes que
      somam 1.0000, e confirmar que os dados criados aparecem correctamente em Presenças
      (turma/disciplina reais, não só semeadas).
- [x] 9.3 Actualizar `CHANGELOG.md` (nova fase) e o estado dos specs relevantes em
      `docs/specs/README.md`.
