import type { PermissionGrant } from "./access";
import { CONSUMED_PERMISSION_CATALOG, type PermissionAction, type PermissionResource } from "./permission-catalog";

// Reviewed source snapshot: role-catalogue.ts, inventory dated 2026-10-31.
// Definitions are defaults only; persisted school edits always take precedence.
export const SYSTEM_CAPABILITY_KEYS = [
  "assessment.record_grades",
  "assessment.edit_locked_grades",
  "assessment.close_trimester",
  "assessment.reopen_trimester",
  "assessment.publish_report",
  "assessment.manage_calendar",
  "assessment.view_all_classes",
  "assessment.decide_behaviour",
  "classbook.view_all_classes",
  "classbook.mark_attendance",
  "classbook.justify_absences",
  "classbook.edit_summaries",
  "classbook.close_period",
  "classbook.manage_plan",
  "classbook.approve_plan",
  "classbook.share_materials",
  "extracurricular.manage_activities",
  "extracurricular.manage_enrolments",
  "extracurricular.mark_attendance",
  "extracurricular.record_assessments",
  "extracurricular.view_all",
  "extracurricular.manage_fees",
  "scheduling.view_all",
  "scheduling.swap_lessons",
  "scheduling.edit_timetable",
  "scheduling.edit_period_structure",
  "scheduling.view_own_timetable",
  "academic.manage_students",
  "academic.manage_teachers",
  "academic.manage_structure",
  "academic.issue_certificates",
  "academic.issue_report_cards",
  "academic.view_own_record",
  "academic.year_rollover",
  "finance.manage_fees",
  "finance.manage_discounts",
  "finance.record_payment",
  "finance.void_payment",
  "finance.view_ledger",
  "finance.view_own_ledger",
  "finance.override_block",
  "communication.publish_school_notice",
  "communication.send_class_message",
  "communication.broadcast_everyone",
  "communication.message_staff",
  "communication.contact_school",
  "communication.read_all_threads",
  "portaria.register_access",
  "portaria.view_access_log",
  "portaria.issue_cards",
  "portaria.manage_devices",
  "admin.manage_users",
  "admin.manage_roles",
  "admin.override_user_permissions",
  "admin.view_audit_log"
] as const;

