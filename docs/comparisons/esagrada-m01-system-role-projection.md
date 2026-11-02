# Projecção dos nove perfis de sistema — 2026-10-31

As definições mantêm as 55 capacidades e os nove perfis da origem. A instalação escolar cria apenas os grants com consumidores já existentes abaixo; não atribui pessoas nem acrescenta grants a perfis existentes. Uma projecção parcial não declara implementada a capacidade completa. As restantes funções continuam nas dependências indicadas e nos contratos dos módulos.

Uma regra com várias capacidades exige **todas**, no nível mínimo indicado. Por exemplo, fechar e reabrir partilham actualmente term-closing/edit; o perfil de Director de Turma só recebe consulta até os guards distintos serem consumidos. Finance/create agrega taxas, facturação e registo: Secretaria conserva consulta e não obtém gestão de taxas por poder registar um pagamento na origem. Pessoal usa academic.manage_teachers, confirmado em directory.ts/directory-crud.ts; não usa a permissão de gestão de contas.

Acesso próprio docente/familiar não se converte em consulta global. Aluno, Encarregado, Professor de Actividade e Portaria não recebem grants administrativos só para preencher a matriz; a implementação dos seus consumidores e vínculos é rastreada separadamente. Campos/grants ajustados numa escola são preservados em qualquer repetição da instalação, mesmo quando a definição futura ganhar recursos novos.

