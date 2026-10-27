## Context

O schema já existe por inteiro — `FeeSchedule`, `FeeItem`, `Invoice`, `InvoiceLine`,
`Payment`, com os enums `FeeRecurrence`, `InvoiceStatus`, `PaymentMethod`,
`PaymentProvider`, `PaymentStatus` — e já está em `TENANT_SCOPED_MODELS` (excepto
`InvoiceLine`, que herda o âmbito de `Invoice`, mesma razão que `AssessmentComponent` não
está lá sozinho). A porta `MobileMoneyGateway`
(`src/features/finance/domain/ports/mobile-money-gateway.ts`) também já existe, com
`PaymentRequest`/`PaymentInitiation`/`PaymentStatusResult`. Nada mais foi construído —
nenhuma Server Action, nenhuma leitura, nenhum ecrã, nenhuma implementação da porta.

`Payment.idempotencyKey` já é `@unique` no schema, e `Payment.initiatedById` é uma string
solta sem `@relation` — mesmo padrão de `AuditLog.actorUserId`, não um esquecimento.

Este é o módulo de maior risco do roteiro: um erro aqui envolve dinheiro real de uma
família ou da tesouraria da escola, não uma média mal arredondada. Nenhuma migração de
schema é precisa nesta change — é só a primeira interface a escrever nestas tabelas.

## Goals / Non-Goals

**Goals:**
- Gestor define tabelas de propinas e gera facturas em lote, sem duplicar.
- Registar pagamento manual ou por dinheiro móvel, com uma máquina de estados que só
  marca uma factura paga quando o dinheiro está mesmo confirmado.
- O mesmo callback do operador recebido duas vezes nunca conta o pagamento duas vezes.
- Reverter um pagamento exige gestor, motivo, e deixa rasto — nunca apagar.
- Encarregado de educação vê o que deve e paga, nunca de outro aluno.

**Non-Goals** (ver também docs/specs/finance.md §5):
- Adaptadores reais dos operadores (m-Pesa/e-Mola/mKesh) — exigem credenciais que a
  escola ainda não tem. Esta fase entrega um `SimulatedGateway` atrás da mesma porta, com
  os quatro comportamentos que o desenho já previa: sucesso, falha, timeout,
  pendente-depois-confirmado.
- Conciliação bancária, planos de pagamento, perdão de dívida, emissão fiscal.
- Recalcular `Invoice.total`/`FeeItem.amount` depois de gerada — um desconto ou correcção
  é uma operação à parte, fora desta fase.

## Decisions

**Quatro capabilities, por fase do dinheiro, não uma só.** `fee-schedules` (configuração,
gestor), `invoicing` (facturação em lote + relatórios, gestor/tesouraria), `payments`
(registo, confirmação, reversão — a superfície de maior risco), `family-finance-portal`
(consulta, encarregado/aluno). Mesma lógica de `assessment-grading`/`scheduling-module`:
autorizações diferentes, ritmos de mudança diferentes, e a separação torna o código de
maior risco (`payments`) mais fácil de rever isolado do resto.

**`idempotencyKey` é gerada pelo EduMoz, nunca recebida do operador.** Um `cuid()` novo
por cada `initiate`, gravado no `Payment` ANTES de contactar a porta —
`db.payment.create({ data: { idempotencyKey, status: "INITIATED", ... } })` primeiro,
`gateway.initiate(request)` depois. Se o pedido ao operador falhar ou nunca voltar, o
`Payment` já existe em `INITIATED`, nunca em limbo entre "talvez enviado, talvez não". O
`@unique` no schema é a rede de segurança, não o mecanismo principal — a disciplina é
gravar antes de chamar, sempre.

**Máquina de estados como função pura testável**, mesmo padrão de
`resolveApplicableScheme`/`conflictsForPlacement`: `canTransition(from: PaymentStatus, to:
PaymentStatus): boolean` em `domain/payment-state.ts`, chamada tanto pela confirmação
(`INITIATED`/`PENDING` → `CONFIRMED`, ou → `FAILED`) como pela reversão (`CONFIRMED` →
`REVERSED`, a única transição que sai de `CONFIRMED`). Qualquer outra combinação é
recusada pela Server Action antes de tocar na base de dados.

