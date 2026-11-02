## MODIFIED Requirements

### Requirement: Aluno vê as suas próprias facturas e pagamentos
O sistema SHALL permitir a um aluno consultar as suas próprias Invoice e Payment apenas quando a escola concede a permissão de finanças próprias, nunca de outro aluno. Escolas novas SHALL começar com consulta financeira para encarregados e sem concessão ao aluno, seguindo a configuração actual da origem. Concessões existentes MUST ser preservadas explicitamente e removidas apenas por decisão escolar auditada.

#### Scenario: Aluno com concessão vê o saldo em dívida
- **WHEN** um aluno com permissão escolar de finanças próprias consulta a secção financeira do portal
- **THEN** vê apenas o saldo e histórico das suas facturas.

#### Scenario: Escola sem concessão ao aluno
- **WHEN** a escola não concede finanças próprias ao aluno
- **THEN** o separador e o pedido directo não devolvem dados financeiros; o encarregado com relação válida e permissão mantém a consulta.

#### Scenario: Migração da configuração anterior
- **WHEN** uma escola existente é migrada para a permissão explícita
- **THEN** a consulta anteriormente permitida ao aluno é registada como concessão de compatibilidade e não desaparece sem decisão escolar auditada.
