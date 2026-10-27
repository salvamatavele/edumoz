# fee-schedules

## Purpose

Letting a school administrator define, per academic year, the fee schedules
(`FeeSchedule`) and their line items (`FeeItem` — enrolment fee, monthly tuition, exam
fee, etc.), each with its own recurrence, that `invoicing` later turns into `Invoice`s.

## Requirements

### Requirement: Gestor define tabelas de propinas
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` criar uma
`FeeSchedule` — nome, ano lectivo, e âmbito opcional por classe (`GradeLevel`) ou
percurso (`StudyPath`) — associada ao ano lectivo activo.

#### Scenario: Tabela sem ano lectivo activo
- **WHEN** não há nenhum `AcademicYear` com `isActive: true`
- **THEN** o sistema explica que é preciso um ano lectivo activo antes de criar tabelas
  de propinas

#### Scenario: Tabela sem âmbito
- **WHEN** um gestor cria uma tabela de propinas sem escolher classe nem percurso
- **THEN** a tabela fica criada, aplicável a toda a escola nesse ano lectivo

### Requirement: Gestor define rubricas de uma tabela de propinas
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` criar
`FeeItem`s dentro de uma `FeeSchedule` — código, nome, valor (`Decimal(12,2)`),
recorrência (`FeeRecurrence`), dia de vencimento opcional, e se é obrigatória.

#### Scenario: Código de rubrica repetido na mesma tabela
- **WHEN** um gestor tenta criar uma rubrica com um código já usado na mesma
  `FeeSchedule`
- **THEN** o sistema recusa e explica que o código já existe nesta tabela

#### Scenario: Valor da rubrica é sempre exacto
- **WHEN** uma rubrica é criada com o valor 1800,00
- **THEN** o sistema grava exactamente 1800,00, nunca uma aproximação de vírgula
  flutuante
