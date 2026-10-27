Pensado para ser aplicado por etapas — nenhuma migração de schema é precisa (tudo já
existe). A ordem segue o dinheiro: tabelas de propinas → facturação → pagamentos
(a superfície de maior risco, por isso construída com a máquina de estados testada
primeiro, sem nenhum chamador ainda) → portal da família.

## 1. Tabelas de propinas

- [x] 1.1 `src/features/finance/domain/fee-schedule-schema.ts` — Zod para
      `createFeeScheduleSchema` (nome, `gradeLevelId`/`studyPathId` opcionais, mesma
      convenção "none" de `createStudyPathSchema`) e `createFeeItemSchema` (código, nome,
      valor, `FeeRecurrence`, dia de vencimento opcional, `isMandatory`).
- [x] 1.2 `src/features/finance/actions/create-fee-schedule.ts`,
      `create-fee-item.ts` — só `isSchoolAdministrator`; `AuditLog`. O valor grava-se
      directamente do número já validado pelo Zod (`data.amount`) — mesmo padrão de
      `create-assessment-scheme.ts`, onde `toDecimal`/`toStoredString` só entram quando o
      código de domínio precisa de FAZER ARITMÉTICA (comparar, somar), não para simples
      persistência; o Prisma aceita `number`/`string` directamente numa coluna `Decimal`.
- [x] 1.3 `src/features/finance/data/fee-schedules.ts` — `listFeeSchedules`,
      `listFeeItems`, `listFeeScheduleOptions` (classes/percursos do ano activo, mesmo
      padrão de `listAcademicStructureOptions`).
- [x] 1.4 UI — nova página `/financas` (gestor), separadores "Tabelas de propinas" e
      "Rubricas" (`FinancePanel`), mesmo molde de `EntitySection`/`FormModal`.
- [x] 1.5 `src/i18n/routing.ts` — pathname `/financas` (pt) / `/finance` (en); nav do
      gestor em `layout.tsx`/`dashboard-shell.tsx` (ícone `Wallet` novo).
- [x] 1.6 `messages/{pt,en}.json`, testes das duas Server Actions (autorização, escrita,
      valores exactos, `AuditLog`) + teste de fumo do `FinancePanel`.

## 2. Facturação em lote

- [x] 2.1 `src/features/finance/domain/invoice-schema.ts` — Zod para
      `generateInvoicesSchema` (`feeScheduleId`, `periodYear`, `periodMonth` opcional
      para rubricas não mensais).
- [x] 2.2 `src/features/finance/domain/invoice-reference.ts` —
      `suggestInvoiceReference(year, month, sequence)`, pura, mesmo padrão de
      `suggestEnrollmentNumber` (`academic/domain/enrollment-number.ts`); unicidade
      real fica com `@@unique([schoolId, reference])`.
- [x] 2.3 `src/features/finance/actions/generate-invoices.ts` — só
      `isSchoolAdministrator`; para cada matrícula abrangida pela `FeeSchedule`
      (por `gradeLevelId`/`studyPathId`, ou toda a escola se nenhum), salta quem já tem
      `Invoice` para aquele `(enrollmentId, feeScheduleId, período)` — idempotente,
      correr duas vezes não duplica; cria `Invoice` + uma `InvoiceLine` por `FeeItem`
      aplicável ao período, numa transacção, com `AuditLog` por factura. Soma exacta via
      `sum()` (decimal.js) — nunca `Number(item.amount)`, que reintroduzia vírgula
      flutuante no dinheiro.
- [x] 2.4 `src/features/finance/data/invoicing.ts` — `getStudentAccount` (conta-corrente:
      facturas + pagamentos confirmados + saldo, por matrícula), `getDebtReport` (mapa de
      dívida por turma/período, `status` em `PENDING`/`PARTIAL`/`OVERDUE`).
- [x] 2.5 UI — separador "Facturação" em `/financas` (gerar em lote) e página de
      conta-corrente por aluno; mapa de dívida com filtro por turma e período.
- [x] 2.6 Testes: geração produz uma factura por matrícula; segunda geração do mesmo
      período não duplica; soma de doze rubricas mensais de 1800,00 é exactamente
      21600,00; conta-corrente e mapa de dívida contra a base real.

## 3. Pagamentos

- [x] 3.1 `src/features/finance/domain/payment-state.ts` — `canTransition(from:
      PaymentStatus, to: PaymentStatus): boolean`, pura; só
      `INITIATED`/`PENDING` → `CONFIRMED`, `INITIATED`/`PENDING` → `FAILED`,
      `CONFIRMED` → `REVERSED` são válidas. Testada primeiro, sem nenhum chamador ainda.
      Inclui também `INITIATED` → `PENDING` (o operador aceitou mas ainda não confirmou).
- [x] 3.2 `src/features/finance/domain/invoice-status.ts` —
      `deriveInvoiceStatus(total, paidAmount, dueDate, now, cancelledAt):
      InvoiceStatus`, pura.
- [x] 3.3 `src/features/finance/data/gateways/simulated-gateway.ts` — implementa
      `MobileMoneyGateway`; quatro caminhos determinísticos (sucesso, falha, timeout,
      pendente-depois-confirmado) escolhidos por convenção no `payerPhone` de teste,
      documentado no próprio ficheiro.
