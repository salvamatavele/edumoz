import { z } from "zod";

export const MAX_MEMBERSHIP_PERMISSION_ROLES = 20;
export const ROLE_OPTION_PAGE_SIZE = 20;
const identifier = z.string().trim().min(1).max(191);
export const membershipRoleTargetSchema = z.object({
  expectedSchoolId: identifier,
  membershipId: identifier,
});
export const membershipRoleChangeSchema = membershipRoleTargetSchema.extend({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  mode: z.enum(["configured", "legacy"]),
  roles: z.array(z.object({ id: identifier, revision: z.iso.datetime() })).max(MAX_MEMBERSHIP_PERMISSION_ROLES),
}).superRefine((value, context) => {
  if (new Set(value.roles.map(role => role.id)).size !== value.roles.length) context.addIssue({ code: "custom", path: ["roles"], message: "Duplicate role selection" });
  if (value.mode === "legacy" && value.roles.length) context.addIssue({ code: "custom", path: ["roles"], message: "Legacy access cannot contain profile assignments" });
});
export const membershipRoleOptionsSchema = z.object({
  expectedSchoolId: identifier,
  query: z.string().trim().max(120).default(""),
  page: z.number().int().min(1).max(10000).default(1),
});
export interface MembershipRoleOption {
  readonly id: string;
  readonly name: string;
  readonly revision: string;
  readonly isSystem: boolean;
  readonly permissionCount: number;
}
export interface MembershipRoleOptionsPage {
  readonly rows: readonly MembershipRoleOption[];
  readonly page: number;
  readonly total: number;
  readonly pageCount: number;
}
export interface MembershipRolePreview {
  readonly membershipId: string;
  readonly name: string;
  readonly baseRole: "SCHOOL_MANAGER" | "TEACHER";
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly accountState: "active" | "disabled" | "initial";
  readonly revision: string;
  readonly mode: "configured" | "legacy";
  readonly selectedRoles: readonly MembershipRoleOption[];
  readonly options: MembershipRoleOptionsPage;
  readonly hasOverrides?: boolean;
}
export type MembershipRoleChangeInput = z.infer<typeof membershipRoleChangeSchema>;
