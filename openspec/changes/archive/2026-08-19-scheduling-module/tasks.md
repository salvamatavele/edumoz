Pensado para ser aplicado por etapas — a montagem do horário (grupos 1-4) já dá valor
sozinha, sem esperar pela consulta do professor/aluno (grupo 5) nem pela impressão (grupo 6).

## 1. Salas e tempos lectivos (pré-requisitos da grelha)

- [x] 1.1 `createRoomSchema` — Zod para criar `Room` (código, nome, capacidade, tipo
      `RoomKind`). Junto de `createTimeSlotSchema` em
      `domain/academic-structure-schema.ts` (não em ficheiros à parte) — mesmo ficheiro
      que já reúne `GradeLevel`/`Section`/`StudyPath`/etc., a convenção real do módulo.
- [x] 1.2 `createTimeSlotSchema` — dia da semana, hora de início, hora de fim, turno,
      ordem, associado ao ano lectivo activo (nunca vem do cliente, mesmo tratamento de
      `academicYearId` que `createClassGroupSchema` já dá); `.refine` valida
      `endTime > startTime`.
- [x] 1.3 `src/features/academic/actions/create-room.ts`,
      `create-time-slot.ts` — só `isSchoolAdministrator`; `AuditLog`.
- [x] 1.4 `src/features/academic/data/scheduling.ts` — `listRooms`, `listTimeSlots`
      (ordenados por dia da semana e ordem).
- [x] 1.5 UI — novos separadores "Salas" e "Tempos lectivos" em `/academico`
      (`academic-structure-panel.tsx`, mesmo molde de `EntitySection`/`FormModal` que
      `GradeLevel`/`Section` já usam).
- [x] 1.6 `messages/{pt,en}.json`, testes das duas Server Actions (autorização, escrita,
      `AuditLog`). Descoberto ao correr os testes: `academic-structure-panel.test.tsx`
      falhava a carregar o módulo porque as duas acções novas (não mockadas) importam
      `@/i18n/navigation`, que o Vitest não resolve fora do runtime do Next — corrigido
      mockando `create-room`/`create-time-slot` como as restantes acções do painel.

## 2. Leitura do horário e verificação de conflitos

- [x] 2.1 `src/features/academic/data/scheduling.ts` — `listScheduleEntriesForYear`,
      devolvendo já no formato `ScheduleEntryCandidate[]` (`domain/scheduling.ts`) para
      alimentar `conflictsForPlacement` sem conversão à parte no chamador.
- [x] 2.2 `listTeachingGroupMemberships` — `TeachingGroupMembership[]` (agrupamento →
      `enrollmentId`s), para o conflito de aluno.
- [x] 2.3 `listWeeklyHoursByTeacher` — soma de horas já colocadas por professor no ano
      lectivo activo, para o aviso de `maxWeeklyHours` (grupo 3). Nova função pura
      `timeSlotDurationHours` em `domain/scheduling.ts` (não estava prevista no design,
      necessária para converter "HH:mm" em horas fraccionárias).
- [x] 2.4 Testes de integração dos três, contra a base real (mesmo padrão de
      `getAttendanceReport`/`getGradeRoster` — sem mocks de Prisma).

## 3. Colocação de uma aula (`placeScheduleEntry`)

- [x] 3.1 `src/features/academic/domain/place-schedule-entry-schema.ts` — Zod para a
      colocação (`teachingGroupId`, `roomId`, `timeSlotId`, `id?` opcional para
      remarcação); `PlaceScheduleEntryResult` (`success`/`conflict`/`error`, distinto de
      `FormActionResult` — um conflito não é um erro de campo).
- [x] 3.2 `src/features/academic/actions/place-schedule-entry.ts` — só
      `isSchoolAdministrator`; recarrega `listScheduleEntriesForYear` +
      `listTeachingGroupMemberships` DENTRO da acção (nunca confia no que o cliente
      mandou), chama `conflictsForPlacement`; se vazio, grava em transacção
      (`ScheduleEntry` + `AuditLog`) e só depois verifica `maxWeeklyHours` sobre o estado
      já gravado (aviso, não bloqueio); se não vazio, devolve os conflitos traduzidos, sem
      gravar nada. `P2002` na transacção (rede de segurança dos três índices únicos)
      devolve o mesmo `status: "conflict"`, nunca um erro genérico. Pathnames `/timetables`
      (en) / `/horarios` (pt), `/timetables/teacher/[id]`, `/my-timetable` adiantados de
      4.4/5.4 para `src/i18n/routing.ts` — a acção precisa deles para `revalidatePath`.
