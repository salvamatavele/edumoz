## ADDED Requirements

### Requirement: Administração escolar de identidade global
O sistema SHALL gerir utilizadores, vínculos, estado e perfis no âmbito da membership da escola activa. Um gestor escolar MUST NOT alterar a identidade ou credenciais globais de uma conta partilhada com outra escola; o titular ou administrador de plataforma conserva a gestão global. A remoção escolar MUST preservar fichas e histórico e não eliminar a conta global.

#### Scenario: Suspender apenas a associação local
- **WHEN** um gestor de A suspende uma pessoa que também pertence a B
- **THEN** A é revogada no pedido seguinte e B não é desactivada.

#### Scenario: Reposição de conta partilhada
- **WHEN** um gestor escolar tenta repor a password global de uma conta que pertence também a outra escola
- **THEN** a operação não altera a credencial e apresenta o percurso pelo titular ou administrador de plataforma sem expor dados da outra escola.

### Requirement: Gestão de contas rastreável à origem
O sistema SHALL cobrir os fluxos M01-LOGIN a M01-DOCUMENTS do contrato em docs/specs/esagrada-m01.md, incluindo filtros, campos, estados, perfis múltiplos, excepções, perfil próprio, recuperação, QR, auditoria e impressos. A implementação SHALL ser incremental, com aceitação por item e aprovação do contrato antes de código novo.

#### Scenario: Primeira fatia de utilizadores
- **WHEN** um gestor autorizado consulta ou gere contas da escola activa
- **THEN** a lista paginada, filtros, criação/convite, ligações e suspensão respeitam os limites de escola e as permissões actuais.

#### Scenario: Dependência funcional ainda ausente
- **WHEN** uma secção de perfil ou painel depende de fichas, ponto ou planificação ainda não integrados
- **THEN** não apresenta dados inventados nem é marcada como paridade verificada.

### Requirement: Credenciais escolares sem segredos previsíveis
Activação e recuperação SHALL usar segredos aleatórios, expiração e uso único, com limitação persistente e resposta sem enumeração. O código público da pessoa MUST NOT ser uma password inicial. Troca ou reposição de password MUST revogar sessões anteriores; uma sessão com obrigação de substituição não pode executar mutações escolares.

#### Scenario: Segredo entregue pela secretaria
- **WHEN** é emitida uma credencial inicial
- **THEN** o segredo é aleatório, apresentado para entrega e não fica recuperável em logs, auditoria ou listagens; a pessoa tem de o substituir antes de escrever.

#### Scenario: Token repetido
- **WHEN** um token de activação ou recuperação expirado ou usado é reapresentado
- **THEN** é recusado sem alterar a conta.

### Requirement: QR privado por pessoa e escola
O sistema SHALL emitir, reimprimir quando autorizado e revogar QR escolares com propósito de identificação/login explícito, desligado por omissão para login. O segredo SHALL usar 32 bytes aleatórios, hash para pesquisa e cópia cifrada apenas para reimpressão autorizada. A entrada MUST verificar escola, conta, associação, obrigação de password e revogação e criar sessão por Auth.js.

#### Scenario: Cartão de identificação sem login
- **WHEN** um cartão identifica a pessoa mas a escola ou a credencial não permite login
- **THEN** não é criada sessão e a identificação de portaria não se transforma implicitamente em autenticação.

#### Scenario: Segredo exposto no endereço
- **WHEN** a pessoa abre o endereço QR
- **THEN** o segredo é recebido no fragmento, removido da barra antes de ser usado e nunca incluído em logs ou listagens.


### Requirement: Contactos novos sem enumeração de identidades globais
O sistema SHALL separar os contactos de comunicação não verificados dos identificadores de autenticação na criação escolar. Contactos coincidentes MUST NOT causar associação, herança de privilégios ou uma resposta dependente da existência de outra identidade. Novas contas SHALL receber um código próprio; os identificadores de login legados SHALL manter a compatibilidade.

#### Scenario: Contacto já utilizado noutra escola
- **WHEN** um gestor cria uma conta nova indicando um contacto também utilizado por uma identidade de B
- **THEN** recebe o mesmo resultado independente de criação, sem pesquisa/associação à identidade de B e sem revelar os seus dados.

