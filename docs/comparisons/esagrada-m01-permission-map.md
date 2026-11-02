# Correspondência inicial do catálogo de permissões da origem

55 chaves extraídas da working tree; nenhuma concessão automática. Esta tabela associa âmbito, não declara equivalência de guards nem implementação. A correspondência recurso/acção exacta é validada na fatia consumidora antes de migrar papéis.

| Chave da origem | Âmbito no destino | Estado |
|---|---|---|
| `assessment.record_grades` | M06/M07 | Especificação; guard não migrado |
| `assessment.edit_locked_grades` | M06/M07 | Especificação; guard não migrado |
| `assessment.close_trimester` | M06/M07 | Especificação; guard não migrado |
| `assessment.reopen_trimester` | M06/M07 | Especificação; guard não migrado |
| `assessment.publish_report` | M06/M07 | Especificação; guard não migrado |
| `assessment.manage_calendar` | M06/M07 | Especificação; guard não migrado |
| `assessment.view_all_classes` | M06/M07 | Especificação; guard não migrado |
| `assessment.decide_behaviour` | M06/M07 | Especificação; guard não migrado |
| `classbook.mark_attendance` | M08/M09 | Especificação; guard não migrado |
| `classbook.justify_absences` | M08/M09 | Especificação; guard não migrado |
| `classbook.edit_summaries` | M08/M09 | Especificação; guard não migrado |
| `classbook.close_period` | M08/M09 | Especificação; guard não migrado |
| `classbook.manage_plan` | M08/M09 | Especificação; guard não migrado |
| `classbook.view_all_classes` | M08/M09 | Especificação; guard não migrado |
| `classbook.approve_plan` | M08/M09 | Especificação; guard não migrado |
| `classbook.share_materials` | M08/M09 | Especificação; guard não migrado |
| `scheduling.view_all` | M05 | Especificação; guard não migrado |
| `scheduling.view_own_timetable` | M05 | Especificação; guard não migrado |
| `scheduling.swap_lessons` | M05 | Especificação; guard não migrado |
| `scheduling.edit_timetable` | M05 | Especificação; guard não migrado |
| `scheduling.edit_period_structure` | M05 | Especificação; guard não migrado |
| `academic.manage_students` | M02/M04 | Especificação; guard não migrado |
| `academic.manage_teachers` | M02/M04 | Especificação; guard não migrado |
| `academic.manage_structure` | M02/M04 | Especificação; guard não migrado |
| `academic.issue_certificates` | M02/M04 | Especificação; guard não migrado |
| `academic.issue_report_cards` | M02/M04 | Especificação; guard não migrado |
| `academic.view_own_record` | M02/M04 | Especificação; guard não migrado |
| `academic.year_rollover` | M02/M04 | Especificação; guard não migrado |
| `communication.publish_school_notice` | M14 | Especificação; guard não migrado |
| `communication.send_class_message` | M14 | Especificação; guard não migrado |
| `communication.broadcast_everyone` | M14 | Especificação; guard não migrado |
| `communication.message_staff` | M14 | Especificação; guard não migrado |
| `communication.contact_school` | M14 | Especificação; guard não migrado |
| `communication.read_all_threads` | M14 | Especificação; guard não migrado |
| `finance.manage_fees` | M10/M15 | Especificação; guard não migrado |
| `finance.manage_discounts` | M10/M15 | Especificação; guard não migrado |
| `finance.record_payment` | M10/M15 | Especificação; guard não migrado |
| `finance.void_payment` | M10/M15 | Especificação; guard não migrado |
| `finance.view_ledger` | M10/M15 | Especificação; guard não migrado |
| `finance.view_own_ledger` | M01-HOME / M15 — finanças próprias; posse e concessão escolar | Especificação; guard não migrado |
| `finance.override_block` | M10/M15 | Especificação; guard não migrado |
| `portaria.register_access` | M12/M13 | Especificação; guard não migrado |
| `portaria.view_access_log` | M12/M13 | Especificação; guard não migrado |
| `portaria.issue_cards` | M12/M13 | Especificação; guard não migrado |
| `portaria.manage_devices` | M12/M13 | Especificação; guard não migrado |
| `admin.manage_users` | M01-USERS / M01-CREDENTIALS | Especificação; guard não migrado |
| `admin.manage_roles` | M01-ROLES | Especificação; guard não migrado |
| `admin.override_user_permissions` | M01-OVERRIDES | Especificação; guard não migrado |
| `admin.view_audit_log` | M01-AUDIT | Especificação; guard não migrado |
| `extracurricular.manage_activities` | M11 | Especificação; guard não migrado |
| `extracurricular.manage_enrolments` | M11 | Especificação; guard não migrado |
| `extracurricular.mark_attendance` | M11 | Especificação; guard não migrado |
| `extracurricular.record_assessments` | M11 | Especificação; guard não migrado |
| `extracurricular.view_all` | M11 | Especificação; guard não migrado |
| `extracurricular.manage_fees` | M11 | Especificação; guard não migrado |


## Guards consumidos nesta subentrega — 2026-10-29

admin.manage_users tem correspondência parcial: users/view para consulta, users/create para conta nova/reemissão inicial e users/edit para activação/suspensão local. Cada acção tem guard efectivo e migração sem grants automáticos. Eliminação global da origem não é transportada; retirada local/edição completa/convite ainda pendentes. Isto não fecha a equivalência da chave inteira nem a migração dos nove perfis.
