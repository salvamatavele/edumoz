import { describe, expect, it } from "vitest";
import { CONSUMED_PERMISSION_CATALOG } from "./permission-catalog";
import { SYSTEM_CAPABILITY_DEPENDENCIES, SYSTEM_CAPABILITY_KEYS, SYSTEM_ROLE_DEFINITIONS, SYSTEM_ROLE_PROJECTIONS, projectSystemRolePermissions } from "./system-role-catalog";

describe("reviewed system role defaults", () => {
  it("keeps nine distinct ordered roles and all 55 capabilities with dependencies", () => {
    expect(SYSTEM_ROLE_DEFINITIONS).toHaveLength(9);
    expect(new Set(SYSTEM_ROLE_DEFINITIONS.map(role => role.key)).size).toBe(9);
    expect(SYSTEM_CAPABILITY_KEYS).toHaveLength(55);
    expect(new Set(SYSTEM_CAPABILITY_KEYS).size).toBe(55);
    expect(Object.keys(SYSTEM_CAPABILITY_DEPENDENCIES).sort()).toEqual([...SYSTEM_CAPABILITY_KEYS].sort());
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      for (const key of Object.keys(role.permissions)) expect(SYSTEM_CAPABILITY_KEYS).toContain(key);
    }
  });
  it("only projects catalogued consumers and never automatically grants future resources", () => {
    const catalog = new Set(CONSUMED_PERMISSION_CATALOG.map(entry => `${entry.resource}/${entry.action}`));
    const projected = SYSTEM_ROLE_PROJECTIONS.map(entry => `${entry.resource}/${entry.action}`);
    expect(new Set(projected).size).toBe(projected.length);
    for (const key of projected) expect(catalog.has(key)).toBe(true);
    expect(projected).not.toContain("students/delete");
    expect(projected).not.toContain("finance/delete");
    expect(projected).not.toContain("grades/view");
    expect(projected).not.toContain("enrollments/view");
    expect(projected).toHaveLength(26);
  });
  it("requires every source capability before granting a coarse write action", () => {
    const secretary = SYSTEM_ROLE_DEFINITIONS.find(role => role.key === "secretaria")!;
    const director = SYSTEM_ROLE_DEFINITIONS.find(role => role.key === "direcao")!;
    const headTeacher = SYSTEM_ROLE_DEFINITIONS.find(role => role.key === "diretor_turma")!;
    const grants = projectSystemRolePermissions(secretary);
    expect(grants).toContainEqual({ resource: "users", action: "view" });
    expect(grants).not.toContainEqual({ resource: "users", action: "create" });
    expect(grants).toContainEqual({ resource: "school-staff", action: "create" });
    expect(grants).toContainEqual({ resource: "finance", action: "view" });
    expect(grants).not.toContainEqual({ resource: "finance", action: "create" });
    expect(grants).not.toContainEqual({ resource: "finance", action: "edit" });
    expect(projectSystemRolePermissions(headTeacher)).not.toContainEqual({ resource: "term-closing", action: "edit" });
    expect(projectSystemRolePermissions(director)).toContainEqual({ resource: "term-closing", action: "edit" });
    expect(projectSystemRolePermissions(director)).toContainEqual({ resource: "finance", action: "create" });
  });
  it("does not turn own-record or gatehouse capabilities into global academic or financial access", () => {
    for (const key of ["aluno", "encarregado", "professor_extracurricular", "portaria"]) {
      expect(projectSystemRolePermissions(SYSTEM_ROLE_DEFINITIONS.find(role => role.key === key)!)).toEqual([]);
    }
  });
});
