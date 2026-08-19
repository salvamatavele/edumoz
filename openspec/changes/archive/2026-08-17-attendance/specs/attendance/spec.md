## ADDED Requirements

### Requirement: Sessão abre com todos presentes
O sistema SHALL, ao abrir uma sessão de presenças para um agrupamento e data sem sessão
prévia, marcar todos os alunos matriculados nesse agrupamento como `PRESENT` por omissão.

#### Scenario: Nova sessão sem registos anteriores
- **WHEN** um professor abre a folha de marcação de um agrupamento pela primeira vez numa
  data
- **THEN** todos os alunos do agrupamento aparecem como "Presente"

### Requirement: Alternar o estado de um aluno é imediato
O sistema SHALL reflectir a alternância do estado de um aluno na interface sem esperar por
uma resposta do servidor.

#### Scenario: Professor toca num aluno
- **WHEN** o professor toca no estado de um aluno para o mudar de "Presente" para "Falta"
- **THEN** o ecrã mostra "Falta" de imediato, antes de qualquer pedido ao servidor
  terminar

### Requirement: Submissão grava só o delta numa transacção
O sistema SHALL, ao submeter uma sessão, gravar apenas os registos cujo estado difere de
`PRESENT` (o valor por omissão), numa única transacção, e SHALL fechar a sessão
(`DRAFT` → `SUBMITTED`).

#### Scenario: Turma de 45 com 3 excepções
- **WHEN** uma sessão de 45 alunos é submetida com 3 alunos marcados como "Falta" ou
  "Atrasado" e os restantes 42 como "Presente"
- **THEN** a transacção grava 3 `AttendanceRecord`, não 45, e a sessão passa a
  `SUBMITTED`

### Requirement: A lista de agrupamentos do dia vem do horário do professor
O sistema SHALL apresentar, para a data escolhida (por omissão hoje), apenas os
agrupamentos lectivos em que o professor autenticado tem uma `ScheduleEntry` nesse dia da
semana — nunca uma escolha livre de qualquer agrupamento da escola.

#### Scenario: Professor sem aulas nesse dia
- **WHEN** o professor autenticado não tem nenhuma `ScheduleEntry` no dia da semana da
  data escolhida
- **THEN** a lista aparece vazia, com uma mensagem explícita — não um erro

#### Scenario: Professor tenta abrir um agrupamento que não é seu
- **WHEN** o professor autenticado pede a folha de marcação de um `teachingGroupId` para o
  qual não tem `ScheduleEntry` nesse dia
- **THEN** o pedido é recusado

### Requirement: A lista de alunos vem do agrupamento, não da turma
O sistema SHALL construir a lista de alunos de uma sessão a partir de
`TeachingGroupMember` do agrupamento lectivo, não de todos os alunos da turma.

#### Scenario: Agrupamento de Secção com turmas mistas
- **WHEN** um agrupamento de Secção reúne alunos de duas turmas diferentes que seguem o
  mesmo percurso
- **THEN** a folha de marcação mostra os alunos desse percurso, de ambas as turmas, e
  nenhum aluno da mesma turma que siga outro percurso

### Requirement: Reabrir uma sessão submetida fica registado
O sistema SHALL, ao reabrir uma sessão `SUBMITTED` para `DRAFT`, registar em `AuditLog` o
autor da reabertura e o estado dos registos antes e depois da alteração seguinte.

#### Scenario: Correcção depois de submeter
- **WHEN** uma sessão já `SUBMITTED` é reaberta e um registo é alterado
- **THEN** existe uma entrada em `AuditLog` com o utilizador que reabriu, e o estado
  anterior dos registos fica preservado nela

### Requirement: Direcção vê o mapa de assiduidade
O sistema SHALL permitir a um papel de gestão consultar a assiduidade agregada por turma,
aluno e período, com a contagem de faltas separada por disciplina.

#### Scenario: Contagem por disciplina, não por dia
- **WHEN** um aluno falta a duas disciplinas diferentes no mesmo dia
- **THEN** o mapa de assiduidade regista uma falta em cada disciplina, não duas faltas
  genéricas nem uma falta só

### Requirement: A navegação do painel diferencia professor de gestor
O sistema SHALL mostrar, na barra lateral do painel, "Presenças" a um papel `TEACHER` e
"Assiduidade" a um papel com `isSchoolAdministrator`, e SHALL continuar a não mostrar
nenhum dos dois a um papel de família.

#### Scenario: Professor autenticado
- **WHEN** um utilizador com papel `TEACHER` na escola activa abre o painel
- **THEN** a barra lateral mostra "Presenças" e não mostra "Assiduidade"

#### Scenario: Gestor autenticado
- **WHEN** um utilizador com papel `SCHOOL_MANAGER` na escola activa abre o painel
- **THEN** a barra lateral mostra "Assiduidade" e não mostra "Presenças"