**`Invoice.paidAmount`/`status` recalculam-se sempre por agregação, nunca por
incremento.** Depois de qualquer mudança de estado de um `Payment` (confirmar ou
reverter), a mesma transacção soma `sum(payments confirmados desta factura)`
(`shared/domain/numeric.ts`) e grava o total — nunca `paidAmount += amount`. Um
incremento que corra duas vezes por engano diverge para sempre; uma soma recalculada
converge sempre para o valor certo, mesmo se chamada em duplicado. `status` deriva de
`paidAmount` vs `total` vs `dueDate` por uma função pura,
`deriveInvoiceStatus(total, paidAmount, dueDate, now, cancelledAt)` — `PAID` quando
`paidAmount >= total`, `PARTIAL` quando `0 < paidAmount < total`, `OVERDUE` quando
`dueDate` já passou e ainda não está paga, `PENDING` caso contrário, `CANCELLED` só por
acção explícita.

**Geração de facturas é idempotente por `(enrollmentId, feeScheduleId, período)`** — a
acção em lote salta uma matrícula que já tenha factura para aquele mês/ano daquela tabela
de propinas, em vez de recusar o lote inteiro ou duplicar. Corre a acção duas vezes por
engano e o resultado é o mesmo que correr uma vez. `Invoice.reference` segue o mesmo
padrão de `suggestEnrollmentNumber` (`enrollment-number.ts`) — sugestão pura,
`{ano}{mês}-{sequência}`, com `@@unique([schoolId, reference])` como rede de segurança,
não o mecanismo principal.

**`SimulatedGateway` implementa `MobileMoneyGateway` com quatro caminhos determinísticos**,
escolhidos pelo `payerPhone` pedido (últimos dígitos reservados para teste, documentado no
próprio ficheiro) — sucesso imediato, falha imediata, `PENDING` que nunca resolve
(simula timeout), e `PENDING` que uma segunda chamada a `getStatus` resolve para
`CONFIRMED`. É o quarto que importa: é o único caminho real (nenhum operador confirma de
forma síncrona) e o único que exercita `confirm-payment.ts` a partir de um estado
`PENDING` já gravado.

**Reverter exige `isSchoolAdministrator`, motivo obrigatório, e nunca apaga.** Grava
`Payment.status = REVERSED`, `reversedAt`, e o motivo no próprio `AuditLog.before`/
`after` — mesma disciplina de auditoria do resto do projecto. Registar um pagamento
manual não exige motivo (é a operação do dia-a-dia da secretaria), mas continua a exigir
`isSchoolAdministrator` — lançar notas é acto de sala de aula, lançar dinheiro é acto de
gestão, nunca do professor.

**Portal da família segue exactamente `getPortalGrades`/`getPortalSchedule`** — mesma
selecção de educando por `?aluno=`, mesma regra de nunca mostrar outro aluno sem
`StudentGuardian` a ligar.

## Risks / Trade-offs

**[Risk] Callback do operador duplicado conta o pagamento duas vezes.** Mitigado por
`idempotencyKey` única gravada antes do pedido (ver Decisões) — um segundo callback para
a mesma chave encontra o `Payment` já `CONFIRMED` e não faz nada, não cria um segundo.

**[Risk] Factura marcada paga antes de o dinheiro existir de facto.** Mitigado por só
`CONFIRMED` (nunca `INITIATED`/`PENDING`) alterar `paidAmount`/`status` — os operadores de
dinheiro móvel nunca confirmam de forma síncrona, o aluno ainda aprova no telemóvel depois
do `initiate` devolver.

**[Risk] `paidAmount` diverge do soma real dos pagamentos.** Mitigado por recalcular
sempre por agregação (nunca incremento) na mesma transacção que muda o estado de um
`Payment`; um teste de reconciliação corre sobre dados semeados e confirma que
`paidAmount` é sempre igual à soma dos `Payment`s `CONFIRMED` dessa factura.

**[Trade-off] `SimulatedGateway` em vez de adaptadores reais.** Aceite (ver Non-Goals) —
os adaptadores reais entram atrás da mesma porta hexagonal quando houver credenciais,
sem tocar no domínio nem nas Server Actions que já usam a porta.

## Migration Plan

Sem migração de schema — tudo já existe. Passos de construção:

1. `fee-schedules`: CRUD de `FeeSchedule`/`FeeItem`, mesmo molde de
   `academic-configuration`.
2. `invoicing`: geração em lote (idempotente por período), conta-corrente por aluno, mapa
   de propinas em dívida.
3. `payments`: `domain/payment-state.ts` (máquina de estados pura, testada primeiro,
   sem nenhum chamador ainda), `SimulatedGateway`, registo manual, iniciar/confirmar
   dinheiro móvel, reversão, recibo imprimível.
4. `family-finance-portal`: consulta do encarregado/aluno, no `/portal` já existente.