export type SystemCapabilityKey = (typeof SYSTEM_CAPABILITY_KEYS)[number];
export type SystemAccessLevel = "READ" | "WRITE";
export interface SystemRoleDefinition {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly permissions: Partial<Readonly<Record<SystemCapabilityKey, SystemAccessLevel>>>;
}

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    "key": "direcao",
    "label": "Direcção",
    "description": "Acesso de gestão a todos os módulos da escola.",
    "sortOrder": 10,
    "permissions": {
      "assessment.record_grades": "WRITE",
      "assessment.edit_locked_grades": "WRITE",
      "assessment.close_trimester": "WRITE",
      "assessment.reopen_trimester": "WRITE",
      "assessment.publish_report": "WRITE",
      "assessment.manage_calendar": "WRITE",
      "assessment.view_all_classes": "WRITE",
      "assessment.decide_behaviour": "WRITE",
      "classbook.view_all_classes": "WRITE",
      "classbook.mark_attendance": "WRITE",
      "classbook.justify_absences": "WRITE",
      "classbook.edit_summaries": "WRITE",
      "classbook.close_period": "WRITE",
      "classbook.manage_plan": "WRITE",
      "classbook.approve_plan": "WRITE",
      "classbook.share_materials": "WRITE",
      "extracurricular.manage_activities": "WRITE",
      "extracurricular.manage_enrolments": "WRITE",
      "extracurricular.mark_attendance": "WRITE",
      "extracurricular.record_assessments": "WRITE",
      "extracurricular.view_all": "WRITE",
      "extracurricular.manage_fees": "WRITE",
      "scheduling.view_all": "WRITE",
      "scheduling.swap_lessons": "WRITE",
      "scheduling.edit_timetable": "WRITE",
      "scheduling.edit_period_structure": "WRITE",
      "scheduling.view_own_timetable": "WRITE",
      "academic.manage_students": "WRITE",
      "academic.manage_teachers": "WRITE",
      "academic.manage_structure": "WRITE",
      "academic.issue_certificates": "WRITE",
      "academic.issue_report_cards": "WRITE",
      "academic.view_own_record": "WRITE",
      "academic.year_rollover": "WRITE",
      "finance.manage_fees": "WRITE",
      "finance.manage_discounts": "WRITE",
      "finance.record_payment": "WRITE",
      "finance.void_payment": "WRITE",
      "finance.view_ledger": "WRITE",
      "finance.view_own_ledger": "WRITE",
      "finance.override_block": "WRITE",
      "communication.publish_school_notice": "WRITE",
      "communication.send_class_message": "WRITE",
      "communication.broadcast_everyone": "WRITE",
      "communication.message_staff": "WRITE",
      "communication.contact_school": "WRITE",
      "communication.read_all_threads": "WRITE",
      "portaria.register_access": "WRITE",
      "portaria.view_access_log": "WRITE",
      "portaria.issue_cards": "WRITE",
      "portaria.manage_devices": "WRITE",
      "admin.manage_users": "WRITE",
      "admin.manage_roles": "WRITE",
      "admin.override_user_permissions": "WRITE",
      "admin.view_audit_log": "WRITE"
    }
  },
  {
    "key": "diretor_turma",
    "label": "Director de Turma",
    "description": "Professor com poderes acrescidos na sua turma: consolida pautas e monitoriza faltas e aproveitamento.",
    "sortOrder": 20,
    "permissions": {
      "assessment.record_grades": "WRITE",
      "assessment.close_trimester": "WRITE",
      "assessment.publish_report": "WRITE",
      "assessment.manage_calendar": "READ",
      "assessment.view_all_classes": "READ",
      "assessment.decide_behaviour": "WRITE",
      "classbook.view_all_classes": "WRITE",
      "classbook.mark_attendance": "WRITE",
      "classbook.justify_absences": "WRITE",
      "classbook.edit_summaries": "WRITE",
      "classbook.close_period": "WRITE",
      "classbook.manage_plan": "WRITE",
      "classbook.share_materials": "WRITE",
      "scheduling.view_all": "READ",
      "scheduling.view_own_timetable": "READ",
      "scheduling.swap_lessons": "WRITE",
      "academic.manage_students": "READ",
      "academic.issue_report_cards": "WRITE",
      "academic.issue_certificates": "READ",
      "communication.send_class_message": "WRITE",
      "communication.message_staff": "WRITE"
    }
  },
  {
    "key": "professor",
    "label": "Professor",
    "description": "Vê as suas turmas. Lança notas, marca faltas e regista sumários.",
    "sortOrder": 30,
    "permissions": {
      "assessment.record_grades": "WRITE",
      "assessment.view_all_classes": "READ",
      "classbook.mark_attendance": "WRITE",
      "classbook.edit_summaries": "WRITE",
      "classbook.manage_plan": "WRITE",
      "classbook.share_materials": "WRITE",
      "scheduling.view_all": "READ",
      "scheduling.view_own_timetable": "READ",
      "scheduling.swap_lessons": "READ",
      "academic.manage_students": "READ",
      "academic.issue_report_cards": "READ",
      "communication.send_class_message": "WRITE",
      "communication.message_staff": "WRITE"
    }
  },
  {
    "key": "secretaria",
    "label": "Secretaria",
    "description": "Cadastro de alunos e encarregados, matrículas e emissão de documentos.",
    "sortOrder": 40,
    "permissions": {
      "assessment.record_grades": "READ",
      "assessment.close_trimester": "READ",
      "assessment.publish_report": "WRITE",
      "assessment.view_all_classes": "WRITE",
      "classbook.view_all_classes": "WRITE",
      "classbook.mark_attendance": "READ",
      "classbook.justify_absences": "WRITE",
      "classbook.edit_summaries": "READ",
      "classbook.close_period": "WRITE",
      "classbook.manage_plan": "READ",
      "classbook.share_materials": "READ",
      "scheduling.view_all": "READ",
      "scheduling.swap_lessons": "WRITE",
      "scheduling.edit_timetable": "WRITE",
      "academic.manage_students": "WRITE",
      "academic.manage_teachers": "WRITE",
      "academic.manage_structure": "WRITE",
      "academic.issue_certificates": "WRITE",
      "academic.issue_report_cards": "WRITE",
      "academic.view_own_record": "READ",
      "finance.record_payment": "WRITE",
      "finance.view_ledger": "READ",
      "finance.manage_fees": "READ",
      "finance.manage_discounts": "READ",
      "communication.publish_school_notice": "WRITE",
      "communication.send_class_message": "WRITE",
      "portaria.view_access_log": "READ",
      "portaria.issue_cards": "WRITE",
      "admin.manage_users": "READ"
    }
  },
  {
    "key": "aluno",
    "label": "Aluno",
    "description": "Vê o seu horário, as suas notas e a sua situação escolar.",
    "sortOrder": 50,
    "permissions": {
      "academic.view_own_record": "READ"
    }
  },
  {
    "key": "encarregado",
    "label": "Encarregado de Educação",
    "description": "Vê o horário, as notas e as faltas do seu educando.",
    "sortOrder": 60,
    "permissions": {
      "finance.view_own_ledger": "READ",
      "academic.view_own_record": "READ",
      "communication.contact_school": "WRITE"
    }
  },
  {
    "key": "coordenador_extracurricular",
    "label": "Coordenador das Extracurriculares",
    "description": "Gere as actividades, as turmas, as matrículas e a caixa das extracurriculares. Não toca no percurso académico.",
    "sortOrder": 65,
    "permissions": {
      "extracurricular.manage_activities": "WRITE",
      "extracurricular.manage_enrolments": "WRITE",
      "extracurricular.mark_attendance": "WRITE",
      "extracurricular.record_assessments": "WRITE",
      "extracurricular.view_all": "WRITE",
      "extracurricular.manage_fees": "WRITE",
      "academic.manage_students": "READ"
    }
  },
  {
    "key": "professor_extracurricular",
    "label": "Professor de Actividade",
    "description": "Dá uma actividade extracurricular. Vê só as suas turmas: regista as aulas, as presenças e as avaliações delas.",
    "sortOrder": 66,
    "permissions": {
      "extracurricular.mark_attendance": "WRITE",
      "extracurricular.record_assessments": "WRITE",
      "extracurricular.manage_enrolments": "READ",
      "extracurricular.manage_activities": "READ"
    }
  },
  {
    "key": "portaria",
    "label": "Portaria e Acessos",
    "description": "Controlo de entradas e presenças na portaria.",
    "sortOrder": 70,
    "permissions": {
      "portaria.register_access": "WRITE",
      "portaria.view_access_log": "READ"
    }
  }
] as const satisfies readonly SystemRoleDefinition[];

