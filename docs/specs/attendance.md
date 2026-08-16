# Spec — Presenças

- **Estado:** Por aprovar
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md)
- **Âmbito:** marcação de presenças pelo professor e consulta pela direcção.

---

## 1. Contexto

O modelo de dados já existe: `AttendanceSession` (uma aula concreta) e `AttendanceRecord`
(uma matrícula nessa aula). Falta a interface.

O requisito que molda tudo o resto é a **velocidade de marcação**. Um professor tem entre
dois e cinco minutos no início da aula e frequentemente um telemóvel em vez de um
computador. Uma chamada de 45 alunos que exija 45 toques é uma chamada que não vai ser
feita — vai ser feita de memória no fim do dia, ou não vai ser feita de todo.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | A sessão abre com **todos presentes**; o professor marca só as excepções |
| RF-02 | Alternar o estado de um aluno com um toque, sem diálogos de confirmação |
| RF-03 | Estados: Presente, Falta, Atrasado, Justificado |
| RF-04 | O professor vê apenas os seus agrupamentos lectivos |
| RF-05 | A lista de alunos vem do agrupamento, não da turma |
| RF-06 | Submeter fecha a sessão; reabrir uma sessão fechada exige registo de quem alterou |
| RF-07 | Direcção vê mapa de assiduidade por turma, aluno e período |
| RF-08 | Contagem de faltas por disciplina, para efeitos de exclusão por faltas |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | Marcação utilizável a 375px, com uma só mão |
| RNF-02 | Gravar 45 registos numa única Server Action, não 45 pedidos |
| RNF-03 | Alternar um aluno responde imediatamente, sem esperar pelo servidor |
| RNF-04 | Uma sessão já submetida não pode ser silenciosamente reescrita |

---

## 3. Desenho

### 3.1 Fluxo

```
Professor → escolhe agrupamento e data
          → AttendanceSession (DRAFT), todos PRESENT por omissão
          → alterna as excepções
          → submete → SUBMITTED
```

### 3.2 Estado optimista

RNF-03 e RNF-02 puxam em sentidos opostos: resposta imediata pede um pedido por toque,
eficiência pede um pedido só. A resposta é `useOptimistic`: o estado muda no ecrã ao toque,
e a Server Action grava o **delta** quando se submete.

```
AttendanceSheet (client)
  useOptimistic(records)         → alternar é instantâneo
  submitAttendance(sessionId, changes)  → upsert em lote, uma transacção
```

Grava-se o delta e não a lista toda: numa turma de 45 com três faltas, são três linhas em
vez de 45.

### 3.3 Domínio puro

`features/academic/domain/attendance.ts`:

```ts
computeAttendanceSummary(records, sessions): AttendanceSummary
isExcludedByAbsences(summary, rule): boolean
```

A regra de exclusão por faltas é **configurável e por confirmar** — varia entre escolas e
entre disciplinas, e o número exacto tem de ser validado consigo antes de ser fixado. Fica
como campo, não como constante no código.

### 3.4 Reabertura

Uma sessão `SUBMITTED` que volte a ser alterada gera `AuditLog` com o estado antes e
depois. Um mapa de assiduidade que muda sem rasto não é defensável perante um encarregado
de educação que conteste uma exclusão por faltas.

---

## 4. Ecrãs

| Rota (pt / en) | Papel | Conteúdo |
|---|---|---|
| `/presencas` / `/attendance` | Professor | Agrupamentos do dia, por marcar |
| `/presencas/[grupo]` / `/attendance/[group]` | Professor | Folha de marcação |
| `/turmas/[turma]/assiduidade` | Gestor | Mapa por turma e período |

---

## 5. Critérios de aceitação

- [ ] Abrir uma sessão nova mostra todos os alunos como Presente
- [ ] Alternar um aluno muda o ecrã sem esperar pelo servidor
- [ ] Submeter grava numa só transacção, com os estados correctos
- [ ] Um professor não consegue abrir a folha de um agrupamento que não é seu
- [ ] Um agrupamento de Secção mostra alunos das duas turmas, e só os do percurso
- [ ] Reabrir uma sessão submetida regista autor e alteração em `AuditLog`
- [ ] A folha é utilizável a 375px com uma só mão
- [ ] O sumário de faltas conta por disciplina, não por dia
- [ ] `pnpm build`, `lint` e `test` verdes

---

## 6. Fora de âmbito

Marcação offline sem rede (fase própria — exige fila local e resolução de conflitos),
justificação de faltas com anexo, e notificação ao encarregado de educação.
