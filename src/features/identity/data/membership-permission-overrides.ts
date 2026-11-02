import { createHash } from "node:crypto";
import type { SessionContext } from "../domain/access";
import { CONSUMED_PERMISSION_CATALOG, PERMISSION_CATALOG, type PermissionResource, type PermissionAction } from "../domain/permission-catalog";
import { hasLegacyFullProfileAccess, resolveFunctionalSchoolPermissions } from "../domain/functional-permissions";
import { membershipRoleTargetSchema } from "../domain/membership-role-schema";
import { membershipPermissionOverridesSchema, type MembershipPermissionOverridesPreview } from "../domain/membership-permission-override-schema";
import { PermissionRoleError } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";
import { assertPreservesUnrestrictedManager } from "./school-identity-policy";

const permissionSelect = { id: true, resource: true, action: true } as const;
const roleSelect = { id: true, schoolId: true, updatedAt: true, permissions: { select: { permission: { select: permissionSelect } }, orderBy: { permissionId: "asc" } } } as const;
function scope(context: SessionContext, expectedSchoolId: string) {
  if (!context.schoolId || context.schoolId !== expectedSchoolId) throw new SchoolUserError("schoolChanged");
}
async function authorize(tx: Prisma.TransactionClient, context: SessionContext) {
  if (!(await authorizeSchoolIdentityMutation(tx, context, "edit")).unrestricted) throw new SchoolUserError("forbidden");
}
async function target(tx: Prisma.TransactionClient, context: SessionContext, membershipId: string) {
  const member = await tx.membership.findFirst({ where: { id: membershipId, schoolId: context.schoolId!, role: { in: ["SCHOOL_MANAGER", "TEACHER"] }, status: { in: ["ACTIVE", "SUSPENDED"] } }, select: {
    id: true, userId: true, role: true, status: true, updatedAt: true, permissionsConfigured: true, permissionRoleId: true, assignedRoles: { select: { permissionRoleId: true }, orderBy: { permissionRoleId: "asc" } },
    permissionOverrides: { orderBy: { permissionId: "asc" }, select: { permissionId: true, allowed: true, reason: true, updatedAt: true } },
    user: { select: { name: true, isActive: true, isPlatformAdmin: true, passwordChangeRequired: true, updatedAt: true, memberships: {
      where: { schoolId: context.schoolId!, status: { in: ["ACTIVE", "SUSPENDED"] }, role: { in: ["SCHOOL_MANAGER", "TEACHER"] } }, orderBy: { id: "asc" }, select: {
        id: true, schoolId: true, role: true, status: true, updatedAt: true, permissionsConfigured: true, permissionRoleId: true, permissionRole: { select: roleSelect },
        assignedRoles: { select: { permissionRole: { select: roleSelect } }, orderBy: { permissionRoleId: "asc" } },
        permissionOverrides: { select: { permissionId: true, allowed: true, reason: true, updatedAt: true, permission: { select: permissionSelect } }, orderBy: { permissionId: "asc" } },
      },
    } } },
  } });
  if (!member) throw new SchoolUserError("notFound");
  if (member.userId === context.userId || member.user.isPlatformAdmin) throw new SchoolUserError("protectedAccount");
  return { member, revision: createHash("sha256").update(JSON.stringify(member)).digest("hex") };
}
const canonical = new Set(CONSUMED_PERMISSION_CATALOG.map(row => `${row.resource}/${row.action}`));
function normalized(rows: readonly { permissionId: string; allowed: boolean; reason: string | null }[]) {
  return rows.map(row => ({ permissionId: row.permissionId, allowed: row.allowed, reason: row.reason?.trim() || "" })).sort((a, b) => a.permissionId.localeCompare(b.permissionId));
}
export async function loadSchoolMembershipPermissionOverrides(context: SessionContext, input: unknown): Promise<MembershipPermissionOverridesPreview> {
  const parsed = membershipRoleTargetSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  scope(context, parsed.data.expectedSchoolId);
  return withTransactionRetry(() => prisma.$transaction(async tx => {
    await authorize(tx, context);
    const { member, revision } = await target(tx, context, parsed.data.membershipId);
    const associations = member.user.memberships;
    const active = associations.filter(row => row.status === "ACTIVE");
    const legacy = active.some(hasLegacyFullProfileAccess);
    const inherited = legacy ? PERMISSION_CATALOG : resolveFunctionalSchoolPermissions(active.map(row => ({ ...row, permissionOverrides: [] })), context.schoolId!);
    const effective = legacy && !active.some(row => row.permissionOverrides.length) ? PERMISSION_CATALOG : resolveFunctionalSchoolPermissions(active, context.schoolId!);
    const keys = (rows: readonly { resource: string; action: string }[]) => new Set(rows.map(row => `${row.resource}/${row.action}`));
    const inheritedKeys = keys(inherited), effectiveKeys = keys(effective);
    const local = new Map(member.permissionOverrides.map(row => [row.permissionId, row]));
    const otherDenied = new Set(active.filter(row => row.id !== member.id).flatMap(row => row.permissionOverrides.filter(override => !override.allowed).map(override => override.permissionId)));
    const catalog = await tx.permission.findMany({ where: { OR: CONSUMED_PERMISSION_CATALOG.map(row => ({ ...row })) }, select: permissionSelect, orderBy: [{ resource: "asc" }, { action: "asc" }] });
    return {
      membershipId: member.id, name: member.user.name ?? "", baseRole: member.role as "SCHOOL_MANAGER" | "TEACHER", status: member.status as "ACTIVE" | "SUSPENDED",
      accountState: !member.user.isActive ? "disabled" : member.user.passwordChangeRequired ? "initial" : "active", revision, legacyProfile: associations.some(hasLegacyFullProfileAccess),
      rows: catalog.map(row => ({ permissionId: row.id, resource: row.resource as PermissionResource, action: row.action as PermissionAction, inherited: inheritedKeys.has(`${row.resource}/${row.action}`), override: local.get(row.id)?.allowed ?? null, reason: local.get(row.id)?.reason ?? "", effective: effectiveKeys.has(`${row.resource}/${row.action}`), otherDenial: otherDenied.has(row.id) })),
    };
  }, { isolationLevel: "ReadCommitted" }));
}
export async function saveSchoolMembershipPermissionOverrides(context: SessionContext, input: unknown): Promise<void> {
  const parsed = membershipPermissionOverridesSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  const data = parsed.data;
  scope(context, data.expectedSchoolId);
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    await authorize(tx, context);
    const { member, revision } = await target(tx, context, data.membershipId);
    const selected = await tx.permission.findMany({ where: { id: { in: data.overrides.map(row => row.permissionId) } }, select: permissionSelect });
    if (selected.length !== data.overrides.length || selected.some(row => !canonical.has(`${row.resource}/${row.action}`))) throw new PermissionRoleError("invalid");
    const before = normalized(member.permissionOverrides), after = normalized(data.overrides);
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    if (revision !== data.revision) throw new PermissionRoleError("conflict");
    if (member.status === "ACTIVE" && after.length) await assertPreservesUnrestrictedManager(tx, context.schoolId!, member.user.memberships.map(row => row.id));
    await tx.membershipPermissionOverride.deleteMany({ where: { membershipId: member.id } });
    if (after.length) await tx.membershipPermissionOverride.createMany({ data: after.map(row => ({ ...row, membershipId: member.id, reason: row.reason || null })) });
    const changed = await tx.membership.updateMany({ where: { id: member.id, schoolId: context.schoolId!, updatedAt: member.updatedAt }, data: { updatedAt: new Date(Math.max(Date.now(), member.updatedAt.getTime() + 1)) } });
    if (changed.count !== 1) throw new PermissionRoleError("conflict");
    const audit = (rows: typeof before) => rows.map(row => ({ permissionId: row.permissionId, allowed: row.allowed, reasonPresent: !!row.reason }));
    await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, action: "membership.permissionOverrides.update", entity: "Membership", entityId: member.id, before: audit(before), after: audit(after) } });
  }, { isolationLevel: "ReadCommitted" }));
}
