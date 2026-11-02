/** Declarative scope anchors. Schema relations supply the actual foreign-key paths. */
export const SCHOOL_ANCHORS: Record<string, string> = {
  StudentGuardian: "student", TeachingGroupMember: "teachingGroup", AssessmentComponent: "scheme",
  AttendanceRecord: "session", InvoiceLine: "invoice", RolePermission: "role", MembershipPermissionRole: "membership", MembershipPermissionOverride: "membership",
};
export const YEAR_ANCHORS: Record<string, string> = {
  CurriculumSubject: "studyPath", TeachingGroupMember: "teachingGroup", AssessmentComponent: "scheme",
  Assessment: "teachingGroup", Grade: "assessment", TermResult: "enrollment",
  AttendanceSession: "teachingGroup", AttendanceRecord: "session", FeeItem: "feeSchedule",
  Invoice: "enrollment", InvoiceLine: "invoice", Payment: "invoice", StudentCard: "enrollment",
};
export interface Relation { target: string; field: string; reference: string; many: boolean; }
export interface Model { fields: string[]; relations: Record<string, Relation>; }
export function parseModels(schema: string): Record<string, Model> {
  const models: Record<string, Model> = {};
  for (const match of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const model: Model = { fields: [], relations: {} };
    for (const line of match[2].split("\n")) {
      const field = /^\s+(\w+)\s+(\w+)(\[\])?\??(?:\s|$)/.exec(line);
      if (!field) continue;
      model.fields.push(field[1]);
      model.relations[field[1]] = { target: field[2], field: "", reference: "id", many: !!field[3] };
      const foreignKey = /@relation\([^\n]*fields: \[(\w+)\], references: \[(\w+)\]/.exec(line);
      if (foreignKey) { model.relations[field[1]].field = foreignKey[1]; model.relations[field[1]].reference = foreignKey[2]; }
    }
    models[match[1]] = model;
  }
  for (const model of Object.values(models)) {
    model.relations = Object.fromEntries(Object.entries(model.relations).filter(([, relation]) => models[relation.target]));
  }
  return models;
}
export function scopePath(models: Record<string, Model>, model: string, kind: "school" | "year"): string[] | null {
  if (kind === "school" && model === "School") return ["id"];
  if (kind === "year" && model === "AcademicYear") return ["id"];
  const direct = kind === "school" ? "schoolId" : "academicYearId";
  if (models[model].fields.includes(direct)) return [direct];
  const anchor = (kind === "school" ? SCHOOL_ANCHORS : YEAR_ANCHORS)[model];
  if (!anchor) return null;
  const relation = models[model].relations[anchor];
  if (!relation?.field) throw new Error(`Missing scope anchor: ${model}.${anchor}`);
  const parent = scopePath(models, relation.target, kind);
  if (!parent) throw new Error(`Unscoped anchor: ${model}.${anchor}`);
  return [anchor, ...parent];
}
const quote = (value: string) => `\`${value}\``;
function scopeExpression(models: Record<string, Model>, model: string, path: string[], row: string): string {
  if (path.length === 1) return `${row}.${quote(path[0])}`;
  const relation = models[model].relations[path[0]];
  const alias = `p${path.length}`;
  return `(SELECT ${scopeExpression(models, relation.target, path.slice(1), alias)} FROM ${quote(relation.target)} ${alias} WHERE ${alias}.${quote(relation.reference)} = ${row}.${quote(relation.field)})`;
}
export function buildIntegrity(schema: string) {
  const models = parseModels(schema);
  const metadata = Object.fromEntries(Object.entries(models).map(([name, model]) => [name, {
    schoolPath: scopePath(models, name, "school"), relations: model.relations,
  }]));
  const rules: Array<{ model: string; field: string; condition: (row: string) => string }> = [];
  const immutable: Record<string, string[]> = {};
  for (const [name, model] of Object.entries(models)) {
    const schoolPath = scopePath(models, name, "school");
    if (!schoolPath) continue;
    const yearPath = scopePath(models, name, "year");
    const anchors = [schoolPath, yearPath].filter((value): value is string[] => !!value).map((path) => path.length === 1 ? path[0] : model.relations[path[0]].field);
    immutable[name] = [...new Set([...(model.fields.includes("id") ? ["id"] : []), ...anchors])];
    for (const [field, relation] of Object.entries(model.relations)) {
      if (!relation.field || relation.target === "School") continue;
      for (const kind of ["school", "year"] as const) {
        const own = kind === "school" ? schoolPath : yearPath;
        const target = scopePath(models, relation.target, kind);
        if (!own || !target) continue;
        rules.push({ model: name, field: `${field}.${kind}`, condition: (row) => {
          const expected = scopeExpression(models, name, own, row);
          const actual = scopeExpression(models, name, [field, ...target], row);
          return `${row}.${quote(relation.field)} IS NOT NULL AND NOT (${actual} <=> ${expected})`;
        } });
      }
    }
  }
  if (models.Staff) rules.push({ model: "Staff", field: "user.school", condition: row => `${row}.\`userId\` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \`Membership\` m WHERE m.\`userId\` = ${row}.\`userId\` AND m.\`schoolId\` = ${row}.\`schoolId\`)` });
  // Documents cannot name a different pupil's enrollment from the same school.
  rules.push({ model: "IssuedDocument", field: "enrollment.student", condition: row => `${row}.\`enrollmentId\` IS NOT NULL AND NOT ((SELECT e.\`studentId\` FROM \`Enrollment\` e WHERE e.\`id\` = ${row}.\`enrollmentId\`) <=> ${row}.\`studentId\`)` });
  const signal = (message: string) => `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '${message}';`;
  const statements: string[] = [];
  // Preflight is read-only. Failing on history stops deployment before creating guards.
  statements.push("CREATE PROCEDURE `edumoz_integrity_preflight`()\nBEGIN\n" + rules.map(rule => `  IF EXISTS (SELECT 1 FROM ${quote(rule.model)} r WHERE ${rule.condition("r")}) THEN\n    ${signal(`TENANT_INTEGRITY history ${rule.model}.${rule.field}`)}\n  END IF;`).join("\n") + "\nEND");
  statements.push("CALL `edumoz_integrity_preflight`()", "DROP PROCEDURE `edumoz_integrity_preflight`");
  for (const [name, fields] of Object.entries(immutable)) {
    for (const event of ["INSERT", "UPDATE"]) {
      const checks = rules.filter(rule => rule.model === name).map(rule => `  IF ${rule.condition("NEW")} THEN\n    ${signal(`TENANT_INTEGRITY ${name}.${rule.field}`)}\n  END IF;`);
      if (event === "UPDATE") checks.unshift(...fields.map(field => `  IF NOT (NEW.${quote(field)} <=> OLD.${quote(field)}) THEN\n    ${signal(`TENANT_INTEGRITY immutable ${name}.${field}`)}\n  END IF;`));
      if (!checks.length) continue;
      statements.push(`CREATE TRIGGER ${quote(`tenant_${name}_${event.toLowerCase()}`)} BEFORE ${event} ON ${quote(name)} FOR EACH ROW\nBEGIN\n${checks.join("\n")}\nEND`);
    }
  }
  return { metadata, immutable, rules, statements,
    sql: "-- Generated by scripts/generate-tenant-integrity.ts; do not edit by hand.\n-- Scope anchors are immutable; existing foreign keys retain existence/delete checks.\n-- No scope race: neither a primary key nor any scope-defining link can change.\n\n" + statements.map(statement => statement + ";").join("\n\n") + "\n" };
}
