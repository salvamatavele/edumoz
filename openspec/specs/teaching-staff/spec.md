# teaching-staff

## Purpose

Gestão de `Teacher` e atribuição a `TeachingGroup` (professor × disciplina × turma/secção).

## Requirements

### Requirement: Gestor gere professores
O sistema SHALL permitir criar e editar `Teacher` — código, nome, contacto,
qualificação, carga horária máxima semanal — sem exigir uma conta de utilizador
associada.

#### Scenario: Professor criado sem acesso de login
- **WHEN** um `Teacher` é criado sem ligar `userId`
- **THEN** o registo fica disponível para se atribuir a turmas/disciplinas, mesmo sem
  nenhuma conta poder autenticar-se como esse professor (ver `attendance.md`, gap
  conhecido desde a Fase 6)

### Requirement: Gestor atribui professores a disciplinas e turmas
O sistema SHALL permitir criar `TeachingGroup`, associando um `Teacher` a uma `Subject`
e, consoante o âmbito, a uma `ClassGroup` ou a um conjunto de alunos por percurso.

#### Scenario: Atribuição sem professor ainda ligado a utilizador
- **WHEN** um `TeachingGroup` é criado com um `Teacher` sem `userId`
- **THEN** a atribuição fica válida no horário e nas disciplinas — só a marcação de
  presenças por esse professor específico fica bloqueada até haver login

#### Scenario: Sem nenhuma Subject ou Teacher ainda criados
- **WHEN** o gestor abre o formulário de `TeachingGroup` antes de existir `Subject` ou
  `Teacher`
- **THEN** o sistema indica quais faltam criar primeiro, em vez de selectores vazios

### Requirement: Só quem administra a escola atribui professores
O sistema SHALL restringir a criação/edição de `Teacher` e `TeachingGroup` a uma sessão
que satisfaça `isSchoolAdministrator`.

#### Scenario: Professor tenta atribuir-se a uma disciplina
- **WHEN** um utilizador com papel `TEACHER` chama a acção de criar `TeachingGroup`
- **THEN** o pedido é recusado
</content>
