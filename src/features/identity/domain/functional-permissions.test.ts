import { describe, expect, it } from "vitest";
import { hasActiveSchoolPermissionOverrides, hasLegacyFullProfileAccess, isLegacyUnrestrictedAssociation, resolveFunctionalSchoolPermissions, type FunctionalAssociation } from "./functional-permissions";
const role = (schoolId: string, grants: string[]) => ({ schoolId, permissions: grants.map(grant => { const [resource, action] = grant.split("/"); return { permission: { resource, action } }; }) });
const association = (extra: Partial<FunctionalAssociation> = {}): FunctionalAssociation => ({ schoolId: "a", role: "SCHOOL_MANAGER", status: "ACTIVE", permissionsConfigured: false, permissionRoleId: null, assignedRoles: [], ...extra });

describe("functional school permissions", () => {
  it("distinguishes legacy full access from explicit empty restrictions and malformed links", () => {
    expect(isLegacyUnrestrictedAssociation(association())).toBe(true);
    expect(isLegacyUnrestrictedAssociation(association({ permissionsConfigured: true }))).toBe(false);
    expect(isLegacyUnrestrictedAssociation(association({ permissionRoleId: "legacy" }))).toBe(false);
    expect(isLegacyUnrestrictedAssociation(association({ assignedRoles: [{ permissionRole: role("a", []) }] }))).toBe(false);
    expect(isLegacyUnrestrictedAssociation(association({ role: "TEACHER" }))).toBe(false);
  });
  it("unions multiple profiles and deduplicates the legacy bridge without inventing grants", () => {
    const bridge = role("a", ["students/view"]);
    expect(resolveFunctionalSchoolPermissions([association({ permissionsConfigured: true, permissionRoleId: "old", permissionRole: bridge, assignedRoles: [{ permissionRole: bridge }, { permissionRole: role("a", ["users/view", "students/view"]) }] })], "a"))
      .toEqual([{ resource: "users", action: "view" }, { resource: "students", action: "view" }]);
  });
  it("does not activate a legacy bridge that a teacher or family association never consumed", () => {
    for (const baseRole of ["TEACHER", "GUARDIAN", "STUDENT"]) {
      expect(resolveFunctionalSchoolPermissions([association({ role: baseRole, permissionRoleId: "old", permissionRole: role("a", ["users/view"]) })], "a")).toEqual([]);
    }
  });
  it("accepts explicit teacher grants without converting family roles or inactive associations", () => {
    const assignedRoles = [{ permissionRole: role("a", ["students/view"]) }];
    expect(resolveFunctionalSchoolPermissions([association({ role: "TEACHER", permissionsConfigured: true, assignedRoles })], "a")).toEqual([{ resource: "students", action: "view" }]);
    for (const extra of [{ role: "GUARDIAN" }, { status: "REMOVED" }, { status: "SUSPENDED" }, { schoolId: "b" }, { permissionsConfigured: false }]) {
      expect(resolveFunctionalSchoolPermissions([association({ role: "TEACHER", permissionsConfigured: true, assignedRoles, ...extra })], "a")).toEqual([]);
    }
  });
  it("ignores cross-school profiles, unknown resources and unsupported action combinations", () => {
    const sources = [association({ permissionsConfigured: true, assignedRoles: [{ permissionRole: role("b", ["users/edit"]) }, { permissionRole: role("a", ["unknown/view", "users/delete", "students/launch"]) }] })];
    expect(resolveFunctionalSchoolPermissions(sources, "a")).toEqual([]);
  });
  it("applies exceptions after the union and keeps denial across accumulated active associations", () => {
    const granted = association({ role: "TEACHER", permissionsConfigured: true, assignedRoles: [{ permissionRole: role("a", ["students/view"]) }] });
    const denied = association({ role: "TEACHER", permissionOverrides: [{ allowed: false, permission: { resource: "students", action: "view" } }] });
    expect(resolveFunctionalSchoolPermissions([granted, denied], "a")).toEqual([]);
    expect(hasActiveSchoolPermissionOverrides([granted, denied], "a")).toBe(true);
    expect(resolveFunctionalSchoolPermissions([granted, { ...denied, schoolId: "b" }], "a")).toEqual([{ resource: "students", action: "view" }]);
    for (const status of ["SUSPENDED", "REMOVED"]) expect(resolveFunctionalSchoolPermissions([granted, { ...denied, status }], "a")).toEqual([{ resource: "students", action: "view" }]);
  });
  it("separates legacy profile inheritance from unrestricted policy management", () => {
    const member = association({ permissionOverrides: [{ allowed: false, permission: { resource: "students", action: "view" } }] });
    expect(hasLegacyFullProfileAccess(member)).toBe(true);
    expect(isLegacyUnrestrictedAssociation(member)).toBe(false);
    const effective = resolveFunctionalSchoolPermissions([member], "a");
    expect(effective).not.toContainEqual({ resource: "students", action: "view" });
    expect(effective).toContainEqual({ resource: "finance", action: "edit" });
  });
  it("does not grant administrative exceptions through family associations", () => {
    const permissionOverrides = [{ allowed: true, permission: { resource: "users", action: "edit" } }];
    expect(resolveFunctionalSchoolPermissions([association({ role: "GUARDIAN", permissionOverrides })], "a")).toEqual([]);
    expect(hasActiveSchoolPermissionOverrides([association({ role: "STUDENT", permissionOverrides })], "a")).toBe(false);
  });
});