- [x] 3.3 Traduzir cada `ScheduleConflict.kind` para texto em `messages/{pt,en}.json`
      (`scheduling.conflicts.*`), mesmo padrão de `describeSchemeError`
      (`create-assessment-scheme.ts`) — nunca uma mensagem genérica. `STUDENT_DOUBLE_BOOKED`
      agrega por `teachingGroupIds` antes de traduzir, usando plural ICU (`{count, plural,
      ...}`), para nunca listar alunos um a um.
- [x] 3.4 Testes: colocação válida grava; conflito de professor, de sala, de aluno
      recusam com a mensagem certa, sem gravar nada; sem professor atribuído ao
      agrupamento recusa; aviso de `maxWeeklyHours` grava mas devolve aviso; sem
      `maxWeeklyHours` definido, nunca avisa. (Conflito de agrupamento e a corrida entre
      duas colocações concorrentes ficam cobertos pela mesma lógica dos outros três — o
      caminho de código é idêntico, `conflictsForPlacement` sobre o horário recarregado —
      não duplicados à parte.)

## 4. Grelha de montagem (`/horarios`)

- [x] 4.1 `src/features/academic/ui/schedule-board.tsx` — grelha semanal (dias × tempos
      lectivos), com selector de vista (turma/professor/sala); ao escolher agrupamento +
      tempo + sala, chama `conflictsForPlacement` no cliente antes de submeter — mesma
      função pura do servidor, nunca uma segunda implementação. Interacção por diálogo
      (escolher agrupamento/sala/tempo, ver conflitos, gravar) em vez de arrastar — mais
      acessível, mesmo padrão de `FormModal`/diálogos já usados no resto da aplicação.
- [x] 4.2 Mostrar cada conflito devolvido com o texto de 3.3 (versão cliente, com nomes
      resolvidos a partir de `options` já carregadas, sem consulta extra) antes de
      permitir submeter — o botão "Guardar" fica desactivado enquanto houver conflitos
      detectados no cliente; `STUDENT_DOUBLE_BOOKED` mostra contagem de alunos, nunca a
      lista de nomes. Corrigido durante a verificação manual (7.2): o `warning` de
      `maxWeeklyHours` que `placeScheduleEntry` já devolvia num `status: "success"` nunca
      chegava a aparecer — `ScheduleBoard` ganhou um banner próprio, mostrado depois de
      gravar e de fechar o diálogo.
- [x] 4.3 Página `/timetables` (`/horarios`, gestor) — carrega o horário actual + opções
      via `getScheduleBoardData` (nova função agregadora em `data/scheduling.ts`),
      renderiza `ScheduleBoard`.
- [x] 4.4 `src/i18n/routing.ts` — pathnames adiantados para 3.2 (`/timetables`,
      `/timetables/teacher/[id]`, `/my-timetable`); nav do gestor em `layout.tsx`/
      `dashboard-shell.tsx` (ícone `CalendarClock` novo).
- [x] 4.5 Testes do componente (RTL): mostra a colocação existente na célula certa;
      submeter uma colocação válida chama a Server Action com os dados certos; um
      conflito detectado no cliente mostra o texto certo e desactiva "Guardar", sem
      chamar a Server Action.

## 5. Consulta do horário (professor e aluno)

- [x] 5.1 `src/features/academic/data/scheduling.ts` — `getTeacherSchedule(schoolId,
      teacherId)`, `getStudentSchedule(schoolId, studentId)` (resolve a matrícula do ano
      activo internamente — `enrollmentIds` na assinatura original não fazia sentido para
      "o horário de UM aluno"; devolve `null` sem matrícula, não lista vazia) — leitura
      simples, sem verificação de conflitos (só a montagem grava). `getPortalSchedule`
      (aluno/encarregado, mesmo padrão de `getPortalGrades`) também acrescentado, para a
      página não ter de reimplementar a selecção de educando.
