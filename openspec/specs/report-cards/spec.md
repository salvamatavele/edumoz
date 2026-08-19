# report-cards

## Purpose

Pauta imprimível por turma e disciplina, construída exclusivamente a partir dos
`TermResult` já gravados no fecho de trimestre.

## Requirements

### Requirement: Pauta imprimível por turma e disciplina
O sistema SHALL permitir a um membro do pessoal da escola (`isStaffRole`) ver e imprimir,
em A4, uma pauta com os `TermResult` de uma turma numa disciplina, para um trimestre
fechado.

#### Scenario: Ver a pauta de uma turma
- **WHEN** um membro do pessoal escolhe uma turma, uma disciplina e um trimestre fechado
- **THEN** vê uma lista de alunos com a sua média, `finalScore` e situação (`passed`)

#### Scenario: Trimestre ainda não fechado
- **WHEN** o trimestre escolhido ainda não está `CLOSED`
- **THEN** o sistema explica que a pauta só fica disponível depois do fecho, em vez de uma
  lista vazia ou parcial

#### Scenario: Impressão não corta colunas em A4
- **WHEN** a pauta é impressa
- **THEN** todas as colunas (nome, média, situação) cabem na largura de uma página A4

### Requirement: A pauta lê só de `TermResult`, nunca recalcula
O sistema SHALL construir a pauta exclusivamente a partir dos `TermResult` já gravados —
SHALL NOT voltar a chamar `computeSubjectResult` a partir de `Grade`/`Assessment` para a
apresentar.

#### Scenario: Notas alteradas depois do fecho
- **WHEN** existem notas (`Grade`) lançadas ou alteradas depois de o trimestre ter sido
  fechado
- **THEN** a pauta continua a mostrar o `TermResult` gravado no fecho, sem reflectir essas
  alterações
</content>
