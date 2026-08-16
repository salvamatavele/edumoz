# Spec — Avaliação e pautas

- **Estado:** Por aprovar
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md)
- **Âmbito:** configuração da fórmula, lançamento de notas e fecho de pautas.

---

## 1. Contexto

O motor está construído e testado (28 testes): `computeSubjectResult` e `validateScheme` em
`features/academic/domain/grade-engine.ts`. O que falta é a interface — e a interface é
onde as decisões difíceis aparecem, porque uma nota lançada é um facto com consequências
para um aluno.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Painel de administração da fórmula: componentes, pesos, escala, arredondamento |
| RF-02 | Validação em tempo real dos pesos — a soma tem de dar exactamente 1 |
| RF-03 | Esquemas por ano lectivo, com âmbito opcional por classe e disciplina |
| RF-04 | Um esquema publicado é imutável; alterar cria uma nova versão |
| RF-05 | Professor lança notas por agrupamento lectivo, em grelha |
| RF-06 | A média calculada aparece enquanto se lança, não só no fim |
| RF-07 | As `notes` do resultado são mostradas em texto legível |
| RF-08 | Fechar o trimestre materializa `TermResult` e congela-o |
| RF-09 | Pauta imprimível por turma e disciplina |
| RF-10 | Aluno e encarregado vêem as suas notas, publicadas |

---

## 3. Desenho

### 3.1 Configuração da fórmula

O painel escreve `AssessmentScheme` + `AssessmentComponent`. Antes de gravar, corre
`validateScheme` — a mesma função que o motor usa — e mostra **todos** os erros de uma vez.

Os seis campos de exame (`hasExam`, `examWeight`, `minGradeForExam`, `exemptionGrade`,
`minExamGrade`, e o `minGrade` por componente) estão marcados **POR CONFIRMAR** no schema.
Derivam de um modelo de ensino superior, não de prática de ensino secundário validada.
**Antes de construir este painel, é preciso confirmar consigo quais destas regras a sua
escola usa.** As que não usar ficam escondidas da interface, não apenas nulas.

### 3.2 Grelha de lançamento

```
AssessmentGrid (client)
  linhas   = membros do agrupamento (matrículas)
  colunas  = avaliações do componente, no trimestre
  rodapé   = média calculada por computeSubjectResult, ao vivo
```

O cálculo ao vivo usa o **mesmo motor** do servidor. Não há uma segunda fórmula em
JavaScript para a pré-visualização: duas implementações da mesma regra divergem, e a
primeira vez que alguém dá por isso é numa reclamação de nota.

### 3.3 Fecho do trimestre

```
fecharTrimestre(termId)
  1. para cada matrícula × disciplina: computeSubjectResult
  2. grava TermResult com schemeId E schemeVersion
  3. Term.status = CLOSED
  4. AuditLog
```

Guardar a versão do esquema é o que permite reconfigurar a fórmula no ano seguinte sem
reescrever o histórico. Já está no schema; falta a operação.

### 3.4 Notas explicativas

`SubjectResult.notes` traz factos que a pauta tem de saber explicar:

| Nota | Texto (pt) |
|---|---|
| `COMPONENT_WITHOUT_GRADES` | «Componente {X} sem notas lançadas» |
| `WEIGHTS_RENORMALISED` | «Pesos redistribuídos pelos componentes com notas» |
| `BELOW_COMPONENT_MINIMUM` | «Abaixo do mínimo exigido em {X}» |
| `EXEMPT_FROM_EXAM` | «Dispensado de exame» |
| `NOT_ADMITTED_TO_EXAM` | «Não admitido a exame» |
| `NO_GRADES_AT_ALL` | «Sem notas lançadas» |

Sem isto, um encarregado de educação que pergunte "porque é que a média é 12 e não 7?"
obriga alguém a reconstruir o raciocínio à mão.

---

## 4. Critérios de aceitação

- [ ] Pesos que não somam 1 impedem gravar, com todos os erros visíveis de uma vez
- [ ] Um esquema publicado não pode ser alterado — só versionado
- [ ] A média mostrada ao lançar coincide com a que o fecho grava
- [ ] Um componente sem notas renormaliza os pesos e a pauta di-lo
- [ ] Fechar o trimestre grava `TermResult` com a versão do esquema
- [ ] Alterar o esquema depois do fecho não muda nenhum `TermResult`
- [ ] Um professor não lança notas em agrupamentos que não são seus
- [ ] Um aluno vê as suas notas e nenhuma de outro aluno
- [ ] A pauta imprime em A4 sem cortar colunas
- [ ] `pnpm build`, `lint` e `test` verdes

---

## 5. Fora de âmbito

Exames nacionais e a sua importação, recursos e melhorias de nota, e o histórico de
alterações de nota com interface própria (fica no `AuditLog`).
