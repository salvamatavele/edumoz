import { describe, expect, it } from "vitest";

import type { Role } from "@/types";

import {
  hasMembershipIn,
  hasPermission,
  isFamilyRole,
  isSchoolAdministrator,
  isUnrestrictedSchoolAdministrator,
  isStaffRole,
  rankOf,
  resolveActiveSchool,
  roleIn,
  type SchoolMembership,
  type SessionContext,
} from "./access";

const ROLE: Record<string, Role> = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  SCHOOL_MANAGER: "SCHOOL_MANAGER",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  GUARDIAN: "GUARDIAN",
};

const schoolA: SchoolMembership = {
  schoolId: "school-a",
  schoolName: "Escola A",
  role: ROLE.SCHOOL_MANAGER,
};
const schoolB: SchoolMembership = {
  schoolId: "school-b",
  schoolName: "Escola B",
  role: ROLE.TEACHER,
};

function context(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    userId: "user-1",
    isPlatformAdmin: false,
    schoolId: schoolA.schoolId,
    role: schoolA.role,
    memberships: [schoolA, schoolB],
    ...overrides,
  };
}

describe("resolveActiveSchool", () => {
  it("troca para uma escola presente nas Membership", () => {
    expect(resolveActiveSchool([schoolA, schoolB], schoolB.schoolId, schoolA.schoolId)).toBe(
      schoolB.schoolId,
    );
  });

  it("mantém a escola actual quando a pedida não consta das Membership", () => {
    expect(
      resolveActiveSchool([schoolA], "school-alheia", schoolA.schoolId),
    ).toBe(schoolA.schoolId);
  });

  it("devolve null quando não há escola actual nem escola pedida válida", () => {
    expect(resolveActiveSchool([schoolA], "school-alheia", null)).toBeNull();
  });

  it("um administrador da plataforma pode trocar para qualquer escola, mesmo sem Membership", () => {
    expect(resolveActiveSchool([], "escola-qualquer", null, true)).toBe("escola-qualquer");
    expect(resolveActiveSchool([schoolA], "school-alheia", schoolA.schoolId, true)).toBe(
      "school-alheia",
    );
  });
});

describe("isSchoolAdministrator", () => {
  it("é verdadeiro para um administrador da plataforma, seja qual for o papel na escola", () => {
    expect(
      isSchoolAdministrator(context({ isPlatformAdmin: true, role: null })),
    ).toBe(true);
  });

  it("é verdadeiro para um gestor da escola activa", () => {
    expect(isSchoolAdministrator(context({ role: ROLE.SCHOOL_MANAGER }))).toBe(true);
  });

  it("é falso para um professor", () => {
    expect(isSchoolAdministrator(context({ role: ROLE.TEACHER }))).toBe(false);
  });
});

describe("roleIn / hasMembershipIn", () => {
  it("devolve o papel da Membership correspondente à escola", () => {
    expect(roleIn(context(), schoolB.schoolId)).toBe(schoolB.role);
  });

  it("devolve null para uma escola sem Membership", () => {
    expect(roleIn(context({ memberships: [schoolA] }), schoolB.schoolId)).toBeNull();
  });

  it("hasMembershipIn segue as mesmas Membership", () => {
    expect(hasMembershipIn(context(), schoolB.schoolId)).toBe(true);
    expect(hasMembershipIn(context({ memberships: [schoolA] }), schoolB.schoolId)).toBe(false);
  });
});

describe("isFamilyRole / isStaffRole", () => {
  it("aluno e encarregado são papéis de família", () => {
    expect(isFamilyRole(ROLE.STUDENT)).toBe(true);
    expect(isFamilyRole(ROLE.GUARDIAN)).toBe(true);
  });

  it("gestor, professor e admin da plataforma não são papéis de família", () => {
    expect(isFamilyRole(ROLE.SCHOOL_MANAGER)).toBe(false);
    expect(isFamilyRole(ROLE.TEACHER)).toBe(false);
    expect(isFamilyRole(ROLE.PLATFORM_ADMIN)).toBe(false);
  });

  it("isStaffRole é o complemento exacto de isFamilyRole para os cinco papéis", () => {
    for (const role of Object.values(ROLE)) {
      expect(isStaffRole(role)).toBe(!isFamilyRole(role));
    }
  });
});

