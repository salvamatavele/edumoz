# Changelog

## [Não publicado]

### M01 — atribuições múltiplas e posse

- Perfis múltiplos por associação escolar, preparação de suspensos, configuração vazia restritiva, revisões e auditoria atómica; migração preserva acessos anteriores.
- Corrigidos acesso directo de docentes ao directório escolar sem grant e pautas sem filtro de posse; impedida auto-associação profissional por gestores delegados.
- 146 ficheiros/1260 testes, build Turbopack, tipos, restauro de 48 tabelas e navegador pt/en/móvel passaram. Cópias temporárias autorizadas eliminadas. Excepções e restante M01 continuam em execução.

### M01 — criação de papéis e catálogo

- Criação idempotente e auditada com escola fixa, actor persistido e limites de campos; repetições/alterações incertas não duplicam nem sobrescrevem.
- Preparação local inclui as 50 entradas do catálogo sem mudar grants; seed idempotente valida o destino de teste e evita erros brutos. Corrigido corte móvel da grelha.
- 132 ficheiros/1149 testes passaram; build/lint e navegador pt/en/A→B/móvel verificados. Papéis múltiplos e restantes fluxos continuam em execução.

### M01 — retirada escolar e última via administrativa

- Retirada local com prévia/revisão, confirmação e auditoria, preservando conta global, fichas e outras escolas. Associação retirada não reabre por activação ou vínculo antigos.
- Aceitação de convites e atribuição de papéis partilham o lock escolar; actor e estado são relidos. Protecção da última administração abrange retirada, suspensão e restrição de papéis.
- 131 ficheiros/1140 testes passaram sequencialmente; build, restauro de 47 tabelas e navegador pt/en/A→B/leitor/móvel aprovados. Plano global continua.

### M01 — sessões revogáveis

- Registry JWT por conta, logout confirmado no servidor, consulta/revogação de outras sessões pelo titular, versões de credencial e compatibilidade legada sem reactivação.
- Corrigida a corrida MariaDB na adopção de cookies antigos; nonce não sai no JSON/BD/auditoria. Migração e restauro de 47 tabelas verificados.
- 128 ficheiros/1118 testes passaram; build Turbopack aprovado, lint sem erros/um aviso conhecido. Navegador pt/en, leitor, logout/retorno e móvel verificados; plano global continua.

### M01 — pessoal e vínculos profissionais

- Fichas de funcionários por escola com dados profissionais, paginação/filtros, criação idempotente e edição auditada com revisão. Novo recurso de permissões sem concessões automáticas.
- Vínculo de funcionário com confirmação e motor comum ao docente; acumulação preserva as duas fichas e outras escolas. Migração, backup/restauro e navegador pt/en/móvel/restrito verificados. Corrigida a fronteira privada da nova rota.
- 122 ficheiros/1095 testes passaram, tipos/build aprovados; lint sem erros e um aviso conhecido. Execução global continua.

### M01 — vínculo docente escolar

- Ligação, substituição e desligação de ficha docente com prévia nome/código e confirmação, incluindo contas partilhadas. Revisões e auditoria transaccional protegem concorrência; escola B, identidade global e histórico são preservados. Exige papel Professor activo para ligar, sem atribuir papéis automaticamente.
- 117 ficheiros/1055 testes passaram; tipos/build Turbopack aprovados, lint sem erros e um aviso conhecido. Navegador pt/en/móvel e recusas de permissão/contexto verificadas. Ficha/vínculo de funcionário e restante M01 continuam pendentes.

### M01 — edição de identidade exclusiva

- Edição de nome e contactos de comunicação com revisão concorrente e auditoria atómica. Preserva login, credenciais, papéis e vínculos; recusa contas partilhadas e formulários de outra escola.
- 114 ficheiros/1026 testes, tipos e build Turbopack passaram; lint sem erros/um aviso conhecido. Navegador verificou persistência, escolas A/B, leitor, pt/en e móvel. Vínculos profissionais continuam pendentes; M01 parcial.

### M01 — criação e credenciais iniciais

- Criação escolar atómica/idempotente, papéis base e vínculo docente local, código de entrada próprio, contactos de comunicação sem associação automática, segredo aleatório de 24h e troca obrigatória no servidor. Reemissão limitada a contas ainda iniciais e exclusivas; versões anteriores revogadas. Migrações aditivas preservam logins/grants legados.
- Protegido o último gestor utilizável e separados os limites por finalidade, com normalização de telefones. UI pt/en, entrega única, estados, procura e zero resultados revistos.
- 111 ficheiros/1001 testes, tipos e build Turbopack passaram; lint sem erros e um aviso conhecido. Navegador verificou criação, isolamento A/B, leitor, bloqueio inicial e acesso após activação sintética pela DAL, em desktop/móvel. Convites, identidade/vínculos completos, perfis avançados, recuperação, QR e impressos continuam pendentes.

### M01 — palavra-passe própria e revogação

- Página pt/en para troca própria com password actual, nova/confirmar, limite persistente e auditoria sem segredos. Versão global de autenticação revoga sessões antigas em todas as escolas e protege login concorrente; contas Google sem password local mantêm esse percurso.
- Migração aditiva preservou contas/hashes; aplicada após ensaio e backup verificado. 105 ficheiros/912 testes, tipos e build Turbopack passaram; lint sem erros/um aviso conhecido. Navegador confirmou apresentação móvel e recusa de sessão/password antigas após troca sintética pela DAL. Criação e emissão inicial continuam pendentes.

### M01 — primeira subentrega de utilizadores

- Lista escolar com filtros e paginação SQL, activação/suspensão local, auditoria e protecção do último gestor. Traduções pt/en e permissões users/view e users/edit sem concessões automáticas a papéis restritos.
- Corrigidos selector de escola após revogação, tradução e alvo de fecho dos diálogos. Validação: 101 ficheiros/887 testes, tipos, build Turbopack e navegador A/B, desktop/móvel; lint sem erros e um aviso conhecido. Criação, credenciais e restante M01 continuam pendentes.

### Fundação da paridade esagrada-next

- Protegido o retorno do login contra redireccionamentos externos ou caminhos ambíguos, preservando destinos válidos pt/en. Navegador sintético e 48 testes novos verificados; regressão actual: 87 ficheiros/751 testes passaram. Etapa geral de segurança ainda em curso.

- Concluídas as protecções de notas/fecho e de concorrência financeira: idempotência de facturas/pagamentos, referências serializadas, saldos reconciliados e estornos protegidos de respostas atrasadas. Ensaios de migração e navegador pt/en passaram; regressão de 85 ficheiros/703 testes e build Turbopack verdes. Programa em 12/313 tarefas; módulos ainda por aceitar.

