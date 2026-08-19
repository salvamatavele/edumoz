## ADDED Requirements

### Requirement: Aluno e encarregado de educação vêem as notas publicadas
O sistema SHALL mostrar, em `/portal`, os `TermResult` das disciplinas do próprio aluno
(para um utilizador com papel `STUDENT`) ou do(s) seu(s) educando(s) (para um utilizador
com papel `GUARDIAN`), para trimestres fechados.

#### Scenario: Aluno vê as suas notas
- **WHEN** um aluno acede a `/portal`
- **THEN** vê os `TermResult` das suas disciplinas, por trimestre fechado

#### Scenario: Encarregado de educação com mais do que um educando
- **WHEN** um encarregado de educação com mais do que um educando na escola acede a
  `/portal`
- **THEN** consegue escolher qual educando ver, e só vê as notas desse

### Requirement: Nunca vê notas de outro aluno
O sistema SHALL restringir a leitura de `TermResult` em `/portal` ao próprio aluno (papel
`STUDENT`) ou aos educandos com uma relação `GuardianRelationship` activa e válida (papel
`GUARDIAN`) — nunca a outro aluno da escola.

#### Scenario: Encarregado sem relação com o aluno
- **WHEN** um encarregado de educação tenta ver as notas de um aluno que não é seu educando
- **THEN** o pedido é recusado

### Requirement: Trimestre por fechar não aparece
O sistema SHALL NOT mostrar, em `/portal`, nenhum resultado de um trimestre ainda `OPEN` —
só trimestres `CLOSED` têm `TermResult` para mostrar.

#### Scenario: Trimestre a decorrer
- **WHEN** o trimestre actual ainda está `OPEN`
- **THEN** o aluno/encarregado não vê nenhum resultado desse trimestre, mesmo que já haja
  notas lançadas
