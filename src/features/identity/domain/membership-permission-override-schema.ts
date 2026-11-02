import { z } from "zod";
import { PERMISSION_CATALOG, type PermissionAction, type PermissionResource } from "./permission-catalog";
import { membershipRoleTargetSchema } from "./membership-role-schema";

export const membershipPermissionOverridesSchema = membershipRoleTargetSchema.extend({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  overrides: z.array(z.object({
    permissionId: z.string().trim().min(1).max(191),
    allowed: z.boolean(),
    reason: z.string().trim().max(300).default(""),
  })).max(PERMISSION_CATALOG.length),
}).superRefine((value, context) => {
  if (new Set(value.overrides.map(row => row.permissionId)).size !== value.overrides.length) context.addIssue({ code: "custom", path: ["overrides"], message: "Duplicate permission exception" });
});
export interface MembershipPermissionOverrideRow {
  readonly permissionId: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
  readonly inherited: boolean;
  readonly override: boolean | null;
  readonly reason: string;
  readonly effective: boolean;
  readonly otherDenial: boolean;
}
export interface MembershipPermissionOverridesPreview {
  readonly membershipId: string;
  readonly name: string;
  readonly baseRole: "SCHOOL_MANAGER" | "TEACHER";
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly accountState: "active" | "disabled" | "initial";
  readonly revision: string;
  readonly legacyProfile: boolean;
  readonly rows: readonly MembershipPermissionOverrideRow[];
}
export type MembershipPermissionOverridesInput = z.infer<typeof membershipPermissionOverridesSchema>;
