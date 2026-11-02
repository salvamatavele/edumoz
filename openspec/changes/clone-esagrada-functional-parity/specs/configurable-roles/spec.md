## ADDED Requirements

### Requirement: Permissões efectivas protegem os pontos de entrada existentes
O sistema SHALL verificar as permissões actuais de leitura e escrita nas páginas e Server Actions de gestão existentes, além da pertença à escola. A reconstrução do contexto MUST conservar o papel configurável e as permissões; a posse docente/familiar continua obrigatória onde aplicável.

#### Scenario: Gestor com leitura envia criação directa
- **WHEN** um gestor cujo papel concede apenas `students/view` chama directamente a criação de aluno
- **THEN** a operação é recusada antes de qualquer escrita e a consulta de alunos permanece permitida.

#### Scenario: Papel de outra escola
- **WHEN** uma membership aponta para um papel pertencente a outra escola
- **THEN** esse papel não concede qualquer permissão e a inconsistência não é interpretada como acesso total.

### Requirement: Revogação e restrições são lidas no pedido actual
O sistema SHALL validar conta, membership e escola activas e carregar as permissões persistidas em cada pedido autenticado. Alterações MUST produzir efeito no pedido seguinte, mesmo com o JWT anterior.

#### Scenario: Suspensão com JWT ainda válido
- **WHEN** a membership é suspensa entre dois pedidos com o mesmo JWT
- **THEN** o segundo pedido não recebe contexto autorizado da escola.

#### Scenario: Alteração das permissões
- **WHEN** uma permissão é retirada ao papel configurável entre dois pedidos
- **THEN** a operação correspondente é recusada no segundo pedido sem exigir novo login.

## MODIFIED Requirements

### Requirement: Catálogo fixo de recursos e acções
O sistema SHALL manter um catálogo fixo (semeado, não editável pela interface) de
`Permission`, cada uma um par `(resource, action)`, correspondente a uma verificação real
já existente no código. O catálogo SHALL cobrir pelo menos: `students`, `enrollments`,
`attendance`, `grades`, `term-closing`, `report-cards`, `academic-structure`,
`teaching-staff`, `assessment-schemes`, `finance`, `scheduling`, cada um com `view`/`create`/`edit`/`delete`.
Novos recursos MUST NOT ser concedidos automaticamente a papéis restritos.

#### Scenario: Catálogo não é editável pela interface
- **WHEN** um gestor abre a gestão de papéis
- **THEN** vê a lista de recursos e acções para marcar por papel, mas não consegue adicionar um recurso ou acção nova.

#### Scenario: Papel anterior ao novo recurso
- **WHEN** um papel restrito anterior passa a coexistir com `finance` e `scheduling`
- **THEN** não obtém permissões nesses recursos até uma atribuição explícita.

### Requirement: Gestor atribui um papel configurável a um membro do pessoal
O sistema SHALL permitir atribuir um ou mais PermissionRole da mesma escola a uma membership de pessoal, preservando o significado das restrições existentes. A migração de permissionRoleId MUST ser idempotente e não conceder recursos novos automaticamente. Excepções por membership SHALL substituir a união dos papéis, incluindo uma negação explícita; remover uma excepção repõe a herança.

#### Scenario: Dois perfis com excepção de negação
- **WHEN** dois perfis concedem acesso mas uma excepção escolar da pessoa o nega
- **THEN** o pedido seguinte recusa o acesso e as ligações correspondentes deixam de aparecer.

#### Scenario: Papel anterior migrado
- **WHEN** uma membership restrita é migrada para a atribuição de múltiplos perfis
- **THEN** conserva exactamente as suas permissões anteriores sem elevar para acesso total.

### Requirement: `hasPermission` resolve a permissão efectiva
O sistema SHALL resolver autorização a partir do contexto actual: administrador de plataforma mantém o bypass existente; gestor legado sem restrição mantém compatibilidade; nos restantes casos só concessões efectivas da escola autorizam. A negação individual SHALL substituir concessões herdadas. Permissão MUST NOT substituir posse docente/familiar nem pertencer a outra escola.

#### Scenario: Docente com concessão administrativa explícita
- **WHEN** um docente recebe um perfil escolar com leitura de um recurso administrativo
- **THEN** pode consultar esse recurso sem se tornar administrador da plataforma e sem adquirir posse dos recursos de outros docentes.

#### Scenario: Permissão de outra escola
- **WHEN** uma atribuição ou excepção corresponde a outra escola
- **THEN** não participa na autorização da escola activa.

### Requirement: Permissões de pessoal sem concessões implícitas
O catálogo SHALL incluir school-staff/view, create e edit, associados a guards reais das fichas profissionais. A migração MUST NOT conceder estes recursos a papéis restritos existentes. A função profissional da ficha MUST NOT alterar Role ou permissões. Não é disponibilizada eliminação destrutiva; inactivação usa edit.

#### Scenario: Papel anterior à gestão de pessoal
- **WHEN** um gestor restrito anterior consulta o novo módulo sem concessão school-staff/view
- **THEN** a navegação e a página recusam a consulta e as acções não criam nem alteram fichas.
