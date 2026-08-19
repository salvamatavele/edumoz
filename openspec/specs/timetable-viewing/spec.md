# timetable-viewing

## Purpose

Consulta do horário lectivo em `/meu-horario` — por professor ou por aluno/encarregado de
educação — e exportação do horário de uma turma para impressão.

## Requirements

### Requirement: Professor consulta o seu horário
O sistema SHALL permitir a um professor consultar todos os seus `ScheduleEntry`s do ano
lectivo activo — Tronco Comum, Secção e Currículo Interno acumulados, sem distinção — em
`/meu-horario`.

#### Scenario: Professor com agrupamentos de âmbitos diferentes
- **WHEN** um professor lecciona um agrupamento de Tronco Comum, um de Secção e um de
  Currículo Interno
- **THEN** os três aparecem juntos na sua consulta de horário

### Requirement: Aluno consulta o seu horário
O sistema SHALL permitir a um aluno (ou ao seu encarregado de educação) consultar os
`ScheduleEntry`s de todos os agrupamentos lectivos em que a sua matrícula está inscrita,
no ano lectivo activo, em `/meu-horario`. O sistema SHALL NOT mostrar o horário de outro
aluno.

#### Scenario: Aluno vê só o seu horário
- **WHEN** um aluno consulta `/meu-horario`
- **THEN** vê apenas os tempos lectivos dos agrupamentos das suas próprias matrículas

### Requirement: Horário legível em telemóvel
O sistema SHALL apresentar a consulta de horário (`/meu-horario`) sem exigir scroll
horizontal num ecrã de telemóvel.

#### Scenario: Consulta num ecrã estreito
- **WHEN** um professor ou aluno abre `/meu-horario` num ecrã de largura de telemóvel
- **THEN** todo o horário da semana é legível sem arrastar horizontalmente

### Requirement: Exportação do horário de uma turma para impressão
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` exportar o
horário semanal de uma `ClassGroup` num formato adequado a impressão.

#### Scenario: Exportar horário de uma turma
- **WHEN** um gestor pede a exportação do horário de uma turma
- **THEN** o sistema produz uma grelha semanal dessa turma, pronta a imprimir, com os
  tempos lectivos, disciplinas, professores e salas
</content>