- [x] 3.4 `src/features/finance/domain/payment-schema.ts` — Zod para
      `recordManualPaymentSchema` (`invoiceId`, `amount`, `method` sem `MOBILE_MONEY`),
      `initiateMobileMoneyPaymentSchema` (`invoiceId`, `provider`, `payerPhone`),
      `reversePaymentSchema` (`paymentId`, `reason` obrigatório). Acrescentado também
      `confirmPaymentSchema` (`paymentId`), para a Server Action de confirmação.
- [x] 3.5 `src/features/finance/actions/record-manual-payment.ts` — só
      `isSchoolAdministrator`; cria `Payment` já `CONFIRMED`; recalcula
      `Invoice.paidAmount`/`status` por agregação (nunca incremento) na mesma
      transacção; `AuditLog`. A recalculação em si vive em
      `domain/invoice-balance.ts` (`recalculateInvoiceBalance`, pura, testada à parte)
      para não duplicar a lógica de soma+derivação nas três acções que a usam.
- [x] 3.6 `src/features/finance/actions/initiate-mobile-money-payment.ts` — só
      `isSchoolAdministrator`; gera `idempotencyKey` própria e grava o `Payment` em
      `INITIATED` ANTES de chamar `gateway.initiate`; se o operador responder
      `PENDING`/`CONFIRMED`/`FAILED` de imediato, aplica a transição via
      `domain/payment-transition.ts` (`resolvePaymentTransition`, pura, partilhada com
      3.7).
- [x] 3.7 `src/features/finance/actions/confirm-payment.ts` — consulta
      `gateway.getStatus` (ou recebe um resultado já resolvido), usa `canTransition`
      antes de gravar, recalcula `Invoice.paidAmount`/`status` por agregação na mesma
      transacção; chamar duas vezes para o mesmo `Payment` já `CONFIRMED` não faz nada
      (idempotente).
- [x] 3.8 `src/features/finance/actions/reverse-payment.ts` — só
      `isSchoolAdministrator`; recusa sem motivo; `canTransition` recusa reverter o que
      não está `CONFIRMED`; recalcula a factura; `AuditLog` com o motivo (o schema não
      tem coluna própria para isto no `Payment` — o motivo fica só no `AuditLog.after`).
- [x] 3.9 `src/features/finance/data/payments.ts` — `getInvoiceForPayment` (factura +
      pagamentos, para a UI de registo), `getReceipt` (pagamento `CONFIRMED` + código de
      verificação).
- [x] 3.10 UI — separador "Pagamentos" em `/financas`: registar manual, iniciar dinheiro
      móvel, listar pagamentos de uma factura com acção de reverter (confirmação +
      motivo, mesmo padrão de `CloseTermSection`); vista de recibo imprimível
      (`print:hidden` na parte interactiva, mesmo padrão de `/pautas`/`/horarios`),
      assinalando claramente um pagamento revertido. Uma factura é seleccionada por
      `?factura=<id>` a partir de uma ligação "Pagamentos" no mapa de dívida e na
      conta-corrente — não há campo de busca livre.
- [x] 3.11 Testes: `canTransition`/`deriveInvoiceStatus` (todas as combinações);
      `SimulatedGateway` (os quatro caminhos); pagamento manual confirma e actualiza a
      factura de imediato; iniciar dinheiro móvel grava `INITIATED` antes de chamar a
      porta; confirmar duas vezes a mesma `idempotencyKey` não duplica nem soma duas
      vezes; reversão sem motivo recusa; reversão recalcula a factura e regista
      `AuditLog`; teste de reconciliação — `paidAmount` é sempre igual à soma dos
      `Payment`s `CONFIRMED`.

## 4. Portal da família

- [x] 4.1 `src/features/finance/data/family-finance.ts` — `getPortalFinance(schoolId,
      role, userId, requestedStudentId?)`, mesmo padrão de `getPortalGrades`/
      `getPortalSchedule`: aluno vê o seu próprio saldo/histórico; encarregado escolhe o
      educando (`?aluno=`); nunca outro aluno. Reutiliza `getStudentAccount`
      (`invoicing.ts`) para os dados em si, só resolvendo `studentId` → matrícula do ano
      activo antes de chamar.
- [x] 4.2 Nova secção de finanças em `/portal`, ao lado de notas e horário já
      construídos. `/my-timetable` é uma página própria (mesmo padrão de "notas"
      original); dentro de `/portal` em si, "Notas" e "Finanças" ficaram como dois
      separadores GET (`?tab=grades|finance`), sem JavaScript, mesmo espírito das outras
      páginas do módulo.
- [x] 4.3 Testes de `getPortalFinance` (autorização, âmbito, contra a base real).

## 5. Verificação

- [x] 5.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [x] 5.2 Verificação manual (Playwright, contra o servidor de desenvolvimento e a base
      real, com dados criados e removidos a seguir): registar um pagamento manual parcial
      e ver a factura passar a "Parcial"; iniciar um pagamento por dinheiro móvel no
      caminho de timeout (nunca resolve) e confirmar que a factura não muda; tentar
      confirmar um pagamento ainda pendente; reverter um pagamento sem motivo (botão
      desactivado) e com motivo (revertido, factura recalculada de volta); imprimir um
      recibo, com o aviso de "revertido" visível; consultar `/portal` como encarregado —
      separador "Finanças" com saldo e mapa de facturas do educando. O caminho
      pendente-depois-confirmado e a idempotência de confirmar duas vezes já ficam
      cobertos por `confirm-payment.test.ts` contra a base real, não repetidos aqui.
- [x] 5.3 Actualizar `CHANGELOG.md` e `docs/specs/README.md`.
