# grade-entry

## Purpose

Lançamento de notas por professor, num agrupamento (`TeachingGroup`), componente e
trimestre — incluindo a resolução do esquema de avaliação aplicável e o cálculo ao vivo da
média usando o mesmo motor do fecho de trimestre.

## Requirements

### Requirement: Professor cria a avaliação concreta dentro de um componente
O sistema SHALL permitir a um professor dono de um `TeachingGroup` criar uma `Assessment`
(nome, `maxScore`, `weight`, data) associada a um `AssessmentComponent` do esquema aplicável
ao agrupamento, num `Term`. O sistema SHALL recusar um `componentId` que não pertença ao
esquema aplicável a esse agrupamento.

#### Scenario: Criar uma avaliação
- **WHEN** um professor cria uma `Assessment` ("Teste 1") no componente "AT" do seu
  agrupamento, no trimestre activo
- **THEN** a avaliação fica disponível para lançar notas, e visível a outros professores só
  em modo de leitura (se aplicável)

#### Scenario: Vários testes no mesmo componente
- **WHEN** um professor cria uma segunda `Assessment` ("Teste 2") no mesmo componente "AT"
- **THEN** as duas avaliações coexistem, cada uma com o seu `weight` dentro do componente

#### Scenario: Componente de outro esquema
- **WHEN** um professor tenta criar uma `Assessment` associada a um `AssessmentComponent`
  que não pertence ao esquema resolvido para o seu agrupamento
- **THEN** o pedido é recusado

### Requirement: Professor lança notas de um componente, num trimestre
O sistema SHALL permitir a um professor dono de um `TeachingGroup` lançar/alterar a nota
(`Grade.score`) de cada matrícula membro desse agrupamento, para um `Assessment` concreto
(componente + trimestre), incluindo marcar a matrícula como ausente (`isAbsent`).

#### Scenario: Lançar notas de um agrupamento
- **WHEN** um professor abre a grelha de um `TeachingGroup` seu, para um `Assessment` de um
  componente e trimestre
- **THEN** vê uma linha por matrícula membro do agrupamento, com a nota já lançada (se
  existir) pré-preenchida

#### Scenario: Alternar não chama o servidor a cada toque
- **WHEN** o professor altera a nota de uma linha
- **THEN** a alteração fica só no estado local do ecrã até ele submeter explicitamente —
  nenhum pedido ao servidor por cada alteração

### Requirement: Resolução do esquema aplicável a uma classe e disciplina
O sistema SHALL resolver, para uma classe (`GradeLevel`) e disciplina (`Subject`) dadas, qual
`AssessmentScheme` do ano lectivo activo se aplica, pela ordem: esquema com ambos
(`gradeLevelId` e `subjectId`) → esquema só com `subjectId` → esquema só com `gradeLevelId`
→ esquema sem nenhum dos dois (geral do ano). Esta resolução SHALL viver numa função pura,
reutilizada pelo lançamento de notas e pelo fecho de trimestre.

#### Scenario: Esquema específico prevalece sobre o geral
- **WHEN** existe um esquema geral do ano e um esquema específico para a classe e disciplina
  do lançamento
- **THEN** o esquema específico é o usado para calcular a média

#### Scenario: Sem esquema nenhum aplicável
- **WHEN** não existe nenhum esquema (nem geral nem específico) para o ano lectivo activo
- **THEN** o sistema explica que é preciso criar um esquema de avaliação primeiro, em vez de
  uma grelha que falha silenciosamente

### Requirement: A média mostrada ao lançar usa o mesmo motor do servidor
O sistema SHALL calcular a média apresentada ao vivo, durante o lançamento, chamando
`computeSubjectResult` — o mesmo módulo puro que o fecho de trimestre usa para gravar o
resultado. SHALL NOT existir uma segunda implementação da fórmula do lado do cliente.

#### Scenario: Média ao vivo coincide com o fecho
- **WHEN** um professor lança notas e vê a média calculada no ecrã
- **THEN** essa média é exactamente a que o fecho de trimestre viria a gravar em
  `TermResult`, dadas as mesmas notas

### Requirement: As notas explicativas do motor aparecem em texto legível
O sistema SHALL mostrar, junto da média calculada, as `SubjectResult.notes` devolvidas pelo
motor (ex.: componente sem notas, pesos redistribuídos, abaixo do mínimo exigido), em texto
em português, não como um código interno.

#### Scenario: Componente sem notas lançadas
- **WHEN** um componente do esquema não tem nenhuma nota lançada para uma matrícula
- **THEN** a grelha mostra o aviso "Componente {X} sem notas lançadas" junto dessa linha,
  não apenas uma média vazia sem explicação

### Requirement: Só o professor dono do agrupamento lança notas
O sistema SHALL restringir o lançamento de notas de um `TeachingGroup` ao professor que lhe
está associado (`TeachingGroup.teacherId`), e SHALL sempre resolver os membros
(`TeachingGroupMember`) no servidor — nunca confiar em `enrollmentId`s vindos do pedido do
cliente.

#### Scenario: Gestor tenta lançar notas em nome de um professor
- **WHEN** um utilizador com papel `SCHOOL_MANAGER` chama a acção de lançar notas de um
  `TeachingGroup` que não é seu
- **THEN** o pedido é recusado

#### Scenario: Um professor diferente tenta lançar notas noutro agrupamento
- **WHEN** um professor chama a acção de lançar notas de um `TeachingGroup` de que não é o
  professor associado
- **THEN** o pedido é recusado
</content>
