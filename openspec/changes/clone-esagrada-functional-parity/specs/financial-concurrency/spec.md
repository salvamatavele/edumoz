## ADDED Requirements

### Requirement: Emissão concorrente preserva unicidade de intenção e referência
O sistema SHALL guardar uma chave única de geração por escola, matrícula, tabela e período, e alocar referências por contador atómico da escola. O backfill MUST recusar histórico duplicado ou ambíguo sem o reescrever. Números consumidos não podem ser reutilizados depois de falha.

#### Scenario: Duas gerações simultâneas
- **WHEN** dois pedidos geram a mesma cobrança
- **THEN** uma factura é criada e o outro pedido identifica a cobrança já emitida, sem duplicação.

### Requirement: Pagamentos têm intenção estável e transição serializada
Criação de pagamentos SHALL exigir chave de intenção estável, isolada por escola, e confirmar igualdade dos parâmetros ao repetir. Todas as transições e recálculos de saldo MUST serializar pela factura e reler estado persistido; chamadas ao operador ficam fora da transacção.

#### Scenario: Repetição com os mesmos parâmetros
- **WHEN** a mesma chave é submetida novamente com os mesmos parâmetros
- **THEN** o pagamento e a auditoria não são duplicados.

#### Scenario: Chave reutilizada para outro pagamento
- **WHEN** a mesma chave identifica outros parâmetros financeiros
- **THEN** o pedido é recusado sem novo pagamento.

#### Scenario: Resposta do operador depois de reversão
- **WHEN** uma confirmação iniciada anteriormente chega depois de uma reversão válida
- **THEN** o pagamento permanece REVERSED e o saldo exclui-o.

#### Scenario: Pagamentos distintos em simultâneo
- **WHEN** dois pagamentos da mesma factura confirmam ao mesmo tempo
- **THEN** o saldo corresponde à soma dos CONFIRMED, sem perda de actualização.
