## MODIFIED Requirements

### Requirement: Gestor gere turmas
O sistema SHALL permitir criar e editar `ClassGroup` — nome, turno, capacidade e
director de turma (`headTeacherId`, opcional) — associada ao ano lectivo activo.

#### Scenario: Turma sem ano lectivo activo
- **WHEN** não há nenhum `AcademicYear` com `isActive: true`
- **THEN** o sistema explica que é preciso um ano lectivo activo antes de criar turmas,
  em vez de um formulário que falha silenciosamente

#### Scenario: Atribuir um director de turma
- **WHEN** um gestor cria ou edita uma turma e escolhe um `Teacher` como director de
  turma
- **THEN** esse professor passa a ver presenças e notas de toda a turma (ver capability
  `homeroom-teacher-scope`)

#### Scenario: Turma sem director de turma
- **WHEN** um gestor cria uma turma sem escolher director de turma
- **THEN** a turma fica criada na mesma — `headTeacherId` é opcional
