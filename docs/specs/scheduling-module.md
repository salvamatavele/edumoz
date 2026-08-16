# Spec — Horários

- **Estado:** Por aprovar
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md)
- **Âmbito:** montagem do horário, consulta por professor e por turma.

---

## 1. Contexto

O detector de conflitos está construído e testado (13 testes + 5 de integração):
`detectScheduleConflicts`, `conflictsForPlacement` e `isFree` em
`features/academic/domain/schedule-conflicts.ts`. Já funciona sobre horários hipotéticos,
que é exactamente o que uma interface de montagem precisa.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Grelha semanal por turma, professor ou sala |
| RF-02 | Colocar uma aula num tempo lectivo, com verificação antes de gravar |
| RF-03 | Os três conflitos — professor, sala e **aluno** — impedem a colocação |
| RF-04 | Os conflitos são explicados: quem colide com quem, e onde |
| RF-05 | Definição dos tempos lectivos por turno (manhã, tarde, noite) |
| RF-06 | Aviso, não bloqueio, quando um professor excede `maxWeeklyHours` |
| RF-07 | Horário do professor e do aluno em consulta, incluindo em telemóvel |
| RF-08 | Exportação do horário da turma para impressão |

---

## 3. Desenho

### 3.1 Onde cada conflito é impedido

| Conflito | Camada |
|---|---|
| Professor em dois sítios | Índice único **+** domínio |
| Sala ocupada duas vezes | Índice único **+** domínio |
| Agrupamento marcado duas vezes | Índice único **+** domínio |
| **Aluno com duas aulas** | **Só domínio** |

O conflito de aluno não é exprimível como índice: uma matrícula pertence a vários
agrupamentos ao mesmo tempo. É por isso que a escrita corre em transacção com verificação
prévia, e os índices únicos ficam como rede contra condições de corrida.

### 3.2 Colocação

```
ScheduleBoard (client)
  arrastar/escolher → conflictsForPlacement(candidate, existing, memberships)
                    → conflitos explicados ANTES de gravar
placeScheduleEntry (server action)
  transacção: recarrega o horário, revalida, grava
```

A verificação corre duas vezes de propósito: no cliente para dar resposta imediata, no
servidor porque o cliente pode estar a trabalhar sobre um horário desactualizado. A função
é a mesma nos dois lados.

### 3.3 Explicar o conflito

Um "não é possível" sem razão obriga a adivinhar. Cada conflito traz os ids necessários
para a mensagem:

| Conflito | Texto (pt) |
|---|---|
| `TEACHER_DOUBLE_BOOKED` | «{Professor} já tem {Disciplina} neste tempo» |
| `ROOM_DOUBLE_BOOKED` | «{Sala} está ocupada por {Agrupamento}» |
| `STUDENT_DOUBLE_BOOKED` | «{N} alunos já têm {Disciplina} neste tempo» |
| `GROUP_DOUBLE_BOOKED` | «Este agrupamento já tem aula neste tempo» |

O caso do aluno agrega por contagem: listar 15 nomes não ajuda ninguém a resolver o
problema, mas saber que são 15 e de que agrupamento vêm, sim.

### 3.4 Limitação assumida

Os índices únicos não acomodam aulas **quinzenais ou alternadas** (semana A / semana B).
Se essa necessidade aparecer, passam a incluir a paridade da semana, o que implica migração.
Ficou registado na Fase 2 por ser mais barato assumir agora do que descobrir depois.

---

## 4. Ecrãs

| Rota (pt / en) | Papel |
|---|---|
| `/horarios` / `/timetables` | Gestor — montagem |
| `/horarios/professor/[id]` | Gestor — vista por professor |
| `/meu-horario` / `/my-timetable` | Professor e aluno — consulta |

---

## 5. Critérios de aceitação

- [ ] Física de Ciências e História de Letras podem coexistir no mesmo tempo
- [ ] Português de 10A e Física de Ciências **não** podem — os alunos de Ciências de 10A
      estão nos dois
- [ ] O conflito é explicado antes de gravar, com nomes
- [ ] Uma colocação válida grava; a mesma colocação em duas sessões simultâneas falha uma
- [ ] Exceder `maxWeeklyHours` avisa mas não bloqueia
- [ ] O horário do professor lê-se num telemóvel sem scroll horizontal
- [ ] Um professor pode acumular Tronco Comum, Secção e Currículo Interno
- [ ] `pnpm build`, `lint` e `test` verdes

---

## 6. Fora de âmbito

Geração automática de horários, aulas quinzenais, substituição de professores e gestão de
salas por capacidade.