type Requirement = readonly [SystemCapabilityKey, SystemAccessLevel];
export interface SystemRoleProjection {
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
  readonly requirements: readonly Requirement[];
}
// Only existing consumers are projected. Aggregated actions require every capability.
export const SYSTEM_ROLE_PROJECTIONS: readonly SystemRoleProjection[] = [
  {"resource": "users", "action": "view", "requirements": [["admin.manage_users", "READ"]]},
  {"resource": "users", "action": "create", "requirements": [["admin.manage_users", "WRITE"]]},
  {"resource": "users", "action": "edit", "requirements": [["admin.manage_users", "WRITE"]]},
  {"resource": "school-staff", "action": "view", "requirements": [["academic.manage_teachers", "READ"]]},
  {"resource": "school-staff", "action": "create", "requirements": [["academic.manage_teachers", "WRITE"]]},
  {"resource": "school-staff", "action": "edit", "requirements": [["academic.manage_teachers", "WRITE"]]},
  {"resource": "students", "action": "view", "requirements": [["academic.manage_students", "READ"]]},
  {"resource": "students", "action": "create", "requirements": [["academic.manage_students", "WRITE"]]},
  {"resource": "enrollments", "action": "create", "requirements": [["academic.manage_students", "WRITE"]]},
  {"resource": "academic-structure", "action": "view", "requirements": [["academic.manage_structure", "READ"]]},
  {"resource": "academic-structure", "action": "create", "requirements": [["academic.manage_structure", "WRITE"]]},
  {"resource": "teaching-staff", "action": "view", "requirements": [["academic.manage_teachers", "READ"]]},
  {"resource": "teaching-staff", "action": "create", "requirements": [["academic.manage_teachers", "WRITE"], ["academic.manage_structure", "WRITE"]]},
  {"resource": "assessment-schemes", "action": "view", "requirements": [["academic.manage_structure", "READ"]]},
  {"resource": "assessment-schemes", "action": "create", "requirements": [["academic.manage_structure", "WRITE"]]},
  {"resource": "report-cards", "action": "view", "requirements": [["academic.issue_report_cards", "READ"]]},
  {"resource": "attendance", "action": "view", "requirements": [["classbook.view_all_classes", "READ"]]},
  {"resource": "attendance", "action": "edit", "requirements": [["classbook.close_period", "WRITE"], ["classbook.mark_attendance", "WRITE"], ["classbook.justify_absences", "WRITE"]]},
  {"resource": "term-closing", "action": "view", "requirements": [["assessment.close_trimester", "READ"]]},
  {"resource": "term-closing", "action": "edit", "requirements": [["assessment.close_trimester", "WRITE"], ["assessment.reopen_trimester", "WRITE"]]},
  {"resource": "scheduling", "action": "view", "requirements": [["scheduling.view_all", "READ"]]},
  {"resource": "scheduling", "action": "create", "requirements": [["scheduling.edit_timetable", "WRITE"]]},
  {"resource": "scheduling", "action": "edit", "requirements": [["scheduling.edit_timetable", "WRITE"]]},
  {"resource": "finance", "action": "view", "requirements": [["finance.view_ledger", "READ"]]},
  {"resource": "finance", "action": "create", "requirements": [["finance.manage_fees", "WRITE"], ["finance.record_payment", "WRITE"]]},
  {"resource": "finance", "action": "edit", "requirements": [["finance.record_payment", "WRITE"], ["finance.void_payment", "WRITE"]]}
];

