import { describe, expect, it } from "vitest";

import { hasPermission, toSessionContext } from "./access";
import { canViewManagementRoute } from "./management-navigation";

const session = {
  user: { id: "manager" }, isPlatformAdmin: false, schoolId: "school-a", role: "SCHOOL_MANAGER" as const,
  memberships: [], permissionRoleId: "reader",
  permissions: [{ resource: "students" as const, action: "view" as const }],
};

describe("management authorization presentation", () => {
  it("preserves restrictions during session conversion", () => {
    const context = toSessionContext(session);
    expect(context.permissionRoleId).toBe("reader");
    expect(hasPermission(context, "students", "view")).toBe(true);
    expect(hasPermission(context, "students", "create")).toBe(false);
  });

  it("shows only routes with read permission and keeps role administration private", () => {
    const context = toSessionContext(session);
    expect(canViewManagementRoute(context, "/students")).toBe(true);
    for (const path of ["/users", "/finance", "/timetables", "/settings", "/unknown"]) {
      expect(canViewManagementRoute(context, path)).toBe(false);
    }
  });

  it("does not treat create permission as read permission", () => {
    const context = toSessionContext({ ...session, permissions: [{ resource: "students", action: "create" }] });
    expect(canViewManagementRoute(context, "/students")).toBe(false);
  });

  it("allows assessment navigation for term readers without granting scheme access", () => {
    const context = toSessionContext({ ...session, permissions: [{ resource: "term-closing", action: "view" }] });
    expect(canViewManagementRoute(context, "/assessment")).toBe(true);
    expect(hasPermission(context, "assessment-schemes", "view")).toBe(false);
  });

  it("does not show management routes without an active school", () => {
    expect(canViewManagementRoute(toSessionContext({ ...session, isPlatformAdmin: true, schoolId: null }), "/students")).toBe(false);
  });
});
