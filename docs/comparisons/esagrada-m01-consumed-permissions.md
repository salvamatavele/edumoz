# Acções administrativas com consumidor real — 2026-11-01

O catálogo persistido de compatibilidade conserva 50 pares e os seus IDs. A revisão A56 identificou 26 pares com controlo administrativo efectivo e 24 pares sem consumidor actual. `CONSUMED_PERMISSION_CATALOG` limita novas concessões e excepções; os valores antigos sem consumo são apresentados como pendentes e não são reescritos. A presença no catálogo ou num perfil antigo não prova implementação.

| Recurso | Acções com guard | Consumidores verificados |
|---|---|---|
| users | view, create, edit | página users, school-users, create-school-user, edit-school-user, estado/retirada/vínculos profissionais |
| school-staff | view, create, edit | página staff, school-staff (página/action/DAL) |
| students | view, create | página students, create-student |
| enrollments | create | enroll-student; a lista escolar continua a exigir students/view |
| attendance | view, edit | attendance-report e leitura administrativa de attendance/[scheduleEntryId]; reopen-attendance para actor administrativo |
| grades | nenhuma | grades e record-grades seguem posse docente; não existe leitura administrativa por grades/view |
| term-closing | view, edit | assessment; close-term e reopen-term |
| report-cards | view | report-cards para leitura administrativa; docente sem esse grant só consulta matrículas dos seus grupos |
| academic-structure | view, create | academic e criação de nível/secção/percurso/disciplina/currículo/turma/sala/tempo |
| teaching-staff | view, create | teachers; create-teacher e create-teaching-group |
| assessment-schemes | view, create | assessment e create-assessment-scheme |
| finance | view, create, edit | finance/receipt; taxas/facturação/registo/iniciação; confirmação/reversão |
| scheduling | view, create, edit | timetables; place-schedule-entry (create ou edit conforme o identificador) |

Os percursos próprios de docentes/famílias não são concessões administrativas. A matriz de excepções explicita essa distinção; negar report-cards/view retira a leitura administrativa, conservando só as pautas de posse docente quando existam. As capacidades finas de trabalho próprio e as permissões de gerir políticas mantêm consumidores e dependências separados em 2.7.2 e nos módulos correspondentes.

Novos perfis de sistema projectam as 26 acções acima. A preparação repetida não altera os perfis escolares existentes; duas entradas anteriormente projectadas, grades/view e enrollments/view, permanecem apenas em dados históricos que já as continham. Corrigida a descrição anterior de 28 “consumidores”.

Antes de acrescentar um consumidor futuro, a entrega deve testar acesso efectivo antes/depois e tratar explicitamente os valores dormentes — por remoção ou compatibilidade aprovada — para não os activar automaticamente. A evolução não pode resumir-se a acrescentar um `hasPermission` a uma rota e a activar a constante. As novas concessões exigem decisão explícita da escola.

Evidência de regressão: criação recusa IDs desconhecidos/acções sem consumo; edição conserva valor legado e recusa novo valor pendente; excepções omitem/recusam grades/view; grelha mostra valores legados desactivados e conserva-os ao alterar níveis activos; projecções novas são subconjunto das 26 acções. A aceitação integral continua dependente da suite final e do navegador.
