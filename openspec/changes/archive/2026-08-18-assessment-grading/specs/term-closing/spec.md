## ADDED Requirements

### Requirement: Fecho de trimestre materializa o resultado de todas as disciplinas
O sistema SHALL, ao fechar um `Term`, calcular e gravar um `TermResult` para cada
combinação de matrícula activa e disciplina do seu percurso, usando `computeSubjectResult`
com o esquema aplicável resolvido para essa classe e disciplina (ver capability
`grade-entry`, "Resolução do esquema aplicável").

#### Scenario: Fechar um trimestre com notas lançadas
- **WHEN** um gestor fecha um `Term` com notas já lançadas em todos os agrupamentos
- **THEN** existe um `TermResult` para cada matrícula × disciplina do percurso de cada
  aluno, com a média, o `finalScore` e `passed` calculados

#### Scenario: Fechar com uma disciplina sem nenhuma nota lançada
- **WHEN** uma disciplina do percurso de um aluno não tem nenhuma nota lançada nesse
  trimestre
- **THEN** o `TermResult` dessa disciplina é gravado com `average` nulo e a nota
  `NO_GRADES_AT_ALL`, e o fecho não falha por causa disso

### Requirement: A versão do esquema usado fica congelada no resultado
O sistema SHALL gravar em cada `TermResult` o `schemeId` e o `schemeVersion` do esquema
efectivamente usado no cálculo. Alterar o esquema depois do fecho SHALL NOT alterar nenhum
`TermResult` já gravado.

#### Scenario: Esquema alterado depois do fecho
- **WHEN** um gestor cria uma nova versão do esquema de avaliação depois de um trimestre já
  fechado
- **THEN** os `TermResult` desse trimestre continuam a mostrar o `schemeVersion` original,
  inalterados

### Requirement: Só quem administra a escola fecha um trimestre
O sistema SHALL restringir o fecho de um `Term` a uma sessão que satisfaça
`isSchoolAdministrator`.

#### Scenario: Professor tenta fechar o trimestre
- **WHEN** um utilizador com papel `TEACHER` chama a acção de fechar um `Term`
- **THEN** o pedido é recusado

### Requirement: Um trimestre já fechado não pode ser fechado novamente
O sistema SHALL recusar o fecho de um `Term` cujo `status` já seja `CLOSED`.

#### Scenario: Fechar duas vezes
- **WHEN** um gestor tenta fechar um `Term` que já está `CLOSED`
- **THEN** o pedido é recusado, com uma mensagem específica — não uma tentativa silenciosa
  de recalcular
