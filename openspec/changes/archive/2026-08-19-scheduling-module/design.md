## Context

`ScheduleEntry`, `TimeSlot` e `Room` já existem no schema, com os três índices únicos que
protegem professor, sala e agrupamento contra duas colocações no mesmo tempo
(`@@unique([academicYearId, teacherId, timeSlotId])`, idem para `roomId` e
`teachingGroupId`). O quarto conflito — um ALUNO em duas aulas ao mesmo tempo, porque uma
matrícula pertence a vários agrupamentos — não é exprimível como índice, e por isso já
existe como função pura testada: `detectScheduleConflicts`/`conflictsForPlacement`/`isFree`
em `src/features/academic/domain/schedule-conflicts.ts`, sobre os tipos de
`domain/scheduling.ts` (`ScheduleEntryCandidate`, `TeachingGroupMembership`,
`ScheduleConflict`). Nenhuma das duas foi escrita para esta change — já lá estavam,
prontas a ser chamadas por uma interface que ainda não existe.

**Descoberto ao ler o schema (mesmo padrão do `Assessment` em `assessment-grading`): nem
`TimeSlot` nem `Room` têm CRUD algum.** Sem eles, uma escola real não tem onde colocar uma
aula — só os tempos/salas semeados por `prisma/seed.ts` existem hoje. Ambos entram nesta
change, como ecrãs de suporte dentro de `timetable-authoring`, não como capabilities à
parte: são pré-requisitos da grelha, não destino em si.

Presenças (`AttendanceSession.scheduleEntryId`) já depende de `ScheduleEntry` existir —
hoje só funciona porque o seed cria alguns. Esta change não muda nenhum requisito de
Presenças; só deixa de haver só dados de demonstração.

## Goals / Non-Goals

**Goals:**
- Uma escola real consegue definir os seus próprios tempos lectivos e salas.
- Montar o horário com os quatro conflitos (professor, sala, agrupamento, aluno)
  explicados ANTES de gravar — nunca um "não foi possível" sem razão.
- Professor e aluno consultam o seu horário, incluindo em telemóvel.
- Imprimir o horário de uma turma.

**Non-Goals** (ver também docs/specs/scheduling-module.md §6):
- Geração automática de horários — este change é só montagem manual assistida por
  detecção de conflitos, nunca um solver.
- Aulas quinzenais/alternadas (semana A/B) — os índices únicos não têm paridade de semana;
  se aparecer a necessidade, é migração à parte (já assumido na Fase 2).
- Substituição de professores.
- Gestão de salas por capacidade (ex.: impedir uma turma de 40 alunos numa sala de 30) — a
  `Room.capacity` existe no schema mas fica só informativa nesta fase.

## Decisions

**Duas capabilities, não uma — `timetable-authoring` (gestor) e `timetable-viewing`
(professor/aluno).** Mesmo padrão de `assessment-grading` (lançamento vs. consulta): são
autorizações diferentes (`isSchoolAdministrator` vs. posse/matrícula própria) e ritmos de
mudança diferentes — a grelha de montagem é complexa e muda pouco depois de estável; a
consulta é simples e é usada todos os dias.

**A verificação corre duas vezes, com a MESMA função pura, nunca duas implementações.**
`conflictsForPlacement` corre no cliente (resposta imediata ao arrastar/escolher) e outra
vez no servidor, dentro da transacção que grava — porque o cliente pode estar a trabalhar
sobre um horário que já mudou entretanto (outro gestor a montar ao mesmo tempo). O servidor
nunca confia no "sem conflitos" que o cliente reportou; recarrega o horário actual da
`academicYearId`, volta a chamar `conflictsForPlacement`, e só grava se continuar vazio.
Os três índices únicos ficam como rede de segurança final contra condições de corrida
entre o recarregamento e a escrita — nunca a primeira linha de defesa.

**Conflitos traduzem-se na UI a partir do `kind` + ids, nunca uma mensagem genérica.**
Mesmo padrão de `describeSchemeError` (`create-assessment-scheme.ts`): cada
`ScheduleConflict` já traz os ids necessários (`teacherId`, `roomId`, `teachingGroupIds`,
`enrollmentId`); a Server Action e o componente resolvem esses ids para nomes só na
apresentação, nunca no domínio.

**`STUDENT_DOUBLE_BOOKED` agrega por contagem, não por lista de nomes.** Um conflito de
aluno pode envolver dezenas de matrículas simultaneamente (duas disciplinas de Secção
sobrepostas atingem todos os alunos dos dois lados); listar nomes não ajuda a decidir, o
número ajuda. A UI mostra "N alunos" com a contagem de `enrollmentId`s distintos por
`teachingGroupIds`, não os nomes um a um.

**Excesso de `maxWeeklyHours` é aviso, nunca bloqueio.** Verificado depois de
`conflictsForPlacement` devolver vazio — é informativo, soma as horas do professor no
`academicYearId` incluindo a colocação candidata, e não impede gravar. `maxWeeklyHours` é
opcional no schema (`Int?`); sem valor definido, não há aviso a dar.

**`TimeSlot`/`Room` seguem o molde de `academic-configuration`** (`EntitySection` +
`FormModal`, Zod dos dois lados) — nenhuma das duas precisa de formulário próprio como
`AssessmentSchemeSection`; são entidades simples.

## Risks / Trade-offs

**[Risk] Condição de corrida entre dois gestores a montar o horário ao mesmo tempo.**
Mitigado pelos três índices únicos (professor/sala/agrupamento×tempo) — mesmo que a
verificação em memória do servidor não apanhe a colisão (janela entre recarregar e
gravar), a escrita falha na base de dados. Só o conflito de ALUNO não tem essa rede,
porque não é exprimível como índice; aceite como risco residual — o mesmo cenário exigiria
dois gestores a colocar simultaneamente duas disciplinas que partilham alunos, no mesmo
segundo, o que a interface tornaria muito improvável ao mostrar o horário quase em tempo
real (revalidação após cada gravação).

**[Trade-off] Time slots não têm paridade de semana.** Aceite (ver Non-Goals) — o
alternativo (semana A/B desde já) complicaria os três índices únicos sem nenhuma escola
real a pedir isso ainda.

## Migration Plan

Sem migração de dados — `TimeSlot`, `Room`, `ScheduleEntry` já existem no schema, vazios
para qualquer escola que não seja a de demonstração. Passos de construção:

1. CRUD de `Room`/`TimeSlot` (pré-requisito da grelha).
2. Leitura do horário existente por `academicYearId` (`listScheduleEntries` ou
   equivalente), convertida para `ScheduleEntryCandidate[]`/`TeachingGroupMembership[]`.
3. `placeScheduleEntry` (Server Action): recarrega, `conflictsForPlacement`, aviso de
   `maxWeeklyHours`, grava em transacção.
4. Grelha de montagem (`/horarios`), client-side, chamando `conflictsForPlacement` a cada
   interacção antes de submeter.
5. Consulta (`/meu-horario`) e exportação para impressão — só leitura, sem verificação de
   conflitos nenhuma.
