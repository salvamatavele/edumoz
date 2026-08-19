# homeroom-teacher-scope

## Purpose

Um professor que seja `ClassGroup.headTeacher` (director de turma) passa a ver presenças
e notas de toda a turma, em qualquer disciplina — não só dos seus próprios agrupamentos
lectivos. O alargamento é só de leitura: continua sem poder lançar notas ou marcar
presenças fora das disciplinas que lecciona.

## Requirements

### Requirement: Director de turma vê presenças de toda a turma
O sistema SHALL, quando um professor é `ClassGroup.headTeacher` de uma turma, incluir na
sua leitura de presenças todos os agrupamentos lectivos dessa turma — não só os que
lecciona.

#### Scenario: Director de turma vê disciplina que não lecciona
- **WHEN** um professor é director da turma 10A e a turma tem uma sessão de presenças de
  Física (disciplina que não lecciona)
- **THEN** essa sessão aparece na sua leitura de presenças da turma

#### Scenario: Professor sem ser director de turma
- **WHEN** um professor não é director de nenhuma turma
- **THEN** só vê os agrupamentos lectivos que lecciona, tal como antes

### Requirement: Director de turma vê notas de toda a turma
O sistema SHALL, quando um professor é `ClassGroup.headTeacher` de uma turma, incluir na
sua leitura de notas todos os alunos e disciplinas dessa turma.

#### Scenario: Director de turma vê nota de outra disciplina
- **WHEN** um professor é director da turma 10A e um aluno da turma tem uma nota lançada
  em Matemática (disciplina que o director não lecciona)
- **THEN** essa nota é visível ao director de turma

### Requirement: Director de turma não ganha permissão de editar fora das suas disciplinas
O sistema SHALL NOT permitir a um director de turma lançar notas ou marcar presenças em
disciplinas que não lecciona — o alargamento é só de leitura.

#### Scenario: Director de turma tenta lançar nota de outra disciplina
- **WHEN** um director de turma tenta lançar uma nota de Física, sem ser o professor
  dessa disciplina
- **THEN** o pedido é recusado, tal como seria para qualquer outro professor
