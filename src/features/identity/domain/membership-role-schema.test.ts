import { expect, it } from "vitest";
import { MAX_MEMBERSHIP_PERMISSION_ROLES, membershipRoleChangeSchema, membershipRoleOptionsSchema } from "./membership-role-schema";
const role = { id: "role", revision: "2026-10-31T08:00:00.000Z" };
const input = { membershipId: "member", expectedSchoolId: "a", revision: "a".repeat(64), mode: "configured", roles: [role] };
it("accepts explicit empty restrictions and an explicit legacy reset as distinct intentions", () => {
  expect(membershipRoleChangeSchema.parse({ ...input, roles: [] }).mode).toBe("configured");
  expect(membershipRoleChangeSchema.parse({ ...input, roles: [], mode: "legacy" }).mode).toBe("legacy");
});
it("rejects duplicates, oversized selections, stale-shaped revisions and ambiguous resets", () => {
  for (const value of [
    { ...input, roles: [role, role] },
    { ...input, roles: Array.from({ length: MAX_MEMBERSHIP_PERMISSION_ROLES + 1 }, (_, index) => ({ ...role, id: String(index) })) },
    { ...input, revision: "not-a-revision" },
    { ...input, mode: "legacy" },
    { ...input, roles: [{ ...role, revision: "yesterday" }] },
    { ...input, expectedSchoolId: "" },
  ]) expect(membershipRoleChangeSchema.safeParse(value).success).toBe(false);
});
it("bounds role search and pagination without silently truncating submitted grants", () => {
  expect(membershipRoleOptionsSchema.parse({ expectedSchoolId: "a" })).toEqual({ expectedSchoolId: "a", query: "", page: 1 });
  expect(membershipRoleOptionsSchema.safeParse({ expectedSchoolId: "a", page: 0 }).success).toBe(false);
  expect(membershipRoleOptionsSchema.safeParse({ expectedSchoolId: "a", query: "x".repeat(121) }).success).toBe(false);
});
