# invoicing

## Purpose

Turning a `FeeSchedule` into `Invoice`s in bulk for every enrolment it covers, in a given
period, without duplicating an already-billed enrolment/period pair, and giving the
school a per-student running account and a by-class debt map built from those invoices
and their confirmed `Payment`s.

## Requirements

### Requirement: Geração de facturas em lote
O sistema SHALL permitir a um utilizador que satisfaça `isSchoolAdministrator` gerar
`Invoice`s para todas as matrículas abrangidas por uma `FeeSchedule`, para um período
(mês/ano), com uma `InvoiceLine` por `FeeItem` aplicável.

#### Scenario: Geração produz uma factura por matrícula
- **WHEN** um gestor gera facturas de uma tabela de propinas com dez matrículas
  abrangidas, para Março de 2026
- **THEN** o sistema cria dez `Invoice`s, uma por matrícula, cada uma com as suas
  `InvoiceLine`s

#### Scenario: Geração é idempotente por matrícula e período
- **WHEN** um gestor gera facturas do mesmo período da mesma tabela uma segunda vez
- **THEN** o sistema salta as matrículas que já têm factura para esse período, sem criar
  duplicados

#### Scenario: Soma de rubricas mensais é exacta
- **WHEN** doze `Invoice`s de uma propina mensal de 1800,00 são somadas
- **THEN** o total é exactamente 21 600,00, nunca um valor com erro de arredondamento

### Requirement: Conta-corrente por aluno
O sistema SHALL apresentar, por matrícula, o histórico de `Invoice`s e `Payment`s
confirmados, com o saldo em dívida.

#### Scenario: Saldo reflecte pagamentos confirmados
- **WHEN** uma matrícula tem facturas no total de 5000,00 e pagamentos confirmados no
  total de 3000,00
- **THEN** o saldo em dívida apresentado é exactamente 2000,00

### Requirement: Mapa de propinas em dívida
O sistema SHALL apresentar, por turma e por período, as matrículas com `Invoice`s em
estado `PENDING`, `PARTIAL` ou `OVERDUE`.

#### Scenario: Filtrar por turma e período
- **WHEN** um gestor consulta o mapa de dívida para uma turma e um período
- **THEN** vê apenas as matrículas dessa turma com facturas desse período por saldar