| Capacidade da origem | Consumidores actuais projectados (parciais) | Dependência integral |
|---|---|---|
| `assessment.record_grades` | Sem projecção administrativa actual; preservar dependência/posse | M06/M07 |
| `assessment.edit_locked_grades` | Sem projecção administrativa actual; preservar dependência/posse | M06/M07 |
| `assessment.close_trimester` | `term-closing/view` (READ); `term-closing/edit` (WRITE; conjunção) | M06/M07 |
| `assessment.reopen_trimester` | `term-closing/edit` (WRITE; conjunção) | M06/M07 |
| `assessment.publish_report` | Sem projecção administrativa actual; preservar dependência/posse | M06/M07 |
| `assessment.manage_calendar` | Sem projecção administrativa actual; preservar dependência/posse | M06/M07 |
| `assessment.view_all_classes` | `grades/view` (READ) | M06/M07 |
| `assessment.decide_behaviour` | Sem projecção administrativa actual; preservar dependência/posse | M06/M07 |
| `classbook.view_all_classes` | `attendance/view` (READ) | M08/M09 |
| `classbook.mark_attendance` | `attendance/edit` (WRITE; conjunção) | M08/M09 |
| `classbook.justify_absences` | `attendance/edit` (WRITE; conjunção) | M08/M09 |
| `classbook.edit_summaries` | Sem projecção administrativa actual; preservar dependência/posse | M08/M09 |
| `classbook.close_period` | `attendance/edit` (WRITE; conjunção) | M08/M09 |
| `classbook.manage_plan` | Sem projecção administrativa actual; preservar dependência/posse | M08/M09 |
| `classbook.approve_plan` | Sem projecção administrativa actual; preservar dependência/posse | M08/M09 |
| `classbook.share_materials` | Sem projecção administrativa actual; preservar dependência/posse | M08/M09 |
| `extracurricular.manage_activities` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `extracurricular.manage_enrolments` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `extracurricular.mark_attendance` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `extracurricular.record_assessments` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `extracurricular.view_all` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `extracurricular.manage_fees` | Sem projecção administrativa actual; preservar dependência/posse | M11 |
| `scheduling.view_all` | `scheduling/view` (READ) | M05 |
| `scheduling.swap_lessons` | Sem projecção administrativa actual; preservar dependência/posse | M05 |
| `scheduling.edit_timetable` | `scheduling/create` (WRITE); `scheduling/edit` (WRITE) | M05 |
| `scheduling.edit_period_structure` | Sem projecção administrativa actual; preservar dependência/posse | M05 |
| `scheduling.view_own_timetable` | Sem projecção administrativa actual; preservar dependência/posse | M05 |
| `academic.manage_students` | `students/view` (READ); `students/create` (WRITE); `enrollments/view` (READ); `enrollments/create` (WRITE) | M02/M04 |
| `academic.manage_teachers` | `school-staff/view` (READ); `school-staff/create` (WRITE); `school-staff/edit` (WRITE); `teaching-staff/view` (READ); `teaching-staff/create` (WRITE; conjunção) | M02/M04 |
| `academic.manage_structure` | `academic-structure/view` (READ); `academic-structure/create` (WRITE); `teaching-staff/create` (WRITE; conjunção); `assessment-schemes/view` (READ); `assessment-schemes/create` (WRITE) | M02/M04 |
| `academic.issue_certificates` | Sem projecção administrativa actual; preservar dependência/posse | M02/M04 |
| `academic.issue_report_cards` | `report-cards/view` (READ) | M02/M04 |
| `academic.view_own_record` | Sem projecção administrativa actual; preservar dependência/posse | M02/M04 |
| `academic.year_rollover` | Sem projecção administrativa actual; preservar dependência/posse | M02/M04 |
| `finance.manage_fees` | `finance/create` (WRITE; conjunção) | M10/M15 |
| `finance.manage_discounts` | Sem projecção administrativa actual; preservar dependência/posse | M10/M15 |
| `finance.record_payment` | `finance/create` (WRITE; conjunção); `finance/edit` (WRITE; conjunção) | M10/M15 |
| `finance.void_payment` | `finance/edit` (WRITE; conjunção) | M10/M15 |
| `finance.view_ledger` | `finance/view` (READ) | M10/M15 |
| `finance.view_own_ledger` | Sem projecção administrativa actual; preservar dependência/posse | M10/M15 |
| `finance.override_block` | Sem projecção administrativa actual; preservar dependência/posse | M10/M15 |
| `communication.publish_school_notice` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `communication.send_class_message` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `communication.broadcast_everyone` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `communication.message_staff` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `communication.contact_school` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `communication.read_all_threads` | Sem projecção administrativa actual; preservar dependência/posse | M14 |
| `portaria.register_access` | Sem projecção administrativa actual; preservar dependência/posse | M12/M13 |
| `portaria.view_access_log` | Sem projecção administrativa actual; preservar dependência/posse | M12/M13 |
| `portaria.issue_cards` | Sem projecção administrativa actual; preservar dependência/posse | M12/M13 |
| `portaria.manage_devices` | Sem projecção administrativa actual; preservar dependência/posse | M12/M13 |
| `admin.manage_users` | `users/view` (READ); `users/create` (WRITE); `users/edit` (WRITE) | M01 |
| `admin.manage_roles` | Sem projecção administrativa actual; preservar dependência/posse | M01 |
| `admin.override_user_permissions` | Sem projecção administrativa actual; preservar dependência/posse | M01 |
| `admin.view_audit_log` | Sem projecção administrativa actual; preservar dependência/posse | M01 |

As regras tipadas e os testes são a fonte executável em src/features/identity/domain/system-role-catalog.ts. Não se instala nem copia qualquer identidade ou dado escolar da origem.

## Correcção A56 — 2026-11-01

A revisão de consumidores em 2.7 encontrou duas projecções sem guard administrativo efectivo: grades/view e enrollments/view. A lista de projecções novas passa de 28 para 26. Os IDs/grants históricos permanecem guardados e uma repetição da instalação não os altera; não são prova de funcionalidades integradas. A grelha identifica os valores sem consumidor como pendentes e não permite novas concessões. Integrações futuras exigem nova decisão de compatibilidade antes de activar valores antigos. As excepções administrativas só configuram as 26 acções com guard actual; não se afirma paridade dos módulos dependentes.
