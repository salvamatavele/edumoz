## Why

O modelo de dados de finanças já existe — `FeeSchedule`, `FeeItem`, `Invoice`,
`InvoiceLine`, `Payment`, e a porta `MobileMoneyGateway` (m-Pesa, e-Mola, mKesh) — mas
nada mais foi construído: nenhuma Server Action, nenhuma leitura, nenhum ecrã. É o único
módulo do roteiro em que um erro custa dinheiro a uma família ou à tesouraria da escola,
por isso entra depois de o resto do domínio (matrícula, estrutura académica, avaliação,
horários) já estar assente e testado — não é o primeiro módulo a construir sob pressão de
correcção.

## What Changes

- **Tabelas de propinas** — o gestor define `FeeSchedule`s por ano lectivo (âmbito
  opcional por classe ou percurso) com as suas rubricas (`FeeItem`: matrícula, propina
  mensal, taxa de exame, etc.), cada uma com a sua recorrência.
- **Facturação em lote** — gerar `Invoice`s para todas as matrículas de uma tabela de
  propinas, para um período (mês/ano), sem duplicar quando já existir factura para o
  mesmo período.
- **Registo de pagamento manual** (numerário, depósito, transferência) e **pagamento por
  dinheiro móvel** (m-Pesa, e-Mola, mKesh) através da porta `MobileMoneyGateway` já
  definida — com um `SimulatedGateway` nesta fase, porque os adaptadores reais exigem
  credenciais dos operadores que a escola ainda não tem.
- **Máquina de estados do pagamento** (`INITIATED → PENDING → CONFIRMED`, com `FAILED`/
  `REVERSED`) e `idempotencyKey` única — o mesmo callback do operador recebido duas vezes
  nunca conta dinheiro duas vezes.
- **Conta-corrente por aluno** e **mapa de propinas em dívida** por turma/período.
- **Recibo imprimível**, mesmo padrão de impressão já usado em `/pautas` e `/horarios`.
- **Encarregado de educação vê o que deve e paga** dos seus educandos — nunca de outro
  aluno.

## Capabilities

### New Capabilities

- `fee-schedules`: gestor define tabelas de propinas e rubricas por ano lectivo.
- `invoicing`: geração de facturas em lote, conta-corrente por aluno, mapa de dívida.
- `payments`: registo de pagamento manual e por dinheiro móvel, máquina de estados,
  idempotência, reversão, recibo imprimível — a superfície de maior risco.
- `family-finance-portal`: encarregado/aluno consulta o que deve e paga, no `/portal`.

### Modified Capabilities

(nenhuma — nenhuma capability existente toca finanças.)

## Impact

- **Novo**: `src/features/finance/domain/{fee-schedule-schema,invoice-schema,payment-schema,payment-state}.ts`,
  `data/{fee-schedules,invoicing,payments}.ts`, `actions/{create-fee-schedule,create-fee-item,generate-invoices,record-manual-payment,initiate-mobile-money-payment,confirm-payment,reverse-payment}.ts`,
  `ui/*`, `data/gateways/simulated-gateway.ts` (implementação de teste da porta já
  existente).
- **Reutilizado, sem alterações**: `FeeSchedule`/`FeeItem`/`Invoice`/`InvoiceLine`/
  `Payment` (schema já existe, com os enums e índices necessários),
  `MobileMoneyGateway`/`PaymentRequest`/`PaymentInitiation`/`PaymentStatusResult`
  (`domain/ports/mobile-money-gateway.ts`, já definida e nunca implementada),
  `Money`/`toDecimal`/`sum`/`toStoredString` (`shared/domain/numeric.ts`).
- **Consumido por**: `/portal` (encarregado/aluno), que ganha uma secção de finanças ao
  lado das notas e do horário já lá construídos.