export function projectSystemRolePermissions(definition: SystemRoleDefinition): PermissionGrant[] {
  const supported = new Set(CONSUMED_PERMISSION_CATALOG.map(entry => `${entry.resource}/${entry.action}`));
  return SYSTEM_ROLE_PROJECTIONS.filter(rule => supported.has(`${rule.resource}/${rule.action}`) && rule.requirements.every(([key, minimum]) => {
    const actual = definition.permissions[key];
    return actual === "WRITE" || (actual === "READ" && minimum === "READ");
  })).map(({ resource, action }) => ({ resource, action }));
}

/** Dependencies remain explicit; a default is not proof that its consuming module exists. */
export const SYSTEM_CAPABILITY_DEPENDENCIES: Readonly<Record<SystemCapabilityKey, string>> = {
  "assessment.record_grades": "M06/M07",
  "assessment.edit_locked_grades": "M06/M07",
  "assessment.close_trimester": "M06/M07",
  "assessment.reopen_trimester": "M06/M07",
  "assessment.publish_report": "M06/M07",
  "assessment.manage_calendar": "M06/M07",
  "assessment.view_all_classes": "M06/M07",
  "assessment.decide_behaviour": "M06/M07",
  "classbook.view_all_classes": "M08/M09",
  "classbook.mark_attendance": "M08/M09",
  "classbook.justify_absences": "M08/M09",
  "classbook.edit_summaries": "M08/M09",
  "classbook.close_period": "M08/M09",
  "classbook.manage_plan": "M08/M09",
  "classbook.approve_plan": "M08/M09",
  "classbook.share_materials": "M08/M09",
  "extracurricular.manage_activities": "M11",
  "extracurricular.manage_enrolments": "M11",
  "extracurricular.mark_attendance": "M11",
  "extracurricular.record_assessments": "M11",
  "extracurricular.view_all": "M11",
  "extracurricular.manage_fees": "M11",
  "scheduling.view_all": "M05",
  "scheduling.swap_lessons": "M05",
  "scheduling.edit_timetable": "M05",
  "scheduling.edit_period_structure": "M05",
  "scheduling.view_own_timetable": "M05",
  "academic.manage_students": "M02/M04",
  "academic.manage_teachers": "M02/M04",
  "academic.manage_structure": "M02/M04",
  "academic.issue_certificates": "M02/M04",
  "academic.issue_report_cards": "M02/M04",
  "academic.view_own_record": "M02/M04",
  "academic.year_rollover": "M02/M04",
  "finance.manage_fees": "M10/M15",
  "finance.manage_discounts": "M10/M15",
  "finance.record_payment": "M10/M15",
  "finance.void_payment": "M10/M15",
  "finance.view_ledger": "M10/M15",
  "finance.view_own_ledger": "M10/M15",
  "finance.override_block": "M10/M15",
  "communication.publish_school_notice": "M14",
  "communication.send_class_message": "M14",
  "communication.broadcast_everyone": "M14",
  "communication.message_staff": "M14",
  "communication.contact_school": "M14",
  "communication.read_all_threads": "M14",
  "portaria.register_access": "M12/M13",
  "portaria.view_access_log": "M12/M13",
  "portaria.issue_cards": "M12/M13",
  "portaria.manage_devices": "M12/M13",
  "admin.manage_users": "M01",
  "admin.manage_roles": "M01",
  "admin.override_user_permissions": "M01",
  "admin.view_audit_log": "M01",
};