describe("hasPermission", () => {
  it("é sempre verdadeiro para um administrador da plataforma", () => {
    expect(
      hasPermission(
        context({ isPlatformAdmin: true, role: null, permissionRoleId: "role-1", permissions: [] }),
        "students",
        "delete",
      ),
    ).toBe(true);
  });

  it("é sempre falso para quem não é gestor da escola activa", () => {
    expect(hasPermission(context({ role: ROLE.TEACHER }), "students", "view")).toBe(false);
  });

  it("é sempre verdadeiro para um gestor sem papel configurável atribuído", () => {
    expect(
      hasPermission(context({ role: ROLE.SCHOOL_MANAGER, permissionRoleId: null }), "students", "delete"),
    ).toBe(true);
  });

  it("com papel atribuído, só as permissões marcadas concedem acesso", () => {
    const restricted = context({
      role: ROLE.SCHOOL_MANAGER,
      permissionRoleId: "role-1",
      permissions: [{ resource: "students", action: "view" }],
    });

    expect(hasPermission(restricted, "students", "view")).toBe(true);
    expect(hasPermission(restricted, "students", "delete")).toBe(false);
    expect(hasPermission(restricted, "grades", "view")).toBe(false);
  });

  it("um papel atribuído sem nenhuma permissão marcada nega tudo", () => {
    const empty = context({ role: ROLE.SCHOOL_MANAGER, permissionRoleId: "role-1", permissions: [] });

    expect(hasPermission(empty, "students", "view")).toBe(false);
  });
});

describe("rankOf", () => {
  it("ordena os papéis por hierarquia de apresentação", () => {
    expect(rankOf(ROLE.PLATFORM_ADMIN)).toBeGreaterThan(rankOf(ROLE.SCHOOL_MANAGER));
    expect(rankOf(ROLE.SCHOOL_MANAGER)).toBeGreaterThan(rankOf(ROLE.TEACHER));
    expect(rankOf(ROLE.TEACHER)).toBeGreaterThan(rankOf(ROLE.GUARDIAN));
    expect(rankOf(ROLE.GUARDIAN)).toBeGreaterThan(rankOf(ROLE.STUDENT));
  });
});

describe("role administration eligibility", () => {
  const context: SessionContext = { userId: "holder", schoolId: "school-a", role: "SCHOOL_MANAGER", memberships: [], isPlatformAdmin: false };
  it("requires a scoped holder and refuses restricted managers despite arbitrary grants", () => {
    expect(isUnrestrictedSchoolAdministrator(context)).toBe(true);
    expect(isUnrestrictedSchoolAdministrator({ ...context, permissionRoleId: "reader", permissions: [{ resource: "users", action: "create" }] })).toBe(false);
    expect(isUnrestrictedSchoolAdministrator({ ...context, schoolId: null })).toBe(false);
    expect(isUnrestrictedSchoolAdministrator({ ...context, userId: "" })).toBe(false);
    expect(isUnrestrictedSchoolAdministrator({ ...context, role: "TEACHER" })).toBe(false);
    expect(isUnrestrictedSchoolAdministrator({ ...context, role: null, isPlatformAdmin: true })).toBe(true);
  });
});

it("does not restore full access when explicit restrictions have no legacy bridge", () => {
  const restricted = context({ role: ROLE.SCHOOL_MANAGER, permissionRoleId: null, permissionsConfigured: true, permissions: [] });
  expect(hasPermission(restricted, "students", "view")).toBe(false);
  expect(isUnrestrictedSchoolAdministrator(restricted)).toBe(false);
  expect(hasPermission({ ...restricted, permissions: [{ resource: "students", action: "view" }] }, "students", "view")).toBe(true);
});
it("allows explicit administrative teacher grants without making a family role or teacher unrestricted", () => {
  const granted = context({ role: ROLE.TEACHER, permissionsConfigured: true, permissions: [{ resource: "students", action: "view" }] });
  expect(hasPermission(granted, "students", "view")).toBe(true);
  expect(hasPermission(granted, "students", "edit")).toBe(false);
  expect(isUnrestrictedSchoolAdministrator(granted)).toBe(false);
  expect(hasPermission({ ...granted, role: ROLE.GUARDIAN }, "students", "view")).toBe(false);
});