### Requirement: Activação inicial limitada e reemissão idempotente
O sistema SHALL emitir um segredo inicial aleatório de 32 bytes, guardar apenas Argon2 e exigir substituição em 24 horas antes do acesso escolar. A entrega SHALL ocorrer uma vez; repetição do pedido MUST NOT recuperar o segredo. A reemissão SHALL limitar-se a conta activa, ainda inicial e exclusiva da escola, com auditoria e revogação de versão.

#### Scenario: Sessão inicial tenta uma mutação escolar
- **WHEN** a credencial inicial autentica o titular antes da substituição
- **THEN** o contexto não concede escola, papel ou permissão e as acções existentes recusam a operação; o painel apresenta a troca própria.

#### Scenario: Reemissão repetida ou conta partilhada
- **WHEN** o pedido de reemissão já foi concluído ou o alvo está activado/partilhado
- **THEN** não recupera nem altera o segredo anterior; a repetição confirma apenas conclusão e o alvo inelegível é recusado sem mudança global.

### Requirement: Contexto escolar de formulários
As acções de criação, reemissão inicial e estado SHALL comparar a escola esperada do formulário com a sessão efectiva antes da operação funcional. O valor enviado MUST NOT seleccionar o tenant nem conceder permissões.

#### Scenario: Escola alterada noutro separador
- **WHEN** um formulário aberto em A é submetido após mudar a sessão para B
- **THEN** a operação é recusada sem alterações e pede confirmar a escola antes de tentar novamente.

### Requirement: Edição escolar de identidade exclusiva
O sistema SHALL limitar edição escolar global a nome e contactos de comunicação de contas activas exclusivamente associadas à escola, com users/edit e autoridade persistida. Identificadores de entrada, credenciais, papéis e vínculos MUST permanecer intactos. Auditoria redigida SHALL integrar a transacção de gravação.

#### Scenario: Conta partilhada ou externa
- **WHEN** o editor tenta carregar ou alterar uma conta partilhada, externa ou protegida
- **THEN** recebe recusa sem dados de outras escolas nem alteração global.

#### Scenario: Edição concorrente
- **WHEN** outra gravação alterou a revisão carregada pelo formulário
- **THEN** o pedido antigo é recusado e solicita revisão dos dados actuais sem os sobrescrever.

### Requirement: Vínculo docente administrado na escola
O sistema SHALL permitir a users/edit verificar por código uma ficha docente local, mostrar nome/código e confirmar ligação, substituição ou desligação. Ligar SHALL exigir conta activa com papel TEACHER activo, ficha activa disponível, revisões actuais e escola esperada correspondente à sessão. Identidade global, papéis, histórico e relações de outras escolas MUST permanecer intactos, mesmo para conta partilhada. Troca e auditoria redigida SHALL integrar a mesma transacção.

#### Scenario: Conta docente partilhada
- **WHEN** o gestor substitui a ficha docente da conta na escola A
- **THEN** só a relação local muda e a identificação docente no pedido seguinte corresponde à nova ficha; escola B e credenciais permanecem intactas.

#### Scenario: Ficha ocupada ou externa
- **WHEN** uma prévia ou confirmação indica ficha de outra escola, inactiva, ocupada por outra conta ou alterada desde a prévia
- **THEN** a operação é recusada sem retirar a ligação anterior nem revelar dados externos.

#### Scenario: Ciclo após fotografia sem ligação
- **WHEN** um formulário mostra ausência de vínculo e entretanto ocorre ligação seguida de desligação
- **THEN** o formulário antigo é recusado pela revisão local, mesmo que a ligação actual volte a ser nula.

### Requirement: Ficha de funcionário e acumulação de funções
O sistema SHALL disponibilizar fichas Staff por escola, com código/nome/função, contactos e dados profissionais, consulta paginada e edição auditada com revisão. Código e conta associada SHALL ser únicos dentro da escola. Staff.schoolId e id SHALL ser imutáveis, e userId SHALL pertencer à escola. O nome da função MUST NOT conferir acesso.

#### Scenario: Conta docente também é funcionária
- **WHEN** o gestor autorizado verifica e confirma uma ficha de funcionário para uma conta com vínculo interno activo
- **THEN** a relação Staff local é criada/substituída sem alterar Teacher, identidade global, permissões ou relações de B; desligar preserva a ficha e o histórico.

#### Scenario: Pedido de criação repetido com dados diferentes
- **WHEN** um pedido de criação já concluído é repetido com outro conteúdo
- **THEN** não cria outra ficha nem confirma silenciosamente os novos dados; solicita consultar a ficha existente antes de editar.
