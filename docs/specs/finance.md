# Spec — Finanças e propinas

- **Estado:** Por aprovar
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md)
- **Âmbito:** tabelas de propinas, facturação, pagamentos e integração com dinheiro móvel.

---

## 1. Contexto

O modelo existe: `FeeSchedule`, `FeeItem`, `Invoice`, `InvoiceLine`, `Payment`. A porta
para os operadores está definida em
`features/finance/domain/ports/mobile-money-gateway.ts`. Falta tudo o resto.

É o módulo com mais risco do projecto, por uma razão simples: **é o único onde um erro
custa dinheiro a alguém**. Um cálculo de média errado corrige-se; um pagamento contado
duas vezes, ou não contado, envolve uma família e a tesouraria da escola.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Tabelas de propinas por ano lectivo, com âmbito por classe ou percurso |
| RF-02 | Rubricas: matrícula, propina mensal, taxa de exame, uniforme |
| RF-03 | Geração de facturas mensais em lote |
| RF-04 | Registo de pagamento manual: numerário, depósito, transferência |
| RF-05 | Pagamento por dinheiro móvel: m-Pesa, e-Mola, mKesh |
| RF-06 | Conta-corrente por aluno, com saldo e histórico |
| RF-07 | Mapa de propinas em dívida, por turma e por período |
| RF-08 | Recibo imprimível com código de verificação |
| RF-09 | Encarregado de educação vê o que deve e paga |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | Todos os valores em `Decimal(12,2)`. Nunca vírgula flutuante |
| RNF-02 | Nenhum pagamento pode ser contado duas vezes |
| RNF-03 | Um pagamento confirmado nunca é apagado — só revertido, com rasto |
| RNF-04 | Falha de rede com o operador não pode deixar estado ambíguo |

---

## 3. Desenho

### 3.1 Idempotência

`Payment.idempotencyKey` é único e obrigatório. Os operadores de dinheiro móvel repetem os
callbacks por desenho — é assim que garantem entrega — e sem chave o mesmo pagamento entra
duas vezes. A chave é gerada pelo EduMoz antes de contactar o operador, não recebida dele.

### 3.2 Máquina de estados

```
INITIATED ──→ PENDING ──→ CONFIRMED
     │            │            │
     └──→ FAILED ←┘            └──→ REVERSED
```

`INITIATED` existe separado de `PENDING` por causa do RNF-04: é o estado em que o EduMoz
já gravou a intenção mas ainda não sabe se o operador a recebeu. Sem ele, uma falha de rede
no momento do pedido deixaria a dúvida entre "não foi enviado" e "foi enviado e não sabemos".

Nenhum destes operadores confirma de forma síncrona — o aluno ainda tem de aprovar no
telemóvel. **Uma factura só passa a paga com `CONFIRMED`**, nunca à saída do `initiate`.

### 3.3 Reconciliação

`Invoice.paidAmount` é desnormalizado — é a soma dos `Payment` confirmados. Vai divergir se
alguma escrita a esquecer. Duas defesas:

1. Só se actualiza **na mesma transacção** que confirma o pagamento.
2. Um teste de reconciliação verifica, sobre a base semeada, que `paidAmount` é sempre
   igual à soma dos pagamentos confirmados.

### 3.4 Adaptadores

Nesta fase entra o `SimulatedGateway`, com quatro comportamentos: sucesso, falha, timeout, e
pendente-depois-confirmado. É o quarto que interessa — é o caminho real, e é o único que
exercita a confirmação assíncrona.

Os adaptadores reais exigem credenciais e documentação dos operadores, que **ainda não
temos**. Ficam para uma fase própria, atrás da mesma porta.

### 3.5 Papéis

Registar um pagamento manual e reverter um pagamento são acções distintas com permissões
distintas. Reverter exige `SCHOOL_MANAGER` e motivo obrigatório, sempre com `AuditLog`.

---

## 4. Critérios de aceitação

- [ ] Gerar facturas mensais para uma turma produz uma factura por matrícula
- [ ] Somar doze propinas de 1800,00 dá exactamente 21 600,00
- [ ] O mesmo callback recebido duas vezes cria **um** pagamento
- [ ] `initiate` com resposta pendente não marca a factura como paga
- [ ] A confirmação posterior actualiza `paidAmount` e o estado da factura
- [ ] `paidAmount` é sempre igual à soma dos pagamentos confirmados
- [ ] Reverter exige gestor, motivo, e deixa rasto
- [ ] Um encarregado vê apenas as facturas dos seus educandos
- [ ] Os valores aparecem como `21 600,00 MT` em pt e `MTn 21,600.00` em en
- [ ] `pnpm build`, `lint` e `test` verdes

---

## 5. Fora de âmbito

Adaptadores reais dos operadores, conciliação bancária, planos de pagamento e perdão de
dívida, e emissão fiscal.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Callback duplicado conta dinheiro duas vezes | `idempotencyKey` única, imposta pela base de dados |
| Factura marcada paga antes de o dinheiro existir | Só `CONFIRMED` altera o saldo |
| `paidAmount` diverge | Actualização na mesma transacção + teste de reconciliação |
| Documentação dos operadores indisponível | Porta hexagonal — os adaptadores entram sem mexer no domínio |
