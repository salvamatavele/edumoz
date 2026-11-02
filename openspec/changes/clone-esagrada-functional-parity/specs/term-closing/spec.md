## MODIFIED Requirements

### Requirement: Só quem administra a escola fecha um trimestre
O sistema SHALL restringir fecho e reabertura a uma sessão validada com term-closing/edit na escola activa, preservando acesso total de gestores sem papel restrito e de administradores de plataforma actuais. A reabertura MUST exigir motivo e auditoria com snapshot dos resultados anteriores.

#### Scenario: Professor tenta fechar o trimestre
- **WHEN** um professor sem permissão administrativa chama o fecho
- **THEN** o pedido é recusado.

#### Scenario: Reabertura autorizada
- **WHEN** um gestor autorizado reabre um trimestre fechado com motivo válido
- **THEN** o trimestre passa a OPEN e autoria, motivo e resultados anteriores ficam preservados na mesma transacção.

#### Scenario: Reabertura sem motivo ou permissão
- **WHEN** falta motivo válido ou term-closing/edit
- **THEN** estado e resultados permanecem inalterados.

## ADDED Requirements

### Requirement: Fecho usa uma fotografia transaccional após serializar o trimestre
O fecho SHALL obter o bloqueio do trimestre antes de ler notas, plano e esquemas; todo o cálculo e gravação MUST ocorrer na mesma transacção. Refecho depois de reabertura preserva a auditoria dos resultados anteriores.

#### Scenario: Dois fechos simultâneos
- **WHEN** dois pedidos tentam fechar o mesmo trimestre aberto
- **THEN** só um confirma o fecho e o segundo recebe já fechado, sem nova materialização ou auditoria duplicada.