- Separada a base local de testes da base de desenvolvimento: preparação com conta aleatória restrita, configuração Vitest validada antes dos testes e guarda adicional no cliente Prisma.
- Acrescentado `test:unit` sem base de dados e limite de dois workers para os testes locais; removida a dependência da escola de demonstração no teste integrado de horários.
- Acrescentados testes de URLs seguras e privilégios; suite verificada com 72 ficheiros e 486 testes a passar na base de testes.
- Acrescentado ensaio de backup/restauro sintético encriptado e documentação de execução sem Docker. Output de build de produção separado do desenvolvimento; `npm run build` validado com Turbopack após renovar a cache de produção e autorizar o socket interno do worker PostCSS.
- Consolidado o design existente e implementada autorização por pedido: revogação de memberships/superadmin, grants em 23 actions, páginas e navegação, leitura separada de escrita, catálogo financeiro/horários sem grants automáticos.
- Corrigidos cookies fragmentados e recuperação da escola restante após revogação; navegação autenticada pt/en e escolas A/B verificada em instância sintética. Regressão actual: 78 ficheiros/548 testes, tipos e build Turbopack verdes; lint sem erros e com dois avisos preexistentes.
- Iniciada a integridade de tenant: bloqueadas mudanças directas de escola em updates/upserts, operações na relação school e valores incompatíveis em criação. Concluída a tarefa 1.10: referências/junções/nested writes protegidas, 64 triggers persistentes, histórico validado antes da migração e ensaio de concorrência. Regressão após esta guarda: 78 ficheiros/557 testes passaram; build Turbopack verde.
- Aprovação e acompanhamento da clonagem em `openspec/changes/clone-esagrada-functional-parity/`; nenhum módulo novo declarado concluído nesta fase.

## Fase 11 — Finanças: propinas, facturação, pagamentos e portal da família

Change (OpenSpec): [`openspec/changes/finance/`](openspec/changes/finance/).

### Adicionado

- **`/financas` (gestor)** — quatro separadores: tabelas de propinas e rubricas (CRUD
  simples, mesmo molde de `EntitySection`); facturação em lote, idempotente por
  `(matrícula, tabela, período)` — correr duas vezes não duplica; mapa de dívida por
  turma/período e conta-corrente por aluno, ambos por formulário GET sem JavaScript;
  pagamentos — registar manual (já `CONFIRMED`), iniciar dinheiro móvel, confirmar,
  reverter (motivo obrigatório, nunca apaga o registo).
- **`SimulatedGateway`** — implementação de `MobileMoneyGateway` com quatro caminhos
  escolhidos pelo `payerPhone` de teste: sucesso imediato, falha imediata, timeout
  (nunca resolve) e o caminho real — pendente, e só confirmado numa segunda consulta.
  Fica atrás da mesma porta hexagonal já desenhada; os operadores reais entram sem tocar
  no domínio nem nas Server Actions.
- **Recibo imprimível** (`/financas/recibo/[id]`), com código de verificação e aviso
  claro quando o pagamento foi revertido.
- **Separador "Finanças" em `/portal`**, ao lado de "Notas" — saldo em dívida e mapa de
  facturas do próprio aluno ou do educando escolhido, dois separadores GET
  (`?tab=grades|finance`) sem JavaScript.
- Sessenta e quatro testes novos entre domínio, dados, acções e portal.

### Decisões

- **Quatro capabilities** — `fee-schedules`, `invoicing`, `payments` (a superfície de
  maior risco, por isso isolada), `family-finance-portal` — mesma lógica de
  `assessment-grading`/`scheduling-module`.
- **Máquina de estados de `Payment` como função pura testada primeiro**
  (`canTransition`, `domain/payment-state.ts`), sem nenhum chamador até `payments` estar
  pronto a usá-la — mesmo padrão de `conflictsForPlacement`.
- **`Invoice.paidAmount`/`status` recalculam-se sempre por agregação, nunca por
  incremento** — `recalculateInvoiceBalance` (pura, testada à parte) soma os `Payment`s
  `CONFIRMED` de novo a cada mudança de estado, em vez de somar/subtrair ao valor
  anterior. Um incremento que corra duas vezes por engano diverge para sempre; uma soma
  recalculada converge sempre para o valor certo.
- **`idempotencyKey` gerada pelo EduMoz, gravada ANTES de contactar o operador** — o
  `Payment` fica em `INITIATED` mesmo que o pedido ao operador falhe ou nunca volte,
  nunca em limbo entre "talvez enviado, talvez não".

### Corrigido durante a implementação (antes de qualquer teste correr)

- Soma de rubricas em `generate-invoices.ts` usava `Number(item.amount)` — reintroduzia
  vírgula flutuante em dinheiro; substituída por `sum()`/`toDecimal()`
  (`shared/domain/numeric.ts`).
- `getStudentAccount` calculava um saldo zero inicial com um truque feio de instanciar
  `Decimal` a partir do construtor de outra instância; substituído por `sum(...).toFixed(2)`.

## Fase 10 — Horários: montagem, conflitos, consulta e impressão

Change (OpenSpec): [`openspec/changes/scheduling-module/`](openspec/changes/scheduling-module/).

### Adicionado

- **Salas e tempos lectivos** — nenhum dos dois tinha CRUD (descoberto ao ler o schema,
  mesmo padrão do `Assessment` em `assessment-grading`); novos separadores em
  `/academico`, mesmo molde de `GradeLevel`/`Section`.
- **`/horarios` (gestor)** — grelha de montagem por turma, professor ou sala. Colocar uma
  aula (agrupamento + sala + tempo) verifica os quatro conflitos possíveis — professor,
  sala, agrupamento (também protegidos por índice único) e **aluno** (só verificável no
  domínio, porque uma matrícula pertence a vários agrupamentos ao mesmo tempo) — com
  `conflictsForPlacement` (já existia, testada, nunca usada até agora) a correr no
  cliente para resposta imediata e outra vez no servidor, sobre o horário recarregado,
  antes de gravar. `STUDENT_DOUBLE_BOOKED` mostra contagem de alunos, nunca nomes.
  Excesso de `Teacher.maxWeeklyHours` é aviso, nunca bloqueio.
- **`/meu-horario`** — consulta do próprio horário (professor, aluno, encarregado de
  educação), grelha num ecrã largo e lista empilhada por dia num telemóvel, sem scroll
  horizontal.
- **Impressão do horário de uma turma**, a partir de `/horarios`.
- Vinte e cinco testes novos entre domínio, dados, acções e componentes.

### Decisões

- **Duas capabilities, não uma** — `timetable-authoring` (gestor) e `timetable-viewing`
  (professor/aluno) — mesma separação de `assessment-grading` entre lançamento e
  consulta: autorizações diferentes, ritmos de mudança diferentes.
- **A verificação de conflitos corre sempre duas vezes, com a MESMA função pura** — nunca
  duas implementações da detecção. O servidor nunca confia no "sem conflitos" do cliente;
  recarrega o horário actual antes de gravar. Os três índices únicos ficam como rede de
  segurança final contra condições de corrida, nunca a primeira linha de defesa.

### Corrigido durante a verificação manual

- `ScheduleView` (grelha de consulta/impressão) colapsava para uma só aula quando duas
  aulas simultâneas de subgrupos diferentes caíam na mesma célula — exactamente o caso de
  uma turma mista com Secções em paralelo, o cenário central deste módulo. Só apareceu ao
  testar com dados reais (Física de Ciências e História de Letras ao mesmo tempo), nunca
  nos testes unitários com fixtures mais simples.
- O aviso de `maxWeeklyHours` que `placeScheduleEntry` já devolvia nunca chegava a
  aparecer na grelha de montagem — `ScheduleBoard` ganhou um banner próprio.

## Fase 9 — Permissões: superadmin real, papéis configuráveis, director de turma

Change (OpenSpec): [`openspec/changes/permissions-management/`](openspec/changes/permissions-management/).

### Adicionado

- **`isPlatformAdmin` passa a chegar à sessão de facto.** `User.isPlatformAdmin` já existia
  e era lido em `sign-in.ts`, mas nunca chegava ao `SessionContext` — 23 sítios no código
  construíam-no com `isPlatformAdmin: false` à mão, porque o JWT nunca o carregava. Corrigido
  na origem (`jwt`/`session` callbacks, `src/lib/auth/config.ts`) e nos 19 sítios que
  restavam depois de excluir os dois ficheiros de teste com fixtures intencionais.
