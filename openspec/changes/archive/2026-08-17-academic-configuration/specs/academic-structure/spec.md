## ADDED Requirements

### Requirement: Gestor gere níveis/classes
O sistema SHALL permitir a um `SCHOOL_MANAGER` (ou `PLATFORM_ADMIN`) criar e editar
`GradeLevel` — código, nome, ordem, ciclo de ensino, e se é uma classe com exame nacional.

#### Scenario: Criar uma classe com exame nacional
- **WHEN** um gestor cria um `GradeLevel` com `isExamLevel` activo
- **THEN** o `GradeLevel` fica disponível para se associar a `AssessmentScheme` com
  regime de exame

### Requirement: Gestor gere secções
O sistema SHALL permitir criar e editar `Section` — código, nome, descrição.

#### Scenario: Secção fica disponível para percursos
- **WHEN** uma secção é criada
- **THEN** fica disponível como opção ao criar um `StudyPath` para essa secção

### Requirement: Gestor gere percursos
O sistema SHALL permitir criar e editar `StudyPath`, associando-o a um `GradeLevel` e,
quando aplicável, a uma `Section`.

#### Scenario: Percurso sem secção (ensino sem secções)
- **WHEN** o `GradeLevel` é do ciclo primário ou do 1º ciclo, que não têm secções
- **THEN** o formulário permite criar o `StudyPath` sem escolher uma `Section`

#### Scenario: Sem nenhum GradeLevel ainda criado
- **WHEN** o gestor abre o formulário de `StudyPath` antes de existir nenhum `GradeLevel`
- **THEN** o sistema mostra que é preciso criar um `GradeLevel` primeiro, em vez de um
  selector vazio

### Requirement: Gestor gere disciplinas
O sistema SHALL permitir criar e editar `Subject` — código, nome, nome curto, área.

#### Scenario: Disciplina reutilizável entre percursos
- **WHEN** uma disciplina é criada
- **THEN** fica disponível para se associar a qualquer `StudyPath` via `CurriculumSubject`

### Requirement: Gestor associa disciplinas a percursos
O sistema SHALL permitir criar `CurriculumSubject`, ligando uma `Subject` a um
`StudyPath` com âmbito (tronco comum, secção, currículo interno), carga horária semanal,
coeficiente, e se é disciplina de exame.

#### Scenario: Mesma disciplina, dois percursos, coeficientes diferentes
- **WHEN** "Matemática" é associada ao percurso de Ciências com coeficiente 3 e ao de
  Letras com coeficiente 2
- **THEN** os dois `CurriculumSubject` existem de forma independente, cada um com o seu
  coeficiente

#### Scenario: Disciplina já associada ao mesmo percurso
- **WHEN** o gestor tenta associar a mesma `Subject` ao mesmo `StudyPath` uma segunda vez
- **THEN** o pedido é recusado com um erro **no campo**, não uma mensagem genérica

### Requirement: Gestor gere turmas
O sistema SHALL permitir criar e editar `ClassGroup` — nome, turno, capacidade — associada
ao ano lectivo activo.

#### Scenario: Turma sem ano lectivo activo
- **WHEN** não há nenhum `AcademicYear` com `isActive: true`
- **THEN** o sistema explica que é preciso um ano lectivo activo antes de criar turmas,
  em vez de um formulário que falha silenciosamente

### Requirement: Configuração é alcançável só por quem administra a escola
O sistema SHALL mostrar uma entrada "Configuração" na barra lateral do painel apenas a um
utilizador cuja sessão satisfaça `isSchoolAdministrator`, e SHALL recusar o acesso directo
a essa área a qualquer outro papel.

#### Scenario: Professor tenta aceder directamente
- **WHEN** um utilizador com papel `TEACHER` visita o URL de configuração directamente
- **THEN** o acesso é recusado, e a ligação nunca apareceu na navegação desse utilizador
