## ADDED Requirements

### Requirement: Ambiente local sem Docker
Desenvolvimento, build, migrações e testes SHALL correr no host com MariaDB local, sem depender de Docker. As bases de desenvolvimento e testes MUST ser distintas e nunca apontar para a instalação da origem.

#### Scenario: Arranque reproduzível
- **WHEN** se seguem as instruções locais num ambiente configurado
- **THEN** o EduMoz responde localmente e identifica claramente bases/portas sem expor segredos.

#### Scenario: Destino de teste inseguro
- **WHEN** o runner detecta a base da origem ou a base de desenvolvimento como alvo de integração
- **THEN** aborta antes de criar, alterar ou apagar registos.

### Requirement: Aceitação sequencial por módulo
Cada módulo SHALL completar spec aprovada, implementação, testes até verde, navegador, idiomas, isolamento e impressos aplicáveis antes de iniciar o seguinte. Falhas existentes MUST ser distinguidas das regressões sem serem ocultadas.

#### Scenario: Teste falhado
- **WHEN** uma verificação da entrega corrente falha
- **THEN** a entrega permanece pendente e é corrigida e novamente validada antes de avançar.

### Requirement: Validação real no navegador
Cada módulo SHALL ser exercitado no navegador local com os papéis aplicáveis, pt/en, escolas A/B, viewport móvel e desktop, incluindo sucesso, erro e acesso directo proibido. A evidência MUST registar rota, conta sintética/papel, escola, idioma, resultado e problemas de consola/rede.

#### Scenario: Percurso completo
- **WHEN** um módulo é apresentado como concluído
- **THEN** existe evidência de criar/consultar/editar e aprovar/anular quando aplicáveis, persistência após recarregar, validações e recusas no navegador, além dos testes automáticos.

### Requirement: Registo honesto de cobertura e anomalias
A matriz SHALL distinguir implementado, verificado e bloqueado. Descobertas MUST ser comunicadas com evidência, severidade, correcção planeada e teste de regressão; nenhuma integração ou impressão pode ser declarada testada apenas por ter código.

#### Scenario: Dependência externa bloqueada
- **WHEN** não há hardware ou credenciais sandbox para um caso
- **THEN** o caso fica bloqueado com a dependência registada e impede declarar paridade integral desse item.
