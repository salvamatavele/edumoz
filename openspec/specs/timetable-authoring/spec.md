# timetable-authoring

## Purpose

Criação de `TimeSlot`s e `Room`s, e colocação de `TeachingGroup`s em `ScheduleEntry`s, com
verificação de conflitos (professor, sala, agrupamento, aluno) antes de gravar.

## Requirements

### Requirement: Gestor define tempos lectivos
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` criar
`TimeSlot`s — dia da semana, hora de início, hora de fim, turno e ordem — associados ao
ano lectivo activo.

#### Scenario: Tempo lectivo sem ano lectivo activo
- **WHEN** não há nenhum `AcademicYear` com `isActive: true`
- **THEN** o sistema explica que é preciso um ano lectivo activo antes de definir tempos
  lectivos

### Requirement: Gestor define salas
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` criar
`Room`s — código, nome, capacidade e tipo — para a escola.

#### Scenario: Sala criada sem capacidade definida
- **WHEN** um gestor cria uma sala sem indicar capacidade
- **THEN** a sala fica criada com capacidade zero, só informativa nesta fase — não impede
  nenhuma colocação no horário

### Requirement: Gestor coloca um agrupamento lectivo num tempo
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` colocar um
`TeachingGroup` num `TimeSlot` e numa `Room`, criando um `ScheduleEntry`, com verificação
de conflitos ANTES de gravar.

#### Scenario: Colocação válida
- **WHEN** um gestor coloca um agrupamento num tempo e sala livres, sem nenhum dos quatro
  conflitos (professor, sala, agrupamento, aluno)
- **THEN** o `ScheduleEntry` é gravado

#### Scenario: Duas disciplinas de percursos diferentes no mesmo tempo, sem alunos partilhados
- **WHEN** um gestor coloca Física de Ciências e História de Letras no mesmo tempo
  lectivo, e nenhum aluno está matriculado nos dois percursos
- **THEN** ambas as colocações são permitidas — não há conflito de aluno

### Requirement: Conflito de professor impede a colocação
O sistema SHALL recusar um `ScheduleEntry` cujo professor já tenha outra aula no mesmo
`TimeSlot`, no mesmo ano lectivo.

#### Scenario: Professor já ocupado
- **WHEN** um gestor tenta colocar um agrupamento num tempo em que o professor já lecciona
  outro agrupamento
- **THEN** a colocação é recusada, com a explicação de qual professor e qual outro
  agrupamento colidem

### Requirement: Conflito de sala impede a colocação
O sistema SHALL recusar um `ScheduleEntry` cuja sala já esteja ocupada no mesmo `TimeSlot`,
no mesmo ano lectivo.

#### Scenario: Sala já ocupada
- **WHEN** um gestor tenta colocar um agrupamento numa sala já ocupada nesse tempo por
  outro agrupamento
- **THEN** a colocação é recusada, com a explicação de qual sala e qual outro agrupamento
  colidem

### Requirement: Conflito de agrupamento impede a colocação
O sistema SHALL recusar um segundo `ScheduleEntry` para o mesmo `TeachingGroup` no mesmo
`TimeSlot`.

#### Scenario: Agrupamento marcado duas vezes
- **WHEN** um gestor tenta colocar o mesmo agrupamento lectivo duas vezes no mesmo tempo
- **THEN** a colocação é recusada

### Requirement: Conflito de aluno impede a colocação
O sistema SHALL recusar um `ScheduleEntry` que ponha um aluno matriculado em dois
agrupamentos lectivos distintos no mesmo `TimeSlot`, mesmo quando professor, sala e
agrupamento estão livres — este conflito não é exprimível por índice único, porque uma
matrícula pertence a vários agrupamentos ao mesmo tempo.

#### Scenario: Alunos partilhados entre dois percursos
- **WHEN** um gestor tenta colocar Português de 10A (Tronco Comum) no mesmo tempo que
  Física de Ciências, e os alunos de Ciências de 10A estão matriculados nos dois
  agrupamentos
- **THEN** a colocação é recusada, com a contagem de alunos afectados — nunca a lista de
  nomes um a um

### Requirement: Conflito explicado antes de gravar
O sistema SHALL explicar cada conflito devolvido — que tipo (professor, sala, agrupamento
ou aluno), quem colide com quem, e onde — antes de qualquer tentativa de gravação, nunca
como um erro genérico depois.

#### Scenario: Texto do conflito
- **WHEN** uma colocação candidata gera um ou mais conflitos
- **THEN** o sistema mostra, para cada um, o tipo de conflito e a informação suficiente
  para o gestor decidir sem adivinhar (nome do professor/sala em conflito, ou contagem de
  alunos)

### Requirement: Verificação repete no servidor
O sistema SHALL revalidar os conflitos no servidor, sobre o horário actual recarregado da
base de dados, imediatamente antes de gravar — nunca confiando apenas na verificação já
feita no cliente.

#### Scenario: Horário mudou entre a verificação do cliente e a gravação
- **WHEN** dois gestores tentam colocar agrupamentos que colidem entre si, e o segundo
  submete depois do primeiro já ter gravado
- **THEN** a segunda gravação é recusada pelo servidor, mesmo que a verificação no cliente
  do segundo gestor não tivesse detectado o conflito por estar desactualizada

### Requirement: Aviso ao exceder carga horária semanal
O sistema SHALL avisar, mas SHALL NOT impedir, uma colocação que faça um professor exceder
o seu `Teacher.maxWeeklyHours` no ano lectivo activo.

#### Scenario: Colocação excede o máximo definido
- **WHEN** um gestor coloca um agrupamento que soma, com os já colocados do mesmo
  professor no ano lectivo, mais horas do que `maxWeeklyHours`
- **THEN** o sistema grava a colocação e mostra um aviso, não um erro

#### Scenario: Professor sem máximo definido
- **WHEN** `Teacher.maxWeeklyHours` é nulo
- **THEN** nenhum aviso de carga horária é mostrado, seja qual for o número de horas
  colocadas
</content>
