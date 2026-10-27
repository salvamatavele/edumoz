## ADDED Requirements

### Requirement: Registo de pagamento manual
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` registar
um `Payment` manual (numerário, depósito bancário ou transferência bancária) contra uma
`Invoice`, já em estado `CONFIRMED`.

#### Scenario: Pagamento manual actualiza a factura de imediato
- **WHEN** um gestor regista um pagamento manual de 1800,00 numa factura de 1800,00
- **THEN** o `Payment` é criado já `CONFIRMED`, e a factura passa a `PAID` com
  `paidAmount` 1800,00

### Requirement: Início de pagamento por dinheiro móvel
O sistema SHALL permitir iniciar um `Payment` por dinheiro móvel (m-Pesa, e-Mola, mKesh)
contra uma `Invoice`, gerando uma `idempotencyKey` própria ANTES de contactar o operador,
e gravando o `Payment` em estado `INITIATED` antes de qualquer resposta do operador.

#### Scenario: Falha de rede não deixa estado ambíguo
- **WHEN** o pedido ao operador falha ou nunca responde, depois do `Payment` já ter sido
  gravado em `INITIATED`
- **THEN** o sistema sabe que o pagamento foi tentado e para que factura, nunca fica sem
  registo nenhum da tentativa

#### Scenario: Resposta pendente não marca a factura como paga
- **WHEN** o operador responde que o pagamento está pendente (o aluno ainda não aprovou
  no telemóvel)
- **THEN** o `Payment` passa a `PENDING`, e a `Invoice` continua sem alterar
  `paidAmount`/`status`

### Requirement: Confirmação de pagamento por dinheiro móvel
O sistema SHALL, ao confirmar um `Payment` de dinheiro móvel (por consulta ao operador ou
por callback), transitar `INITIATED`/`PENDING` para `CONFIRMED` e, na mesma transacção,
recalcular `Invoice.paidAmount`/`status` pela soma de todos os `Payment`s `CONFIRMED`
dessa factura.

#### Scenario: Confirmação idempotente
- **WHEN** o mesmo callback de confirmação é recebido duas vezes para a mesma
  `idempotencyKey`
- **THEN** o sistema cria e confirma o pagamento uma só vez; o segundo callback não
  duplica nada nem soma o valor duas vezes

#### Scenario: paidAmount nunca diverge da soma real
- **WHEN** qualquer `Payment` de uma factura muda de estado
- **THEN** `Invoice.paidAmount` é recalculado como a soma exacta dos `Payment`s
  `CONFIRMED` dessa factura, nunca incrementado

### Requirement: Reversão de pagamento
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` reverter
um `Payment` `CONFIRMED`, com motivo obrigatório, transitando para `REVERSED` e
recalculando `Invoice.paidAmount`/`status`. O sistema SHALL NOT apagar um `Payment`
alguma vez.

#### Scenario: Reversão sem motivo é recusada
- **WHEN** um gestor tenta reverter um pagamento sem indicar o motivo
- **THEN** o sistema recusa e pede o motivo

#### Scenario: Reversão deixa rasto
- **WHEN** um pagamento é revertido
- **THEN** um `AuditLog` regista quem reverteu, quando, e o motivo

### Requirement: Recibo imprimível
O sistema SHALL permitir imprimir um recibo de um `Payment` `CONFIRMED`, com um código de
verificação.

#### Scenario: Recibo de pagamento revertido é assinalado
- **WHEN** um recibo é reimpresso depois de o pagamento ter sido revertido
- **THEN** o recibo mostra claramente o estado revertido, nunca aparentando um pagamento
  válido
