## Context

O motor de cálculo (`computeSubjectResult`, `validateScheme`,
`src/features/academic/domain/grade-engine.ts`) e os modelos de dados (`Assessment`, `Grade`,
`TermResult`, `Term`) existem desde a Fase 2, testados e por usar. `assessment-schemes`
(change `academic-configuration`, já arquivado) deu à escola uma interface para CRIAR
`AssessmentScheme`/`AssessmentComponent` — mas nunca construiu a leitura do lado do motor:
não há hoje nenhuma função que, dada uma classe e uma disciplina, decida QUAL esquema se
aplica. Esse requisito já está escrito na capability `assessment-schemes`
(`openspec/specs/assessment-schemes/spec.md`, "Esquema geral do ano vs. esquema específico")
mas nunca foi implementado — só especificado. Este change implementa essa resolução, porque
é o primeiro consumidor real que precisa dela.

`submit-attendance.ts`/`attendance-sheet.tsx` (Fase 6) são o molde mais próximo: grelha
cliente com estado local, delta calculado ao submeter, Server Action que nunca confia em
`enrollmentId`s do cliente e volta a resolver `TeachingGroupMember` no servidor, autorização
por posse do `TeachingGroup` (o professor dono), não `isSchoolAdministrator`.

## Goals / Non-Goals

**Goals:**
- Um professor lança notas de um componente, num trimestre, para o seu agrupamento lectivo,
  com a média calculada ao vivo pelo mesmo motor que o fecho de trimestre vai usar.
- Fechar um trimestre materializa `TermResult` para todas as matrículas × disciplinas
  desse `Term`, com a versão do esquema congelada no resultado.
- Pauta imprimível por turma/disciplina, a partir dos `TermResult` fechados.
- Aluno e encarregado de educação vêem só as suas próprias notas publicadas.
- A resolução "qual esquema se aplica a esta classe+disciplina" (mais específico
  gradeLevel+subject → subject → gradeLevel → base do ano) fica numa função pura,
  reutilizada pela grelha de lançamento E pelo fecho de trimestre — nunca duas
  implementações da mesma regra.

**Non-Goals:**
- Nota de exame (`examScore`) — os campos de exame do esquema continuam por confirmar com
  uma escola real (`docs/specs/assessment-module.md` §3.1). `computeSubjectResult` já trata
  `examScore: null` como "pendente" quando `hasExam` está desligado, e o esquema semeado tem
  `hasExam: false` — o fecho de trimestre funciona sem isto. Fica para quando as regras
  estiverem confirmadas.
- Reabrir um trimestre fechado (o `submit-attendance`/`reopen-attendance` tem esse padrão,
  mas fechar um trimestre tem um raio de acção maior — todas as disciplinas, todos os
  alunos — e reabrir isso precisa de uma decisão própria sobre o que acontece a
  `TermResult`s já publicados a encarregados de educação. Fica para quando houver um caso
  de uso real).
- Editar ou apagar uma nota depois de lançada com histórico próprio de alterações — fica só
  no `AuditLog`, sem interface dedicada (mesma decisão que `academic-configuration` tomou
  para editar/apagar entidades de configuração).
- Exames nacionais e a sua importação, recursos/melhoria de nota (já assinalado como fora de
  âmbito em `assessment-module.md` §5).

## Decisions

**Resolução do esquema aplicável fica numa função pura nova,
`resolveApplicableScheme(schemes, { gradeLevelId, subjectId })`, em `grade-engine.ts`.**
Recebe a lista de `AssessmentScheme` do ano lectivo activo (já filtrados por
`getTenantDb`) e devolve o mais específico: (gradeLevelId E subjectId) → (só subjectId) →
(só gradeLevelId) → (nenhum, o esquema base do ano). Mesmo padrão de "função pura testada,
sem I/O" que `validateScheme`/`computeSubjectResult` já seguem — testável sem base de
dados, e reutilizada tanto pela grelha de lançamento (para saber os componentes e a escala)
como pelo fecho de trimestre (para saber a fórmula a aplicar a cada disciplina).

