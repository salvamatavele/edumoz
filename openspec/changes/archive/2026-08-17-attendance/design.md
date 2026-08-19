## Context

O modelo já existe (Fase 2): `AttendanceSession` (uma aula concreta, `DRAFT`/`SUBMITTED`) e
`AttendanceRecord` (uma matrícula nessa aula, `PRESENT`/`ABSENT`/`LATE`/`EXCUSED`). O que
falta é inteiramente interface — nenhuma Server Action, nenhuma página, nenhuma consulta.

O requisito que molda o resto é a velocidade: um professor tem 2-5 minutos no início da
aula, muitas vezes num telemóvel. Uma chamada de 45 alunos que exija 45 toques *e* 45
pedidos ao servidor não vai ser feita a tempo.

`ScheduleEntry` (`teacherId` + `teachingGroupId` + `timeSlotId` + `roomId`) e `TimeSlot`
(`dayOfWeek` + `startTime` + `shift`) também já existem e já têm dados reais no seed — a
"lista de agrupamentos do dia" do professor não precisa de nenhuma escolha manual, sai
directamente do horário: `ScheduleEntry` filtrado por `teacherId` e pelo `dayOfWeek` da
data escolhida.

Nenhum `Teacher` semeado tem `userId` — não há hoje nenhum login que resolva a um professor.
Vai ser preciso um utilizador de teste com `Teacher.userId` preenchido e uma `Membership`
`TEACHER` para verificar manualmente, tal como aconteceu com `GUARDIAN` na Fase 5.

## Goals / Non-Goals

**Goals:**
- Um professor marca presenças de uma sessão em segundos: abre, todos já "Presente", toca
  só nas excepções, submete.
- A submissão grava o delta numa única transacção, não um pedido por aluno.
- A direcção vê um mapa de assiduidade por turma, aluno e período, com contagem de faltas
  por disciplina.
- Reabrir uma sessão já submetida fica em `AuditLog`, com o estado antes e depois.
- A navegação do painel (`docs/specs/role-shell.md`) passa a diferenciar `TEACHER` de
  `SCHOOL_MANAGER`, não só staff/família.

**Non-Goals:**
- Marcação offline sem rede — precisa de fila local e resolução de conflitos, fase própria.
- Justificação de faltas com anexo (documento comprovativo).
- Notificação ao encarregado de educação quando o educando falta.
- Fixar o número exacto de faltas que leva a exclusão — a regra fica configurável (ver
  Decisões), o número em si continua por confirmar, tal como o spec original já assinalava.
- Editar o horário (`ScheduleEntry`) — este módulo só o lê.

## Decisions

**A lista "de hoje" vem do horário real, não de uma escolha livre de turma+disciplina.**
O spec original dizia "professor escolhe agrupamento e data"; a alternativa lida é: o
professor escolhe só a DATA (por omissão, hoje), e a lista de agrupamentos sai de
`ScheduleEntry` filtrado por `teacherId` e pelo `dayOfWeek` dessa data, ordenado por
`timeSlot.order`. Impede um professor de marcar presenças numa aula que não é sua no
horário, e dá à sessão um `scheduleEntryId`/`timeSlotId` reais — sem isso, o índice único
`(teachingGroupId, date, timeSlotId)` não protege nada, porque no MySQL um `timeSlotId`
nulo nunca colide consigo próprio (o mesmo problema de NULLs distintos já documentado para
`StudyPath`/`Invitation` na Fase 2).

**`findTeacherByUserId` é a primeira ponte sessão → perfil profissional.** Até agora a
sessão só carregava `Membership` (papel + escola); nenhum módulo precisara de saber QUAL
`Teacher` (ou `Student`/`Guardian`) corresponde ao utilizador autenticado. Fica em
`src/features/academic/data/attendance.ts`, tenant-scoped (`getTenantDb`), e devolve `null`
se o utilizador tem o papel `TEACHER` mas nenhum registo `Teacher` ligado — estado possível
(convite aceite antes do perfil profissional ser criado) que a página trata como "sem
agrupamentos", não como erro.

**Estado local no cliente, delta no servidor — `useState`, não `useOptimistic`.** A
proposta original previa `useOptimistic`; na prática, `useOptimistic` só mantém o valor
temporário ENQUANTO uma transição assíncrona está pendente, e reverte para a base assim
que essa transição acaba — não serve para acumular VÁRIAS alternâncias antes de um
submeter explícito, que é o que a folha precisa (alternar não chama o servidor; só
submeter chama). Um teste de componente apanhou isto directamente: o estado revertia antes
da asserção correr. `useState` simples resolve — alternar um aluno muda o ecrã de imediato
(RNF-03); `submitAttendance(scheduleEntryId, changes)` só recebe as linhas que mudaram de
"Presente" face ao estado com que a folha abriu, numa transacção. Uma turma de 45 com 3
faltas grava 3 linhas, não 45 (RNF-02).

**`isExcludedByAbsences` recebe a regra como argumento, não como constante.** O número de
faltas que exclui um aluno varia por escola e por disciplina em Moçambique, e o valor
exacto não foi confirmado — fixá-lo no código obrigaria a uma migração para o corrigir.
Fica como campo de configuração (fonte exacta — `AssessmentScheme` existente ou uma tabela
nova — é uma decisão para quando o número for confirmado, não agora).

**Reabertura em vez de edição livre.** Uma sessão `SUBMITTED` só volta a `DRAFT` através de
uma acção explícita de reabertura que grava em `AuditLog` o estado completo anterior. Um
mapa de assiduidade que mude sem rasto não é defensável perante um encarregado de educação
que conteste uma exclusão por faltas — mesma razão que já vale para `create-student`/
`enroll-student`.

**Navegação do painel passa a resolver por papel concreto, não só staff/família.**
`(dashboard)/layout.tsx` (Fase 5) hoje só distingue `isFamilyRole`. Passa a construir
`navItems` por `role`: `TEACHER` → "Presenças" (`/presencas`); `SCHOOL_MANAGER` (e
`PLATFORM_ADMIN`, via `isSchoolAdministrator`) → "Alunos" **e** "Assiduidade"
(`/turmas/assiduidade`); papéis de família continuam em "Portal". Um professor que também
seja gestor (dois papéis, escolas diferentes) só vê o conjunto do papel activo — o mesmo
princípio que já rege `SchoolSwitcher`.

## Risks / Trade-offs

**[Risk] `ScheduleEntry` sem dados (escola nova, horário ainda não montado)** → a lista "de
hoje" fica vazia; a página mostra estado vazio explícito ("sem aulas hoje"), não um erro —
mesmo tratamento que `listUnenrolledStudents`/`listEnrollmentOptions` já dão à ausência de
ano lectivo activo.

**[Risk] Um professor com horário mas sem `Teacher.userId` preenchido não marca nada.**
Aceite para esta fase: a ligação `User` ↔ `Teacher` é gerida hoje só pelo seed/base de
dados directamente — um ecrã de gestão de professores fica fora de âmbito (mencionado em
`domain-foundation.md §7`).

**[Trade-off] Estado local sem persistência entre recarregamentos.** Um refresh a meio da
marcação perde as alternâncias ainda não submetidas — aceite porque RNF-02 já pede um
único pedido no submeter, não gravação incremental; gravação incremental contrariaria
RNF-03 (resposta imediata sem esperar o servidor) e adicionaria pedidos que o design evita
de propósito.
