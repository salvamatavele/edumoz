## Context

O schema para tudo isto já existe desde a Fase 2 (`GradeLevel`, `Section`, `StudyPath`,
`Subject`, `CurriculumSubject`, `ClassGroup`, `Teacher`, `TeachingGroup`,
`AssessmentScheme`, `AssessmentComponent`), e o motor de cálculo de médias
(`grade-engine.ts`, com `validateScheme`) já é puro e testado. O único caminho para estes
dados hoje é `prisma/seed.ts` — não há Server Action nem página para nenhum deles. Isso é
o que impede Presenças de sair do modo de demonstração e bloqueia Avaliação (spec #6) de
sequer começar.

Todos os módulos seguintes (`create-student.ts`, `enroll-student.ts`,
`submit-attendance.ts`) já estabeleceram o mesmo padrão de Server Action
(`auth()` → autorização → Zod → transacção + `AuditLog` → `revalidatePath`), e a barra
lateral do painel (`(dashboard)/layout.tsx`, Fase 5/6) já resolve `navItems` por papel —
falta só um ramo novo para `isSchoolAdministrator`.

## Goals / Non-Goals

**Goals:**
- Um gestor de escola cria e edita, sem tocar na base de dados: classes/níveis, secções,
  percursos, disciplinas, a relação disciplina↔percurso, turmas, professores, atribuições
  de professor a turma/disciplina, e esquemas de avaliação (fórmula de médias).
- Cada ecrã segue o molde já estabelecido — nenhum padrão novo de mutação.
- `validateScheme` (já existente) corre antes de qualquer `AssessmentScheme` ser gravado.
- Uma nova entrada "Configuração" na barra lateral, só para `isSchoolAdministrator`.

**Non-Goals:**
- Gerir `Room` (salas) — fica com o horário (`scheduling-module.md`).
- Gerir `ScheduleEntry` (horário propriamente dito) — spec #7, não esta.
- Ligar `Teacher.userId`/dar acesso de login a um professor — continua um gap conhecido
  desde a Fase 6 (`attendance.md`), gerido só pela base de dados por agora.
- Fixar os campos "por confirmar" de `AssessmentScheme` (`hasExam`, `examWeight`,
  `minGradeForExam`, `exemptionGrade`, `minExamGrade`) — o próprio schema já os marca como
  derivados de um modelo de ensino superior, não de prática secundária validada (ver
  Decisões). Ficam expostos no formulário, mas o seu significado exacto continua por
  confirmar consigo antes de uma escola real os usar.
- Configuração da própria escola (logótipo, nome, fórmulas de pagamento) — capability
  separada, não proposta aqui.
- Editar/apagar em cascata (ex.: apagar uma disciplina com `CurriculumSubject`
  dependentes) — só criar e editar nesta fase; apagar fica para quando houver um caso de
  uso real.

## Decisions

**Uma entrada na barra lateral, várias secções dentro da página — não seis ligações
novas.** Seis a doze entidades geríveis não cabem na barra lateral sem a sobrecarregar.
"Configuração" leva a uma página com três secções internas (Estrutura académica,
Professores, Avaliação), cada uma com a sua tabela e o seu `FormModal` — mais próximo do
`/design-system` (uma página, várias secções) do que de `/alunos` (uma tabela, uma
página). Cada secção pode mais tarde ganhar a sua própria rota se crescer — não é uma
decisão definitiva, é a mais simples que serve agora.

**Correcção (pós-implementação): esta decisão foi revertida depois de ver a página
construída.** Nove tabelas empilhadas verticalmente numa só página ("Configuração")
pareciam uma parede de tabelas, não um painel profissional — e a maior parte do conteúdo
(classes, turmas, professores) não é "configuração do sistema", é gestão de dados
académicos do dia-a-dia. Ver feedback do utilizador com captura de ecrã. A estrutura final:
- `/academic`, `/teachers`, `/assessment` — três páginas próprias, cada uma com a sua
  entrada na barra lateral, agrupando internamente por separadores (`Tabs`) em vez de
  secções empilhadas — uma tabela visível de cada vez.
- `/settings` ("Configuração") mantém-se, mas esvaziada: fica reservada para a
  configuração REAL do sistema (nome, logótipo, fórmulas de pagamento da escola — ver
  Non-Goals), que ainda não foi construída. Mostra por agora um estado vazio explícito.
- `EntitySection` deixou de ter título próprio — o separador já diz que entidade é aquela;
  repeti-lo seria o mesmo texto duas vezes. Cada tabela passou a viver dentro de um cartão
  (`bg-surface`, moldura) para se destacar do fundo da página.

**Ordem de criação reflectida na ordem das secções, não imposta por código.**
`CurriculumSubject` depende de `StudyPath` + `Subject`; `TeachingGroup` depende de
`Subject` + `Teacher` + `ClassGroup`/`AcademicYear`; `AssessmentScheme` depende
opcionalmente de `GradeLevel` + `Subject`. Em vez de bloquear a interface até as
dependências existirem, cada formulário que referencia outra entidade mostra "ainda não
há X — crie um primeiro" no lugar do selector vazio (mesmo tratamento que
`listEnrollmentOptions`/`listUnenrolledStudents` já dão à ausência de ano lectivo activo).

**`validateScheme` corre no servidor, antes de gravar — não é só validação de formulário.**
A soma dos pesos dos componentes ter de ser exactamente 1.0000 é uma regra do domínio
(`grade-engine.ts`), não uma regra de campo Zod isolado (Zod valida a FORMA de cada
componente; `validateScheme` valida a COERÊNCIA do esquema inteiro). A Server Action de
`AssessmentScheme` chama Zod primeiro (forma), depois `validateScheme` (coerência), só
depois escreve.

**`CurriculumSubject.scope` cobre "tronco comum"/"secção"/"currículo interno"; não há um
quarto valor para "extracurricular".** `SubjectScope` (`CORE`/`SECTION`/`INTERNAL`) já
existe desde a Fase 2. Uma disciplina extracurricular, tal como descrita, mapeia-se para
`INTERNAL` com `isExamSubject: false` — não precisa de um enum novo nem de uma migração. Se
"extracurricular" precisar de se comportar de forma visivelmente diferente (ex.: não
contar para a média final), isso é uma regra do `grade-engine.ts`, não uma etiqueta nova
no schema — fica para confirmar quando houver um caso concreto.

**Todas as Server Actions ficam sob `isSchoolAdministrator` — nenhuma sob o professor
dono, ao contrário de `submit-attendance.ts`.** Configurar a estrutura académica é uma
decisão de gestão, não de sala de aula; um professor não deve poder mudar a fórmula de
médias da sua própria disciplina.

## Risks / Trade-offs

**[Risk] Muitas entidades interligadas — um erro numa (ex.: apagar sem cascata pensada)
pode deixar referências penduradas.** Mitigado por esta fase só criar/editar, nunca
apagar (ver Non-Goals) — apagar é onde a maior parte destes riscos se concentra, e fica para
quando houver um caso de uso real a moldar as regras de cascata.

**[Risk] `AssessmentScheme` com campos "por confirmar" expostos na interface pode
sugerir uma certeza que não existe.** Mitigado com texto de ajuda explícito no formulário
("estes campos ainda não foram validados com uma escola real") — não esconder os campos,
só não fingir que estão fechados.

**[Trade-off] Uma página de configuração densa em vez de várias rotas focadas.** Aceite
para esta fase (ver Decisões) — revisitar se alguma secção crescer ao ponto de justificar
a sua própria rota e nav própria.