- Selector de escola (`SchoolSwitcher`) passa a listar TODAS as escolas activas para um
  administrador da plataforma — antes só mostrava as suas `Membership`s, e um superadmin
  sem nenhuma ficava sem forma de escolher uma escola para gerir, apesar de
  `resolveActiveSchool` já aceitar o pedido. `resolveActiveSchool` ganhou um parâmetro
  `isPlatformAdmin` que salta a verificação de `Membership`.
- **Papéis configuráveis por escola** (`PermissionRole`/`RolePermission`, sobre um catálogo
  fixo `Permission` de nove recursos × quatro acções) — um gestor sem restrição pode criar
  papéis como "Director-adjunto" e escolher, por recurso, o que cada um vê/cria/edita/apaga,
  e atribuí-los a outros gestores. Nova secção em `/configuracao`. `hasPermission(context,
  resource, action)` (`access.ts`) é o mecanismo — aditivo, ao lado de
  `isSchoolAdministrator`, sem alterar nenhuma das 16 Server Actions existentes: continuam a
  usar a autorização de sempre, e um gestor sem papel atribuído mantém acesso total.
- **Director de turma.** `ClassGroup.headTeacherId` (já existia no esquema, nunca lido)
  passa a expor-se na criação/edição de turmas e a alargar a LEITURA de presenças e notas ao
  professor que dirige a turma, mesmo em disciplinas que não lecciona — nunca a escrita, que
  continua limitada a quem lecciona. UI distingue "os seus agrupamentos" de "a turma que
  dirige" com um emblema, e a grelha de notas mostra os campos bloqueados com uma explicação
  quando vistos por posse alargada, não por leccionar.

### Decisões

- **Catálogo de recursos/acções fixo no código, não editável pelo superadmin** — um
  superadmin escolhe combinações, nunca inventa capacidades novas sem correspondência real
  no código.
- **Migração das 16 Server Actions existentes para `hasPermission` fica para quando houver
  um papel configurável real a precisar dela** — reescrever autorização em bloco é o
  projecto mais arriscado de fazer sem motivo concreto.

## Fase 8 — Avaliação: lançamento de notas, fecho de trimestre, pautas

Change (OpenSpec): [`openspec/changes/assessment-grading/`](openspec/changes/assessment-grading/).

### Adicionado

- `resolveApplicableScheme` (`grade-engine.ts`) — a resolução "qual esquema se aplica a
  esta classe+disciplina" que a capability `assessment-schemes` já especificava mas nunca
  tinha implementação. Reutilizada tanto pelo lançamento de notas como pelo fecho de
  trimestre — uma só função, nunca duas regras a divergir.
- `/notas` (professor) — cria avaliações concretas (testes, trabalhos) dentro de um
  componente do esquema, e lança notas numa grelha com a média calculada ao vivo pelo
  mesmo motor (`computeSubjectResult`) que o fecho de trimestre usa para gravar. As
  `SubjectResult.notes` do motor aparecem em texto legível junto da média.
- `closeTerm` — fecha um trimestre: materializa `TermResult` para cada matrícula ×
  disciplina do seu percurso, com `schemeId`+`schemeVersion` congelados no resultado.
  Só `isSchoolAdministrator`, numa única transacção, com ecrã de confirmação explícito
  (secção "Fecho de trimestre" em `/avaliacao`) — sem forma de reabrir nesta fase.
- `/pautas` — pauta por turma, disciplina e trimestre, lida exclusivamente de `TermResult`
  (nunca recalcula a partir de `Grade`/`Assessment`).
- `/portal` deixou de estar vazio — aluno vê "as minhas notas"; encarregado de educação
  com mais do que um educando escolhe qual ver. Nunca as notas de outro aluno.
- Dez testes novos por ficheiro em média, cobrindo autorização, `resolveApplicableScheme`
  (as quatro combinações de especificidade), fecho de trimestre e a leitura do portal.

### Decisões

- **Nota de exame (`examScore`) fica fora de âmbito.** Os campos de exame do esquema
  continuam por confirmar com uma escola real; `computeSubjectResult` já trata
  `examScore: null` como "pendente", não "reprovado", quando `hasExam` está desligado.
- **`Assessment` (a avaliação concreta) também é criada pelo professor — lacuna descoberta
  ao implementar.** A proposta original assumia `Assessment`s já existentes para a grelha
  listar; `Assessment.weight` já mostrava que o schema foi pensado para várias avaliações
  por componente. Ver `openspec/changes/assessment-grading/design.md`.
- **Fechar um trimestre é a única acção sob `isSchoolAdministrator` deste módulo** — o
  lançamento de notas usa a mesma autorização por posse do `TeachingGroup` que Presenças já
  estabeleceu, mas fechar afecta toda a escola de uma vez.

## Fase 7 — Configuração académica

Change (OpenSpec): [`openspec/changes/academic-configuration/`](openspec/changes/academic-configuration/).

### Adicionado

- `/academico`, `/professores`, `/avaliacao` (gestor apenas) — Estrutura académica
  (`GradeLevel`, `Section`, `StudyPath`, `Subject`, `CurriculumSubject`, `ClassGroup`),
  Professores (`Teacher`, `TeachingGroup`) e Avaliação (`AssessmentScheme` +
  `AssessmentComponent`), cada uma com a sua própria entrada na barra lateral e separadores
  (`Tabs`) internos. Fecha a lacuna que impedia Presenças (Fase 6) de sair do modo de
  demonstração — até aqui, toda esta taxonomia só existia via `prisma/seed.ts`.
- `/configuracao` mantém-se, reservada à configuração real do sistema (nome, logótipo,
  fórmulas de pagamento da escola) — ainda por construir; mostra um estado vazio explícito.
- Dez Server Actions novas, mesmo molde de `create-student.ts`/`enroll-student.ts`:
  `create-grade-level`, `create-section`, `create-study-path`, `create-subject`,
  `create-curriculum-subject`, `create-class-group`, `create-teacher`,
  `create-teaching-group`, `create-assessment-scheme`. Todas só `isSchoolAdministrator` —
  ao contrário de `submit-attendance.ts`, nenhuma sob o professor dono: configurar a
  estrutura académica é uma decisão de gestão, não de sala de aula.
- `create-assessment-scheme.ts` chama `validateScheme` (`grade-engine.ts`, já existente e
  testado) depois do Zod, e antes de gravar — os pesos dos componentes têm de somar
  exactamente 1.0000, com o erro específico mapeado para o formulário.
- `EntitySection` (`features/academic/ui/settings/entity-section.tsx`) — secção genérica
  (tabela + `FormModal`), reutilizada pelas oito entidades de campos simples; poupa repetir
  a mesma composição oito vezes.
- `AssessmentSchemeSection`/`AssessmentSchemeForm` — a única entidade cuja forma
  ("esquema + lista de componentes") o `FormModal` genérico não cobre; usa
  `useFieldArray` directamente, com o mesmo esquema Zod e a mesma Server Action.
- Selectores dependentes (`StudyPath`→`GradeLevel`, `CurriculumSubject`→`StudyPath`+
  `Subject`, `TeachingGroup`→`Subject`+`Teacher`) mostram "crie X primeiro" em vez de um
  selector vazio, quando a lista de opções está vazia.

### Corrigido