**O professor também cria a `Assessment` (a avaliação concreta — um teste, um trabalho —
dentro de um componente), não só lança notas nela.** Lacuna descoberta ao implementar: o
`tasks.md` original assumia `Assessment`s já existentes para a grelha listar, mas nada as
cria. `Assessment.weight` ("peso desta avaliação dentro do seu componente, quando o
componente tem várias") já mostra que o schema foi pensado para várias avaliações por
componente — um professor pode querer dois testes dentro de "AT", cada um com o seu peso.
Em vez de esconder essa flexibilidade com uma avaliação automática por componente, o
professor cria as suas avaliações explicitamente (nome, data, `maxScore`, `weight`), com o
mesmo molde `FormModal`+Server Action de sempre, autorizado por posse do `TeachingGroup`
(mesma autorização de `recordGrades`, não `isSchoolAdministrator`).

**A grelha de lançamento segue exactamente a forma de `attendance-sheet.tsx`: estado local
com `useState`, não `useOptimistic`.** Mesmo motivo documentado no change de Presenças —
alternar uma nota não deve reverter antes do professor submeter explicitamente. O componente
recebe `initialEntries` (uma linha por matrícula do agrupamento, com as notas já lançadas
desse componente/trimestre) e só envia ao servidor as linhas que mudaram.

**A média ao vivo, no cliente, chama `computeSubjectResult` directamente — o mesmo módulo
que o servidor usa, não uma cópia.** `grade-engine.ts` é puro (sem Prisma, sem `"use
server"|"use client"`), por isso corre nos dois lados sem duplicação. É a mesma garantia que
`assessment-module.md` §3.2 já exigia antes deste change existir.

**`recordGrades` (a Server Action da grelha) autoriza por posse do `TeachingGroup`, como
`submit-attendance.ts` — não por `isSchoolAdministrator`.** Lançar notas é acto de sala de
aula, não de gestão; um gestor não deve poder lançar notas em nome de um professor. Nunca
confia em `enrollmentId`s do payload: volta a resolver `TeachingGroupMember` no servidor e
filtra por eles, tal como `submit-attendance.ts` já faz para presenças.

**`closeTerm` é a única acção sob `isSchoolAdministrator`.** Ao contrário do lançamento,
fechar um trimestre afecta todas as disciplinas e todos os alunos da escola — é uma decisão
de gestão, não de uma sala de aula. Corre numa única `$transaction`: para cada
`Enrollment` activa × `Subject` do seu percurso, resolve o esquema aplicável, chama
`computeSubjectResult` com as notas já lançadas, grava `TermResult`
(`schemeId`+`schemeVersion` congelados), e só no fim marca `Term.status = CLOSED`. Uma
falha a meio não deixa o trimestre parcialmente fechado.

**A pauta e a vista do aluno/encarregado leem só de `TermResult`, nunca recalculam.** Depois
de um trimestre fechado, o resultado é o que está gravado — mesmo que a fórmula mude
depois (é para isto que serve `schemeVersion`). Ler `Grade`/`Assessment` directamente nestes
dois ecrãs reabriria a porta a um número diferente do que foi fechado.

## Risks / Trade-offs

**[Risk] `resolveApplicableScheme` é uma peça nova que a capability `assessment-schemes` já
prometia mas nunca implementou — um erro aqui afecta directamente que fórmula um aluno
recebe.** Mitigado por ser função pura, testada isoladamente antes de qualquer ligação à
grelha ou ao fecho, com casos de teste explícitos para as quatro combinações de
especificidade.

**[Risk] Fechar um trimestre é uma operação com raio de acção grande (todas as disciplinas,
todos os alunos) e sem forma de reabrir nesta fase.** Mitigado por ficar só sob
`isSchoolAdministrator`, e por um ecrã de confirmação explícito antes de correr — não é um
botão que se carrega sem querer.

**[Trade-off] Sem edição/histórico de notas com interface própria.** Aceite para esta fase
(ver Non-Goals) — o `AuditLog` regista o lançamento, e revisitar fica para quando houver um
caso de uso real de correcção.
