## ADDED Requirements

### Requirement: Encarregado de educação vê o que deve e paga
O sistema SHALL permitir a um encarregado de educação consultar as `Invoice`s e
`Payment`s dos seus educandos, no `/portal`, nunca de outro aluno.

#### Scenario: Encarregado com vários educandos escolhe qual ver
- **WHEN** um encarregado de educação tem mais do que um educando
- **THEN** o sistema deixa escolher qual consultar, mesmo padrão de "as minhas notas" e
  "o meu horário"

#### Scenario: Encarregado sem relação não vê nada
- **WHEN** um utilizador sem `StudentGuardian` a ligá-lo a nenhum aluno consulta a secção
  de finanças
- **THEN** o sistema não mostra nenhuma factura nem pagamento

### Requirement: Aluno vê as suas próprias facturas e pagamentos
O sistema SHALL permitir a um aluno consultar as suas próprias `Invoice`s e `Payment`s,
nunca de outro aluno.

#### Scenario: Aluno vê o saldo em dívida
- **WHEN** um aluno consulta a secção de finanças do `/portal`
- **THEN** vê o saldo em dívida e o histórico de pagamentos das suas próprias facturas
