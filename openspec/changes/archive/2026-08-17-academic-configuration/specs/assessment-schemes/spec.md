## ADDED Requirements

### Requirement: Gestor configura esquemas de avaliação
O sistema SHALL permitir criar um `AssessmentScheme` para o ano lectivo activo,
opcionalmente restrito a um `GradeLevel` e/ou `Subject`, com escala, nota de aprovação,
modo de arredondamento e casas decimais.

#### Scenario: Esquema geral do ano vs. esquema específico
- **WHEN** um esquema é criado sem `GradeLevel` nem `Subject` (esquema base do ano) e
  outro é criado só para a 10ª classe
- **THEN** os dois coexistem, e a resolução mais específica (classe/disciplina) prevalece
  sobre a mais geral quando ambos se aplicam ao mesmo lançamento

### Requirement: Componentes de um esquema somam exactamente 1.0000
O sistema SHALL validar, através de `validateScheme` (`grade-engine.ts`), que os pesos de
todos os `AssessmentComponent` de um esquema somam exactamente 1.0000 antes de gravar, e
SHALL recusar a gravação com os erros específicos quando não somam.

#### Scenario: Pesos que não somam 1
- **WHEN** um gestor tenta gravar um esquema com componentes de peso 0.4 e 0.5 (soma 0.9)
- **THEN** a gravação é recusada, e o erro identifica que os pesos não somam 1.0000 — não
  uma mensagem genérica

#### Scenario: Pesos válidos
- **WHEN** os componentes somam exactamente 1.0000
- **THEN** o esquema e os seus componentes são gravados numa transacção

### Requirement: Campos de exame ficam identificados como não confirmados
O sistema SHALL apresentar os campos `hasExam`, `examWeight`, `minGradeForExam`,
`exemptionGrade` e `minExamGrade` no formulário com texto que indique que o seu
comportamento ainda não foi validado com uma escola real.

#### Scenario: Gestor vê o aviso
- **WHEN** o gestor activa `hasExam` num esquema
- **THEN** os campos relacionados com exame aparecem acompanhados de texto de ajuda a
  indicar que a regra ainda está por confirmar

### Requirement: Só quem administra a escola configura esquemas
O sistema SHALL restringir a criação/edição de `AssessmentScheme` e
`AssessmentComponent` a uma sessão que satisfaça `isSchoolAdministrator`.

#### Scenario: Professor tenta mudar a fórmula da sua disciplina
- **WHEN** um utilizador com papel `TEACHER` chama a acção de editar um `AssessmentScheme`
- **THEN** o pedido é recusado, mesmo que o esquema seja da disciplina que esse professor
  lecciona