- [x] 5.2 Página `/my-timetable` (`/meu-horario`) — professor vê `getTeacherSchedule`
      (via `findTeacherByUserId`); aluno/encarregado vê `getPortalSchedule`, nunca de
      outro aluno; outros papéis (gestor, superadmin) vêem um estado neutro — não têm
      horário próprio.
- [x] 5.3 Layout responsivo sem scroll horizontal em ecrã de telemóvel — `ScheduleView`
      (novo componente de apresentação, só leitura, partilhado por professor e
      aluno/encarregado): grelha (dias × tempos) visível a partir de `sm`, lista
      empilhada por dia visível abaixo de `sm`, a mesma lista de `entries` em ambas.
- [x] 5.4 `src/i18n/routing.ts` — pathname adiantado para 3.2 (`/my-timetable`); nav de
      professor e das famílias em `layout.tsx`.
- [x] 5.5 Testes de `getTeacherSchedule`/`getStudentSchedule`/`getPortalSchedule`
      (autorização, âmbito, contra a base real) e de `ScheduleView` (RTL) — não da
      própria página: nenhuma página deste projecto tem teste próprio, por usarem `auth()`
      directamente (não corre sob Vitest, mesma limitação documentada para `next-auth` em
      todo o projecto); a página só compõe dados já testados com um componente já testado.

## 6. Exportação para impressão

- [x] 6.1 `getClassGroupSchedule(schoolId, classGroupId)` — horário semanal de uma turma,
      juntando os `ScheduleEntry`s dos agrupamentos com membros dessa turma. O filtro
      `members: { some: ... }` é uma verificação de existência por linha, não um `JOIN` —
      confirmado não duplicar nada mesmo quando o agrupamento tem vários membros da turma.
- [x] 6.2 Vista de impressão — mesmo padrão já usado em `/report-cards` (`print:hidden`
      na parte interactiva, formulário GET sem JavaScript para escolher a turma, `<h2>`
      só visível a imprimir). Nova secção em `/timetables`, reutilizando `ScheduleView`
      (leitura) — a grelha de montagem (`ScheduleBoard`) fica escondida ao imprimir.
      `PrintButton` novo (client, `window.print()`).
- [x] 6.3 Testes de `getClassGroupSchedule`: junta os horários de todos os agrupamentos
      com membros da turma sem duplicar; devolve lista vazia para uma turma sem nada
      colocado.

## 7. Verificação

- [x] 7.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 7.2 Verificação manual (Playwright, escola e utilizadores temporários, apagados no
      fim): montado um horário com Física (Ciências) e História (Letras) no mesmo
      tempo, salas diferentes — confirmado sem conflito, ambas gravadas; tentado
      Português de 10A no mesmo tempo, salas diferentes — recusado com os dois conflitos
      de aluno explicados por nome do agrupamento e contagem ("1 aluno já tem
      Fisica-Ciencias..."/"...Historia-Letras..."), "Guardar" desactivado; colocação
      válida de Português confirmada a aparecer na vista por Turma; `/meu-horario` como
      professora (só a sua aula) e como aluno de Ciências (Física + Português, nunca
      História); ecrã de telemóvel confirmado sem scroll horizontal (lista empilhada por
      dia); impressão de turma testada com `emulateMedia("print")`.
      **Bug real encontrado e corrigido**: a grelha de `ScheduleView` colapsava para uma
      só aula quando duas aulas simultâneas de subgrupos diferentes caíam na mesma
      célula (dia+tempo) — exactamente o caso de uma turma mista com Secções em
      paralelo, o cenário central desta funcionalidade. `entryByCell` (uma entrada por
      célula) passou a `entriesByCell` (lista), com teste de regressão novo. Também
      corrigido nesta verificação: o aviso de `maxWeeklyHours` nunca chegava a aparecer
      na UI (ver nota em 4.2).
- [x] 7.3 Actualizar `CHANGELOG.md` e `docs/specs/README.md`.
