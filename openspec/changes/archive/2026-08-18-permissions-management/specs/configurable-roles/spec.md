## ADDED Requirements

### Requirement: Catálogo fixo de recursos e acções
O sistema SHALL manter um catálogo fixo (semeado, não editável pela interface) de
`Permission`, cada uma um par `(resource, action)`, correspondente a uma verificação real
já existente no código. O catálogo SHALL cobrir pelo menos: `students`, `enrollments`,
`attendance`, `grades`, `term-closing`, `report-cards`, `academic-structure`,
`teaching-staff`, `assessment-schemes`, cada um com `view`/`create`/`edit`/`delete`.

#### Scenario: Catálogo não é editável pela interface
- **WHEN** um gestor abre a gestão de papéis
- **THEN** vê a lista de recursos e acções para marcar por papel, mas não consegue
  adicionar um recurso ou acção nova

### Requirement: Gestor cria papéis configuráveis por escola
O sistema SHALL permitir a quem tem acesso total (`isSchoolAdministrator` sem
`PermissionRole` restrito, ou superadmin) criar um `PermissionRole` — nome, descrição,
e as permissões marcadas — âmbito da própria escola.

#### Scenario: Criar o papel "Director-adjunto"
- **WHEN** um gestor cria um papel "Director-adjunto" e marca `view`+`edit` em
  `students`, `attendance`, `grades`, mas não `delete` em nenhum
- **THEN** o papel fica disponível para atribuir a um membro do pessoal desta escola,
  com exactamente essas permissões

#### Scenario: Papel novo começa sem nenhuma permissão marcada
- **WHEN** um gestor cria um papel novo
- **THEN** nenhuma permissão vem pré-marcada — o gestor tem de escolher cada uma
  explicitamente

### Requirement: Gestor atribui um papel configurável a um membro do pessoal
O sistema SHALL permitir atribuir um `PermissionRole` (da mesma escola) a uma
`Membership` com `role: SCHOOL_MANAGER`.

#### Scenario: Atribuir "Director-adjunto" a um membro
- **WHEN** um gestor atribui o papel "Director-adjunto" a uma `Membership` de gestor
- **THEN** esse utilizador passa a estar limitado às permissões desse papel, a partir do
  próximo pedido

#### Scenario: Sem papel atribuído mantém acesso total
- **WHEN** uma `Membership` de `SCHOOL_MANAGER` não tem nenhum `PermissionRole`
  atribuído
- **THEN** continua com acesso total, tal como acontecia antes deste sistema existir

### Requirement: `hasPermission` resolve a permissão efectiva
O sistema SHALL expor uma função `hasPermission(context, resource, action)` que:
superadmin → sempre verdadeiro; não-gestor → sempre falso; gestor sem papel atribuído →
sempre verdadeiro; gestor com papel atribuído → verdadeiro apenas se o papel tiver essa
permissão marcada.

#### Scenario: Gestor com papel restrito tenta uma acção sem permissão
- **WHEN** um gestor com o papel "Director-adjunto" (sem `delete` em `students`) tenta
  apagar um aluno
- **THEN** `hasPermission(context, "students", "delete")` devolve falso
