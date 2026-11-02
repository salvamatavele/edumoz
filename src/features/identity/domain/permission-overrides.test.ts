import { describe, expect, it } from "vitest";
import { applyPermissionOverrides } from "./permission-overrides";
import { PERMISSION_CATALOG } from "./permission-catalog";
const students = { resource: "students", action: "view" } as const;
const users = { resource: "users", action: "edit" } as const;

describe("school permission overrides", () => {
  it("preserves inheritance when no exception exists and restores it after removing the exception", () => {
    expect(applyPermissionOverrides([students], [])).toEqual([students]);
    expect(applyPermissionOverrides([students], [{ ...students, allowed: false }])).toEqual([]);
    expect(applyPermissionOverrides([students], [])).toEqual([students]);
  });
  it("adds an explicit grant without changing other actions of the resource", () => {
    expect(applyPermissionOverrides([], [{ ...users, allowed: true }])).toEqual([users]);
  });
  it("applies a denial after the full inherited union, including the legacy full catalogue", () => {
    const result = applyPermissionOverrides(PERMISSION_CATALOG, [{ ...users, allowed: false }]);
    expect(result).toHaveLength(PERMISSION_CATALOG.length - 1);
    expect(result).not.toContainEqual(users);
    expect(result).toContainEqual(students);
  });
  it("gives denial precedence across associations regardless of row order", () => {
    for (const overrides of [[true, false], [false, true]]) {
      expect(applyPermissionOverrides([students], overrides.map(allowed => ({ ...students, allowed })))).toEqual([]);
    }
  });
  it("never introduces unknown resources or unsupported destructive account actions", () => {
    expect(applyPermissionOverrides([], [{ resource: "unknown", action: "view", allowed: true }, { resource: "users", action: "delete", allowed: true }])).toEqual([]);
  });
});