- **Campos numéricos opcionais enviavam `NaN`, não `undefined`, quando deixados em
  branco.** `input.valueAsNumber` (usado por `register(name, {valueAsNumber:true})` em
  `FormModal`) devolve `NaN` para um campo vazio, não `undefined` — `z.coerce.number()`
  sozinho não apanha isto, porque `NaN` já é um número válido para o Zod, só não um valor
  útil. Descoberto ao verificar `Teacher.maxWeeklyHours` manualmente. Corrigido com
  `optionalNumberField` (`components/form/field-schema.ts`), que converte
  `NaN`/`""`/`null` para `undefined` antes da validação — aplica-se a qualquer campo
  numérico opcional futuro, não só aos desta fase.

### Decisões

- **Revertida após feedback do utilizador: em vez de uma só página "Configuração" com
  nove tabelas empilhadas, cada área (Estrutura académica, Professores, Avaliação) ganhou a
  sua própria página e entrada na barra lateral, com separadores internos.** A versão
  inicial (uma entrada, várias secções) parecia uma parede de tabelas, e a maior parte do
  conteúdo não era "configuração do sistema" — era gestão de dados académicos do dia-a-dia.
  Ver `openspec/changes/academic-configuration/design.md` (secção "Correcção
  (pós-implementação)").
- **`StudyPath.code` nunca vem do formulário — gera-se a partir de classe + secção.** É
  este código, não `sectionId` (nulável), que garante a unicidade real no MySQL.
- **`CurriculumSubject.scope` cobre "extracurricular" via `INTERNAL`** — sem enum novo nem
  migração.

## Fase 6 — Presenças

Change (OpenSpec): [`openspec/changes/attendance/`](openspec/changes/attendance/).
Spec: [`docs/specs/attendance.md`](docs/specs/attendance.md).

### Adicionado

- `features/academic/domain/attendance.ts` — `computeAttendanceSummary` (faltas por
  disciplina, não por dia), `isExcludedByAbsences` (regra por confirmar, recebida como
  argumento), `todaysDayOfWeek` (usa `getUTCDay()`, não o fuso do servidor). Puras, 10
  testes.
- `features/academic/data/attendance.ts` — `findTeacherByUserId` (primeira ponte sessão →
  perfil profissional), `listTeacherScheduleForDate` (a partir de `ScheduleEntry`, nunca
  uma escolha livre), `getAttendanceRoster`, `getAttendanceReport`,
  `listAttendanceReportFilters`.
- `submitAttendance` e `reopenAttendance` — Server Actions, terceiro e quarto molde do
  padrão (`create-student.ts`, `enroll-student.ts`): autorização por dono da
  `ScheduleEntry` (não `isSchoolAdministrator`), escrita transaccional do delta,
  `AuditLog`. 9 testes.
- `/presencas` (professor: agrupamentos do dia, folha de marcação com toque único por
  aluno) e `/turmas/assiduidade` (gestor: mapa por turma/período/disciplina).
- `(dashboard)/layout.tsx` — `navItems` passa a resolver por papel concreto:
  `TEACHER` → "Presenças"; `SCHOOL_MANAGER`/`PLATFORM_ADMIN` → "Alunos" + "Assiduidade".

### Decisões

- **A lista "de hoje" sai do horário real (`ScheduleEntry`), não de uma escolha livre.**
  Além de corresponder ao que RF-04 pede (só os agrupamentos do professor), dá à sessão um
  `timeSlotId` real — sem ele, o índice único `(teachingGroupId, date, timeSlotId)` não
  protegia nada, porque no MySQL um `timeSlotId` nulo nunca colide consigo próprio.
- **`useState`, não `useOptimistic`, para o estado da folha.** A proposta original previa
  `useOptimistic`; um teste de componente apanhou que ele reverte para a base assim que a
  transição termina, porque alternar não chama o servidor — não serve para acumular várias
  alternâncias antes de um submeter explícito. Ver `openspec/changes/attendance/design.md`.
- **Reabrir aceita dois donos: o gestor OU o próprio professor.** Um gestor tem de
  conseguir corrigir um erro sem depender do professor estar disponível; o professor
  continua a poder corrigir a sua própria sessão sozinho. Submeter continua restrito ao
  professor dono — um gestor não marca presenças em nome de outro.
- **A regra de exclusão por faltas fica configurável, o número por confirmar.** Varia por
  escola e disciplina em Moçambique; fixá-la no código exigiria uma migração para a
  corrigir. `isExcludedByAbsences` recebe a regra como argumento.

## Fase 5 — Casca de navegação e autorização por papel

Spec: [`docs/specs/role-shell.md`](docs/specs/role-shell.md).

### Adicionado

- `isStaffRole` (`src/features/identity/domain/access.ts`) — complemento exacto de
  `isFamilyRole` para os cinco papéis actuais; usado para restringir LEITURA, não só
  escrita.
- `/portal` — destino de aluno/encarregado de educação, protegido como `/alunos`
  (`PROTECTED_PATHNAMES`), ainda vazio de propósito.
- `/alunos` reencaminha um papel de família para `/portal` em vez de mostrar a escola
  inteira.
- **Casca do painel** (`DashboardShell`, `src/components/layout/dashboard-shell.tsx`) —
  barra lateral com navegação por papel, gaveta em ecrãs pequenos, cabeçalho utilitário
  (`SchoolSwitcher`/`LocaleSwitcher`/`ThemeToggle`), cartão do utilizador com terminar
  sessão, rodapé mínimo. Substitui por completo `SiteHeader`/`SiteFooter` (a montra
  pública) depois de entrar, via route groups do Next.js
  (`(marketing)/`, `(dashboard)/`) — os URLs não mudam.
- Ligação "Entrar" no cabeçalho de marketing, antes inexistente — não havia nenhuma forma
  de chegar a `/entrar` a partir da navegação pública.
- Botão de mostrar/esconder no campo de palavra-passe (`Input`, `type="password"`).

### Decisões

- **Corrige uma fuga real, não só a falta de painel.** `/alunos` só verificava
  `session.schoolId`; qualquer papel de família autenticado via a lista completa da
  escola — nomes, datas de nascimento, encarregados de outros alunos.
  `isSchoolAdministrator` só protegia as acções de escrita.
- **Sem rota-gateway nova.** `/students` continua a ser o destino de `callbackUrl` por
  omissão (agora `getPathname`-traduzido, não `/`) nos dois métodos de login; é a própria
  página que decide mostrar a lista ou reencaminhar, no servidor. Funciona igual para
  Google, que não permite decidir o destino do lado do cliente antes de autenticar.
- **Trocar de escola já reencaminha sozinho.** Um utilizador com papel diferente em cada
  escola perde o acesso a `/alunos` ao trocar, sem código extra — consequência de `/alunos`
  verificar o papel a cada render, não um requisito à parte.
- **A navegação por papel acabou na barra lateral do painel, não no cabeçalho de
  marketing.** A primeira versão pusera "Alunos"/"Portal" como ligações condicionais no
  `SiteHeader` — tecnicamente correcto, mas continuava a parecer a montra pública com dois
  botões a mais, não um painel administrativo. `SiteHeader` voltou a ser só a montra;
  `DashboardShell` é a casca a sério de quem entrou. Ver `docs/specs/role-shell.md` §3.4.
- **Um componente de ícone não atravessa a fronteira Server → Client como prop.** O Next.js
  recusa em runtime — `navItems` calculado em `(dashboard)/layout.tsx` (servidor) só leva
  `{ href, label }`; `DashboardShell` resolve o ícone do lado do cliente a partir do `href`.
- **`setRequestLocale` tem de ser chamado em cada layout que usa traduções, não só na
  página.** Separar a casca de marketing para `(marketing)/layout.tsx` fez `/`,
  `/design-system` e `/sign-in` perderem a pré-renderização estática, sem aviso do build —
  faltava chamar `setRequestLocale` nesse layout também, porque é ele quem renderiza
  `SiteFooter` (que usa `getTranslations()`). Ver `docs/specs/role-shell.md` §3.5.

## Fase 4 — Ecrã de matrículas

Change (OpenSpec): [`openspec/changes/enrollment-screen/`](openspec/changes/enrollment-screen/).

### Adicionado

- Secção "Por matricular" em `/alunos`, visível a `SCHOOL_MANAGER`, listando alunos
  (`Student`) da escola sem `Enrollment` no ano lectivo activo —
  `listUnenrolledStudents` (`src/features/academic/data/enrollments.ts`).
- Server Action `enrollStudent`
  (`src/features/academic/actions/enroll-student.ts`), segundo molde do padrão
  estabelecido por `create-student.ts`: autorização, `enrollStudentSchema` (Zod,
  partilhado com o `FormModal`), escrita transaccional de `Enrollment` + `AuditLog`,
  `fieldErrors` por campo, `revalidatePath` das duas línguas.
- `listEnrollmentOptions` — turmas e percursos do ano activo, mais o número de matrícula
  sugerido (`{ano}/{sequência}`, mesma convenção do `prisma/seed.ts`), pré-preenchido mas
  editável.
- `suggestEnrollmentNumber` (`src/features/academic/domain/enrollment-number.ts`) — função
  pura, testada isoladamente.

### Decisões

- **Fecha uma lacuna documentada na Fase 3**: `create-student` criava o `Student` mas
  `/alunos` lista por `Enrollment` — um aluno criado ficava invisível até alguém o
  matricular, e nada fazia isso. Ver "Problema conhecido" na Fase 3, abaixo.
- **Segunda secção na mesma página, não uma rota nova.** Evita duplicar a resolução de
  "que alunos, que escola" que `/alunos` já faz, e mantém o modelo de um só ecrã que
  `create-student` já tinha estabelecido. Ver `openspec/changes/enrollment-screen/design.md`
  para as alternativas consideradas.
- **`academicYearId` resolvido no servidor, nunca vindo do cliente** — mesma razão que
  `create-student` resolve `schoolId` a partir da sessão: um ano a fechar entre o modal
  abrir e submeter não deve poder ser escolhido pelo formulário.
- **`P2002` do `@prisma/adapter-mariadb` não preenche `error.meta.target`** — ao
  contrário do que a documentação do Prisma assume. O nome do índice vem em
  `meta.driverAdapterError.cause.constraint.index`. Sem isto, `enroll-student` não
  conseguia distinguir "número de matrícula repetido" de "aluno já matriculado" — os dois
  violam índices únicos diferentes na mesma escrita. Centralizado em
  `uniqueConstraintTarget` (`src/lib/db/errors.ts`), para o próximo módulo com mais do que
  uma restrição única não repetir a descoberta.

## Fase 3 — Fecho da fundação

Spec: [`docs/specs/pending-fixes.md`](docs/specs/pending-fixes.md).

### Adicionado

- `SchoolSwitcher` (`src/components/layout/school-switcher.tsx`) — só aparece a quem tem
  mais do que uma `Membership`; troca a escola activa via `useSession().update()`.
- `<SessionProvider>` em `src/app/[locale]/layout.tsx`, sem prop `session`, e ligação
  "Alunos" na navegação condicional a `status === "authenticated"`.
- `resolveActiveSchool` (`src/features/identity/domain/access.ts`) — validação pura da
  troca de escola contra as `Membership` do token, extraída do `jwt` callback.
- Primeira Server Action do projecto: `createStudent`
  (`src/features/academic/actions/create-student.ts`), o molde dos módulos seguintes —
  autorização com `isSchoolAdministrator`, `createStudentSchema` (Zod, partilhado com o
  `FormModal`), escrita transaccional de `Student` + `AuditLog`, `fieldErrors.code` num
  número de aluno repetido, `revalidatePath` das duas línguas.
- Correcção do defeito de datas em inglês: `src/i18n/use-locale-formatter.ts`
  (`useLocaleFormatter`) formata com o tag completo (`LOCALE_TAGS[locale]`, `en-GB`),
  usando `Intl` directamente; formatos extraídos para `src/i18n/formats.ts`, partilhados
  com `request.ts` e `src/test/intl.tsx`.

### Decisões

- **A lógica de troca de escola vive em `access.ts`, não no callback `jwt`.** Importar
  `src/lib/auth/config.ts` (que chama `NextAuth()`) rebenta sob Vitest — arrasta
  `next/server`, que o runtime de teste não resolve fora do Next. Isolar a validação como
  função pura é o que a torna testável, e é consistente com `sign-in-policy.ts`.
- **O cabeçalho lê a sessão do lado do cliente.** `src/app/[locale]/layout.tsx` continua
  estático (`generateStaticParams`); chamar `auth()` aí tornaria toda a aplicação dinâmica,
  já que o projecto não tem PPR configurado. `/design-system` e `/` continuam
  pré-renderizadas; só `/alunos`, que já usava `auth()`, é dinâmica.
- **`getTranslations`, `getPathname` e `revalidatePath` são mockados nos testes da Server
  Action.** Fora do runtime do Next, `getTranslations` resolve para o build de cliente e
  lança; `getPathname` (via `next-intl/navigation`) arrasta `next/navigation`, que o Vitest
  não resolve; `revalidatePath` exige uma loja de geração estática que só existe num pedido
  real. Os três mocks isolam o que interessa testar — autorização, validação e a escrita
  transaccional — sem tentar simular o runtime do Next.
- **A formatação de datas em inglês não podia viver no `locale` que `getRequestConfig`
  devolve.** A primeira tentativa devolveu o tag completo (`LOCALE_TAGS[locale]`,
  `en-GB`) directamente em `request.ts`. Corrigiu a ordem dia/mês, mas partiu a
  navegação: o `useFormatter()` do next-intl usa o MESMO `locale` para formatar e para
  gerar `href`s (`Link`, `usePathname`), e `routing.pathnames` só conhece "pt"/"en" — um
  `Link` para "/design-system" passou a resolver `/pt-MZ/design-system`, que não existe.
  `locale` em `request.ts` voltou ao código curto, e `useLocaleFormatter`
  (`src/i18n/use-locale-formatter.ts`) ficou responsável só pela formatação, com `Intl`
  directamente e o tag completo — sem tocar no `locale` que o encaminhamento lê.

### Problema conhecido

- **Um aluno criado por `create-student` não aparece em `/alunos` sem matrícula.** A lista
  parte da `Enrollment` do ano lectivo activo (`listEnrolledStudents`, ver Fase 2 Passo 7),
  não do `Student`. `create-student` é deliberadamente só o molde do padrão de mutação — o
  spec (`pending-fixes.md`) não incluía campos de matrícula (turma, percurso, número) no
  esquema, e adicioná-los agora exigiria selectores de `ClassGroup`/`StudyPath` fora do
  âmbito aprovado. O critério de aceitação "a lista actualiza" só se verifica, por agora,
  criando também uma `Enrollment` — o que fica para o ecrã de matrículas.
  **Fechado na Fase 4** (`enrollment-screen`).

## Fase 2 — Fundação de domínio

Spec: [`docs/specs/domain-foundation.md`](docs/specs/domain-foundation.md).

### Adicionado (Passo 1 — modelo de dados)

- Prisma 7.9 com `@prisma/adapter-mariadb`, ligado a MariaDB 12.3.
- `prisma/schema.prisma`: 40 modelos e 24 enums cobrindo identidade, académico,
  avaliação, presenças, horários, finanças e auditoria. Migração `init` aplicada.
- `prisma/seed.ts` com o caso que justifica o modelo: duas turmas mistas (10A e
  10B), cada uma com alunos de Ciências e de Letras, esquema de avaliação
  `AC 0.40 + AT 0.60`, horário de 13 aulas sem conflitos e tabela de propinas.
- `src/lib/db/client.ts` — cliente Prisma cru, restrito a `src/lib/db/`.
- `src/lib/auth/password.ts` — Argon2id com os parâmetros recomendados pela OWASP
  (19 MiB, 2 iterações, paralelismo 1), com 9 testes.
- `.env.example` e scripts `db:*` no `package.json`.

### Adicionado (Passo 2 — tipos e isolamento entre escolas)

- `src/lib/db/tenant.ts` — `getTenantDb(schoolId)`: extensão do Prisma Client que
  injecta `schoolId` no `where` de todas as leituras e valida o `schoolId` das
  escritas. 11 testes de integração contra a base real.
- Regra ESLint `@typescript-eslint/no-restricted-imports` que impede importar o
  cliente Prisma em runtime fora de `src/lib/db`; tipos continuam livres.
- `src/types/index.ts` — fronteira única de tipos, com o alias `Classroom`.
- `src/features/shared/domain/numeric.ts` — `Money`, `Score`, `roundScore`, `sum`,
  sobre decimal.js. 20 testes.
- Tipos de domínio sem infra-estrutura: `academic/domain/assessment.ts`,
  `academic/domain/scheduling.ts`, `identity/domain/access.ts`, e a porta
  `finance/domain/ports/mobile-money-gateway.ts`.

### Decisões (Passo 2)

- **Escritas continuam a exigir `schoolId` no TypeScript.** A extensão é de runtime
  e o sistema de tipos não a vê. Em vez de contornar isso com casts, aceita-se: um
  `schoolId` em falta passa a erro de compilação e um `schoolId` errado passa a erro
  de runtime. As duas garantias juntas são mais fortes do que a injecção sozinha.
- **A lista `TENANT_SCOPED_MODELS` não é mantida à mão.** Um teste lê o
  `schema.prisma`, extrai os modelos com `schoolId` e falha se divergir — acrescentar
  um modelo sem o registar parte os testes em vez de abrir uma fuga silenciosa.
- **Um `schoolId` contraditório numa escrita lança em vez de ser reescrito.**
  Corrigi-lo em silêncio esconderia um bug de chamada.
- **O domínio usa decimal.js, não `number`.** O Prisma 7 devolve colunas `Decimal`
  como instâncias de decimal.js; converter para `number` reintroduziria o erro
  binário que a coluna existe para evitar.
- **`toDecimal` rejeita `Infinity`**, que o decimal.js aceita em silêncio, e traduz
  a excepção do decimal.js para uma mensagem própria.

### Corrigido

- `vitest.setup.ts` assumia sempre o ambiente jsdom, o que rebentava os testes de
  base de dados que correm em ambiente `node`. Tudo o que toca no DOM ficou atrás de
  uma guarda.

### Adicionado (Passo 3 — motores de domínio)

- `academic/domain/grade-engine.ts` — `computeSubjectResult` e `validateScheme`.
  Funções puras: sem I/O, sem Prisma, sem data actual. 28 testes.
- `academic/domain/schedule-conflicts.ts` — `detectScheduleConflicts`,
  `conflictsForPlacement`, `isFree`. 13 testes.
- `academic/schedule.integration.test.ts` — cruza o horário gravado pelo seed com o
  motor de conflitos. 5 testes.
- `src/lib/db/schools.ts` — consultas sobre `School`, a única camada onde o acesso
  sem filtro de escola é legítimo (a escola é o próprio tenant).

### Decisões (Passo 3)

- **Componente sem notas renormaliza os pesos.** Com só AT lançado (peso 0.6), a média
  de 12 daria 7.2 sem renormalização — reprovaria um aluno por notas que a escola
  ainda não lançou. O peso é redistribuído e o facto fica registado em `notes`.
- **Sem notas devolve `null`, não zero.** Zero é uma nota; ausência de nota não é.
- **`validateScheme` devolve lista, não lança na primeira falha.** Quem configura o
  esquema deve ver tudo o que está errado de uma vez.
- **Admitido a exame sem nota lançada fica `passed: null`.** Pendente não é reprovado.
- **`isAbsent` não decide sozinho.** Uma entrada conta se tiver nota: uma falta com
  zero atribuído pela escola conta como zero, uma falta sem nota é excluída.
- **`detectScheduleConflicts` devolve todos os conflitos.** Parar no primeiro
  transformaria montar um horário num jogo de tentativa e erro.
- **`conflictsForPlacement` filtra conflitos preexistentes** e não conta uma aula
  contra si própria ao remarcar.
- **Seed: Filosofia e TIC passaram para a professora de Português.** Realista numa
  escola de dimensão média, e torna verificável o critério de aceitação de um
  professor com Tronco Comum, Secção e Currículo Interno no mesmo ano.

### Adicionado (Passo 4 — internacionalização)

- `next-intl` 4.13 com `localePrefix: "as-needed"`: português sem prefixo, inglês
  em `/en`. Caminhos traduzidos — `/sistema-de-design` e `/en/design-system`.
- `src/proxy.ts` — encaminhamento por língua. No Next 16 o ficheiro chama-se
  `proxy.ts`, não `middleware.ts`.
- `src/i18n/{routing,navigation,request}.ts` e `messages/{pt,en}.json`.
- `LocaleSwitcher` — par de ligações, não um `<select>`: funciona sem JavaScript e
  produz URLs indexáveis.
- Formatos centralizados no pedido: moeda MZN, datas curtas/longas, notas com duas
  casas, fuso `Africa/Maputo`.
- Rotas movidas para `src/app/[locale]/`, com `generateStaticParams` e
  `setRequestLocale` para as duas línguas continuarem pré-renderizadas.
- `src/test/intl.tsx` — render com as mensagens reais do catálogo.
- 5 testes de paridade dos catálogos e 7 da página inicial nas duas línguas.

### Decisões (Passo 4)

- **Detecção automática de língua desligada (`localeDetection: false`).** Por
  omissão, um browser configurado em inglês seria encaminhado para `/en`. Em
  Moçambique isso engana-se: muitos telemóveis Android são vendidos com o sistema em
  inglês e usados por quem trabalha em português. `/` é sempre português; o inglês é
  uma escolha explícita que o endereço transporta.
- **`pt-MZ` e `en-GB` no atributo `lang`**, não `pt` e `en`: é o tag completo que
  decide a pronúncia do leitor de ecrã e o formato de datas e números.
- **Ano do rodapé passado como texto.** Em ICU um número leva separador de milhares
  e "2026" sairia "2 026".
- **`HomeSections` separado da rota.** Um Server Component `async` não se renderiza
  no Testing Library; manter a página inteira dentro de um `async` deixaria a página
  inicial sem testes.
- **O corpo do style guide fica em português nas duas línguas.** É documentação para
  quem desenvolve — traduzir `border-strong` tornaria a página inútil. Só o título
  entra no catálogo.
- **Teste de paridade dos catálogos.** O erro típico da tradução é acrescentar uma
  chave numa língua e esquecer a outra, o que não rebenta nada — apenas mostra o
  caminho da chave ao utilizador. Passa a ser falha de build.

### Adicionado (Passo 5 — shadcn/ui, DataTable e FormModal)

- shadcn/ui (Radix) com `table`, `dialog`, `select`, `checkbox`, `popover`,
  `command`, `label`, `form`, `dropdown-menu`, remapeados aos tokens da Fase 1.
- `src/components/ui/README.md` — o que muda face ao shadcn de origem e o que tem de
  ser reaplicado num `shadcn add` futuro.
- `DataTable` (TanStack Table 8) — ordenação, pesquisa, paginação, selecção,
  visibilidade de colunas, estados de vazio/carregamento/erro. 13 testes.
- `FormModal` — campos gerados de uma `FormDefinition` (Zod + descrição de
  apresentação), erros de servidor mapeados aos campos. 7 testes.
- `Input` ganhou `hideLabel`: rótulo para leitores de ecrã sem o mostrar.

### Decisões (Passo 5)

- **`accent` significa coisas opostas nos dois sistemas.** No shadcn é a superfície
  de *hover* de menus; no EduMoz é o âmbar da chamada para acção. Mapear um no outro
  pintaria cada item de menu de âmbar — as classes do shadcn foram reescritas para
  `bg-muted`/`text-foreground`.
- **`--color-input` aponta para `--edu-border-strong`.** O shadcn usa `border-input`
  nos campos de formulário; com o contorno decorativo (1.2:1) todos falhariam o
  critério de 3:1 do WCAG.
- **Tamanhos de botão próprios.** O shadcn usa 36px por omissão e 40px em `lg`; a
  RNF-02 exige 44px. `sm` 44, `md` 48, `lg` 56, `icon` 44×44.
- **TanStack Table 8, não 9.** A v9 exige registo explícito de *features* com um
  modelo novo e pouco documentado; a v8 é a linha que o próprio shadcn documenta.
- **`sortDescFirst: false`.** O TanStack ordena colunas numéricas de forma
  decrescente ao primeiro clique e as de texto de forma crescente — clicar em "Nome"
  e em "Média" faria coisas opostas.
- **Abaixo de 768px a tabela vira lista de cartões**, em vez de fazer scroll
  horizontal. Uma pauta de 12 colunas num ecrã de 375px é ilegível de qualquer forma.
- **O formulário remonta a cada abertura** em vez de ser reposto por `useEffect`. O
  `DialogContent` do Radix só monta quando aberto; a alternativa violava a regra
  `react-hooks/set-state-in-effect` do React Compiler.
- **Erro de servidor num campo não é repetido no topo.** Repetir a mesma queixa em
  dois sítios faz o utilizador procurar duas vezes.

### Corrigido

- `vitest.setup.ts` — preenchimentos para Pointer Capture, `scrollIntoView` e
  `ResizeObserver`, que o jsdom não implementa e os primitivos do Radix exigem.
- `Input` tinha "(obrigatório)" em português fixo no código; passou ao catálogo.

### Adicionado (Passo 6 — autenticação)

- `identity/domain/sign-in-policy.ts` — `decideSignIn` e `canCreateInvitation`.
  Funções puras, 22 testes, sem Auth.js nem base de dados.
- `identity/data/sign-in.ts` — carrega o contexto, aplica a decisão e aceita convites
  numa transacção.
- `src/lib/auth/config.ts` — Auth.js v5 com Google e credenciais, sessão JWT com
  escola activa e papel nessa escola.
- Rota `/api/auth/[...nextauth]`, tipos de sessão, `AUTH_SECRET` local gerado.

### Decisões (Passo 6)

- **A decisão de acesso é uma função pura.** É a peça de segurança central e vive
  fora da infra-estrutura precisamente para poder ser testada exaustivamente: convite
  expirado, aceite, revogado, domínio errado, conta suspensa, e-mail não verificado.
- **`decideSignIn` devolve os convites a aceitar, não os aceita.** Quem chama aplica
  o efeito dentro da transacção do login, o que o torna atómico.
- **A razão da recusa vai para os registos, não para o ecrã.** Dizer "a sua conta
  está suspensa" confirma a um estranho que aquele e-mail existe naquela escola.
- **Verificação de e-mail só se exige ao Google.** No login por credenciais não há
  terceiro a quem confiar: a escola criou a conta e definiu a palavra-passe.
- **A troca de escola é validada contra as `Membership` do token.** Sem isso,
  bastaria pedir a troca para um `schoolId` qualquer.
- **Terceira excepção à regra do cliente Prisma cru.** A autenticação acontece antes
  de haver escola — descobrir a que escolas um e-mail pertence é a pergunta que o
  `getTenantDb(schoolId)` já pressupõe respondida.
- **`AppToken` tipado à mão.** A augmentação de módulo do `next-auth/jwt` não aplica
  de forma fiável na v5 beta, e um token silenciosamente `any` é pior do que um cast
  explícito e confinado.

### Adicionado (Passo 7 — login, protecção de rotas e /alunos)

- Ecrã de início de sessão em `/entrar` e `/en/sign-in`, com Google e credenciais.
- `src/proxy.ts` passou a proteger rotas: verificação optimista do cookie de sessão,
  com redireccionamento para o login **na língua do pedido**.
- `/alunos` e `/en/students` — lista de matriculados do ano lectivo activo, com a
  `DataTable`, a escola resolvida pela sessão e o isolamento por `getTenantDb`.
- `features/academic/data/students.ts` — consulta que parte da MATRÍCULA, não do
  aluno, para o percurso vir do sítio certo.

### Decisões (Passo 7)

- **A autorização real está na página, não no proxy.** O proxy só vê se o cookie
  existe; é `auth()` na página que valida a sessão. Um cookie forjado passa lá e
  morre aqui — que é o que a documentação do Next 16 recomenda.
- **O redireccionamento respeita a língua.** Quem está em `/en/students` vai para
  `/en/sign-in`, não para uma página portuguesa.
- **A mensagem de erro do login é sempre a mesma.** Conta inexistente,
  palavra-passe errada e acesso recusado pela política são indistinguíveis do lado
  de fora; distingui-las revelaria que e-mails existem na escola.

### Problema conhecido

- **Datas em inglês saem em ordem americana.** O `lang` do HTML declara `en-GB`, mas
  o formatador do next-intl usa o código curto `en`, que o `Intl` trata como `en-US`
  — 4 de Maio aparece como `05/04/2010` em vez de `04/05/2010`. A página contradiz
  o que declara de si própria. Resolve-se com um locale de formatação distinto do
  locale de encaminhamento; ainda não está feito.

### Corrigido (revisão do esquema)

Revisão feita contra a base de dados real, não contra o ficheiro. Quatro falhas
encontradas e corrigidas antes de haver dados:

- **`Student`, `Teacher` e `Guardian` sem unicidade em `userId`.** O mesmo `User`
  podia ficar ligado a dois alunos da mesma escola. Adicionado
  `@@unique([schoolId, userId])`; NULLs continuam distintos em MySQL, portanto
  alunos sem conta continuam a ser permitidos.
- **Índice único do `AssessmentScheme` não protegia o esquema base.** Incluía duas
  colunas nuláveis; com ambas a NULL — que é exactamente o esquema base do ano — o
  MySQL aceitava duplicados ilimitados e a resolução do esquema deixava de ser
  determinística. Adicionado `@@unique([academicYearId, name, version])`.
- **`Invitation` impedia reconvidar.** O único `(schoolId, email, role)` bloqueava
  para sempre um e-mail depois de o convite ser aceite ou revogado. Substituído por
  índice não-único; a regra "um só convite PENDING" passa para o domínio.
- **`IssuedDocument` caía em cascata com o aluno.** Apagar um aluno destruía
  certificados e declarações emitidos. Passou a `onDelete: Restrict`.

### Notas de infra-estrutura

- O `prisma init` do Prisma 7 instala skills de agente em `.agents/`, `.windsurf/`
  e `.claude/`. Consolidadas numa só cópia real em `.claude/skills/`.
- `prisma migrate reset` é bloqueado pelo Prisma quando invocado por um agente;
  exige consentimento explícito do utilizador via
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.
- O seed não faz teardown: apagar a escola em cascata falha em
  `Enrollment → ClassGroup` (RESTRICT), e essa restrição está certa. Para semear de
  novo usa-se `pnpm db:reset`.

### Decisões (Passo 1)

- **`TeachingGroup` aponta para `Subject`, não para `CurriculumSubject`.** Num
  grupo de Tronco Comum os alunos vêm de percursos diferentes, logo de linhas de
  `CurriculumSubject` diferentes — uma chave estrangeira única para
  `CurriculumSubject` tornaria as turmas mistas inexprimíveis.
- **`ClassGroup` + `Room` em vez de um só `Classroom`.** Turma e sala física são
  entidades distintas e o motor de horários precisa das duas em simultâneo.
  `Classroom` fica como alias de tipo em `src/types`.
- **Carimbos de autoria (`recordedById`, `issuedById`, …) são `String` sem chave
  estrangeira.** São registo histórico: apagar um utilizador não deve apagar a
  prova de quem lançou uma nota.
- **Horas como `String` "HH:mm".** O tipo `TIME` do MySQL chega ao Prisma como
  `DateTime` com data fictícia, o que convida a erros de fuso horário.
- **Unicidade real do `StudyPath` garantida por `(academicYearId, code)`.** Em
  MySQL, NULLs num índice único são sempre distintos, portanto
  `(ano, classe, secção)` não impede duplicados quando `sectionId` é nulo.
- **Campos de exame do `AssessmentScheme` marcados POR CONFIRMAR.** Derivam de um
  modelo de ensino superior, não de prática de ensino secundário validada; ficam
  nulos até confirmação, mas existem desde a primeira migração porque acrescentar
  colunas de regra a um motor de notas com pautas reais é migração destrutiva.

### Adicionado

- Sistema de design gerado com a skill `ui-ux-pro-max` e persistido em
  `design-system/edumoz/MASTER.md`; decisões e desvios documentados em
  [`docs/specs/design-system.md`](docs/specs/design-system.md).
- Tokens semânticos (cor, tipografia, espaçamento, raio, elevação, motion) em
  `src/app/globals.css`, expostos como utilitários Tailwind 4 via `@theme`.
- Tema claro e escuro com preferência persistida e script anti-*flash*
  (`data-theme` no elemento raiz).
- Primitivos de UI: `Button`, `Card`, `Input`, `Badge`.
- Shell da aplicação: cabeçalho fixo com navegação e menu móvel, rodapé,
  ligação "saltar para o conteúdo".
- Página inicial pública e style guide vivo em `/design-system`.
- Vitest + Testing Library com 15 testes (comportamento, acessibilidade e uso de
  tokens).

### Decisões

- **Lexend + Source Sans 3** em vez do par Fira Code/Fira Sans sugerido pela
  skill: uma monoespaçada em títulos comunica ferramenta técnica, não uma
  instituição de ensino, e o público inclui encarregados de educação.
- **Paleta ajustada para WCAG AA.** `primary` `#0D9488` → `#0F766E` e `accent`
  `#D97706` → `#B45309` (ambos falhavam 4.5:1 com texto branco); `border`
  desdobrado em decorativo (`#CCE9E4`) e funcional (`#6E9A94`, 3:1);
  `destructive` `#DC2626` → `#B91C1C` para passar sobre o seu próprio fundo.
- **Sem GSAP nesta fase.** A transição de página sugerida introduz um overlay que
  atrasa a navegação — penaliza ligações lentas, cenário comum em Moçambique.
  Usa-se o carregamento nativo do App Router.
- **Modo escuro implementado**, contra a recomendação genérica da skill: aqui é
  preferência do utilizador (secretarias com trabalho nocturno), não estética
  predominante. O claro continua a ser o predefinido.
- **`useSyncExternalStore` no selector de tema** em vez de `useEffect` +
  `setState`: o elemento raiz é a fonte de verdade e a regra
  `react-hooks/set-state-in-effect` do React Compiler rejeita a alternativa.

### Integridade multi-escolas e anual

- Cliente de escola restringe modelos globais, SQL livre, junções e navegação relacional; referências validadas no MariaDB sem alterar políticas de exclusão existentes.
- Migração de integridade aplicada em teste e desenvolvimento após backup; ensaio de histórico incompatível não reescreveu dados. Suite actual: 79 ficheiros/655 testes passaram, com criação e matrícula sintéticas verificadas no navegador.

### Notas e fecho de trimestre

- Lotes de notas respeitam maxScore e estado aberto, com rollback integral de pedidos inválidos. Lançamento, criação de avaliação e fecho serializados pelo trimestre; plano e esquema lidos na transacção de fecho.
- Reabertura com permissão, motivo obrigatório e snapshots auditáveis; resultados reabertos ocultos do portal/pauta até novo fecho. Grelha fechada fica em consulta.
- Migração aditiva com seis triggers aplicada após backup. Suite: 81 ficheiros/672 testes; percurso pt/en verificado no navegador com resultado final 18 e snapshot anterior 15.

### Revisão das funcionalidades existentes — 2026-10-28

- Corrigidos acesso directo a presenças, submissão/reabertura concorrentes, datas, precisão decimal, login por telefone, contexto de idioma/escola/factura e reconciliação de rascunhos.
- Introduzidos limitador persistente de credenciais, limite do corpo Auth.js, validação de origem e protecções de cache/cabeçalhos; actualizadas dependências com alertas conhecidos.
- Verificados build Turbopack, regressão e percursos de navegador em base sintética isolada; detalhes e limites em `docs/specs/esagrada-existing-corrections.md`.

- Continuação da revisão: corrigidos filtros/períodos de consulta financeira e corrida de horários de alunos partilhados. Regressão: 862 testes; build e navegador de produção validados. Sem novos módulos ou migrações nesta continuação.

- Página 404 localizada em pt/en com recuperação no idioma actual. Validação final desta continuação: 864 testes, build Turbopack e dez verificações HTTP de produção aprovados.

- Aceitação da fundação existente em desktop/móvel, pt/en e escolas A/B com papéis restritos; mensagem de consulta de presenças corrigida. Contrato M01 e inventário da origem preparados para aprovação, sem implementação nova desse módulo.

- M01: edição/eliminação escolar de papéis com revisão e auditoria atómica, protecção de perfis de sistema e associações históricas, FK RESTRICT e matriz de níveis com ajustes finos. Corrigidas validação ICU e actualização desnecessária ao cancelar. 136 ficheiros/1182 testes, build/tipos e navegador pt/en/móvel aprovados; M01 continua em execução.

- M01: preparação escolar explícita dos nove perfis de sistema, idempotente e sem atribuir pessoas ou reintroduzir grants retirados. Correspondência tipada de 55 capacidades/dependências e projecções conservadoras para os consumidores disponíveis. 140 ficheiros/1201 testes, build e navegador pt/en/móvel aprovados; atribuições múltiplas e granularidade seguinte continuam em execução.
