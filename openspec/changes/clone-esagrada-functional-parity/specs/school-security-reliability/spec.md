## ADDED Requirements

### Requirement: Autorização efectiva e revogação
O servidor SHALL validar utilizador, sessão, membership activa, permissão actual e posse em leituras, actions, APIs, exportações e ficheiros, negando por omissão. Privilégios revogados MUST deixar de conceder acesso no pedido seguinte.

#### Scenario: Gestor restrito
- **WHEN** um gestor com leitura sem escrita chama directamente uma action de alteração
- **THEN** a operação é recusada e os dados permanecem iguais.

#### Scenario: Revogação com sessão existente
- **WHEN** uma membership é suspensa enquanto o utilizador mantém sessão
- **THEN** o pedido protegido seguinte é recusado.

### Requirement: Integridade multi-escolas e de ano lectivo
Toda a referência persistida SHALL pertencer à escola e âmbito anual válidos. O sistema MUST proteger relações aninhadas, junções, updates, upserts, cache, storage, jobs, dispositivos e callbacks contra contaminação entre tenants.

#### Scenario: Referência forjada
- **WHEN** uma matrícula de A é submetida com aluno, turma ou percurso de B ou ano incompatível
- **THEN** a transacção é recusada sem gravar matrícula ou auditoria de sucesso.

#### Scenario: Cache entre escolas
- **WHEN** o mesmo utilizador muda de A para B após consultar uma ficha em A
- **THEN** nenhum resultado privado de A é reutilizado em B.

### Requirement: Resultados académicos consistentes
Notas SHALL respeitar maxScore e escala no servidor. Trimestres/anos fechados MUST impedir mutações salvo desbloqueio autorizado com motivo e auditoria, preservando versões e resultados históricos.

#### Scenario: Nota fora de escala
- **WHEN** o docente envia uma nota superior ao máximo por pedido directo
- **THEN** é devolvido erro de validação sem gravação.

#### Scenario: Alteração após fecho
- **WHEN** um docente tenta alterar nota num trimestre fechado
- **THEN** a alteração é recusada; reabertura permitida exige autoria, motivo e rasto.

#### Scenario: Fecho concorrente
- **WHEN** um lançamento coincide com o fecho
- **THEN** o resultado final corresponde a uma ordem consistente: nota incluída antes do fecho ou alteração recusada depois dele.

### Requirement: Consistência financeira e idempotência
Valores SHALL usar Decimal. Facturação, alocações, créditos, confirmações e reversões MUST garantir unicidade de intenção, transições atómicas e saldo consistente sob concorrência. Chamadas externas não podem manter transacções de base abertas.

#### Scenario: Facturação simultânea
- **WHEN** duas execuções geram as mesmas cobranças do mesmo período
- **THEN** existe uma cobrança por chave de negócio, referências únicas e resultado recuperável sem duplicação.

#### Scenario: Pagamentos simultâneos
- **WHEN** dois pagamentos são confirmados ao mesmo tempo na mesma conta
- **THEN** o saldo persistido corresponde exactamente às alocações confirmadas e cada intenção é contada uma vez.

#### Scenario: Confirmação versus reversão
- **WHEN** callbacks e reversões disputam o mesmo pagamento
- **THEN** a transição persistida respeita a máquina de estados e uma confirmação antiga não ressuscita um pagamento revertido.

### Requirement: Integrações autenticadas e recuperáveis
Operadores e avisos SHALL usar configuração isolada por escola, timeouts limitados, idempotência e reconciliação. Webhooks MUST validar assinatura, valor, moeda e referência; erros transitórios devem permitir reentrega e eventos persistidos devem ser deduplicados.

#### Scenario: Webhook repetido
- **WHEN** um operador envia duas vezes o mesmo evento válido
- **THEN** o efeito financeiro e os avisos ocorrem uma vez.

#### Scenario: Falha transitória
- **WHEN** o armazenamento falha antes de persistir um callback válido
- **THEN** o evento não é reconhecido como definitivamente processado e a reentrega pode concluir a operação.

#### Scenario: Credenciais ausentes
- **WHEN** a escola não tem configuração de operador
- **THEN** o fluxo apresenta indisponibilidade explícita; um simulador não é apresentado como pagamento real.

### Requirement: Contas e credenciais seguras
Activação e recuperação SHALL usar segredos aleatórios de uso único e expiração, limitação de tentativas e respostas sem enumeração. Códigos públicos MUST NOT ser palavras-passe predefinidas; QR e dispositivos exigem âmbito e revogação adequados.

#### Scenario: Reutilização do token
- **WHEN** um token de activação já utilizado ou expirado é enviado novamente
- **THEN** o acesso é recusado e não altera a conta.

### Requirement: Ficheiros e dados privados
Uploads SHALL validar tamanho, tipo e assinatura, impedir traversal e conteúdo activo perigoso e permanecer em armazenamento privado segregado. Downloads MUST validar permissão e escola; logs e auditoria não podem expor segredos.

#### Scenario: Download directo
- **WHEN** um utilizador de B conhece a URL de um documento privado de A
- **THEN** o documento não é entregue.

#### Scenario: Upload hostil
- **WHEN** é enviado ficheiro com tipo disfarçado ou caminho manipulável
- **THEN** a aplicação recusa sem gravar conteúdo executável ou fora da raiz permitida.

### Requirement: Desempenho verificável e recuperação
A aplicação SHALL cumprir as metas do design em dataset sintético e build local de produção, com paginação e jobs recuperáveis para tarefas grandes. Backup e restore MUST ser ensaiados com base e storage antes de migrações relevantes.

#### Scenario: Carga de referência
- **WHEN** 10 sessões exercitam listas paginadas e mutações comuns no dataset de referência após aquecimento
- **THEN** p95 de leituras <= 1 s e mutações <= 2 s, com máquina e medições registadas; desvios exigem resolução ou revisão explícita das metas.

#### Scenario: Restauro
- **WHEN** é restaurado um backup sintético da base e anexos numa instância local separada
- **THEN** contagens, relações, amostras de documentos e saldos reconciliam e o procedimento fica registado.
