import { createHash } from "node:crypto";
import type { SessionContext } from "../domain/access";
import { hasLegacyFullProfileAccess } from "../domain/functional-permissions";
import { MAX_MEMBERSHIP_PERMISSION_ROLES, ROLE_OPTION_PAGE_SIZE, membershipRoleTargetSchema, membershipRoleChangeSchema, membershipRoleOptionsSchema, type MembershipRoleOption, type MembershipRoleOptionsPage, type MembershipRolePreview } from "../domain/membership-role-schema";
import { PermissionRoleError } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";
import { assertPreservesUnrestrictedManager } from "./school-identity-policy";

function scope(context: SessionContext, expectedSchoolId: string) {
  if (!context.schoolId || context.schoolId !== expectedSchoolId) throw new SchoolUserError("schoolChanged");
}
async function authorize(tx: Prisma.TransactionClient, context: SessionContext) {
  const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
  if (!actor.unrestricted) throw new SchoolUserError("forbidden");
}
async function target(tx: Prisma.TransactionClient, context: SessionContext, membershipId: string) {
  const member = await tx.membership.findFirst({ where: { id: membershipId, schoolId: context.schoolId!, status: { in: ["ACTIVE", "SUSPENDED"] }, role: { in: ["SCHOOL_MANAGER", "TEACHER"] } }, select: {
    id: true, userId: true, role: true, status: true, updatedAt: true, permissionsConfigured: true, permissionRoleId: true,
    assignedRoles: { select: { permissionRoleId: true }, orderBy: { permissionRoleId: "asc" } },
    permissionOverrides: { select: { id: true } },
    user: { select: { name: true, updatedAt: true, isActive: true, isPlatformAdmin: true, passwordChangeRequired: true, memberships: { where: { schoolId: context.schoolId!, status: "ACTIVE", role: { in: ["SCHOOL_MANAGER", "TEACHER"] } }, select: { _count: { select: { permissionOverrides: true } } } } } },
  } });
  if (!member) throw new SchoolUserError("notFound");
  if (member.userId === context.userId || member.user.isPlatformAdmin) throw new SchoolUserError("protectedAccount");
  const ids = [...new Set([
    ...(member.role === "SCHOOL_MANAGER" && member.permissionRoleId ? [member.permissionRoleId] : []),
    ...member.assignedRoles.map(row => row.permissionRoleId),
  ])].sort();
  if (ids.length > MAX_MEMBERSHIP_PERMISSION_ROLES) throw new PermissionRoleError("invalid");
  const revision = createHash("sha256").update(JSON.stringify(member)).digest("hex");
  return { member, ids, revision, mode: hasLegacyFullProfileAccess(member) ? "legacy" as const : "configured" as const };
}
const optionSelect = { id: true, name: true, updatedAt: true, isSystem: true, _count: { select: { permissions: true } } } as const;
function option(row: { id: string; name: string; updatedAt: Date; isSystem: boolean; _count: { permissions: number } }): MembershipRoleOption {
  return { id: row.id, name: row.name, revision: row.updatedAt.toISOString(), isSystem: row.isSystem, permissionCount: row._count.permissions };
}
async function options(tx: Prisma.TransactionClient, schoolId: string, query: string, requestedPage: number): Promise<MembershipRoleOptionsPage> {
  const where = { schoolId, ...(query ? { name: { contains: query } } : {}) };
  const total = await tx.permissionRole.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ROLE_OPTION_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const rows = await tx.permissionRole.findMany({ where, select: optionSelect, orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }], skip: (page - 1) * ROLE_OPTION_PAGE_SIZE, take: ROLE_OPTION_PAGE_SIZE });
  return { rows: rows.map(option), page, total, pageCount };
}
export async function loadSchoolMembershipRoles(context: SessionContext, input: unknown): Promise<MembershipRolePreview> {
  const parsed = membershipRoleTargetSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  scope(context, parsed.data.expectedSchoolId);
  return withTransactionRetry(() => prisma.$transaction(async tx => {
    await authorize(tx, context);
    const { member, ids, revision, mode } = await target(tx, context, parsed.data.membershipId);
    const selected = await tx.permissionRole.findMany({ where: { schoolId: context.schoolId!, id: { in: ids } }, select: optionSelect, orderBy: [{ name: "asc" }, { id: "asc" }] });
    if (selected.length !== ids.length) throw new PermissionRoleError("notFound");
    return { membershipId: member.id, name: member.user.name ?? "", baseRole: member.role as "SCHOOL_MANAGER" | "TEACHER", status: member.status as "ACTIVE" | "SUSPENDED", accountState: !member.user.isActive ? "disabled" as const : member.user.passwordChangeRequired ? "initial" as const : "active" as const, revision, mode, selectedRoles: selected.map(option), hasOverrides: !!member.permissionOverrides.length || member.user.memberships.some(row => row._count.permissionOverrides > 0), options: await options(tx, context.schoolId!, "", 1) };
  }, { isolationLevel: "ReadCommitted" }));
}
export async function searchSchoolPermissionRoles(context: SessionContext, input: unknown): Promise<MembershipRoleOptionsPage> {
  const parsed = membershipRoleOptionsSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  scope(context, parsed.data.expectedSchoolId);
  return withTransactionRetry(() => prisma.$transaction(async tx => {
    await authorize(tx, context);
    return options(tx, context.schoolId!, parsed.data.query, parsed.data.page);
  }, { isolationLevel: "ReadCommitted" }));
}
export async function saveSchoolMembershipRoles(context: SessionContext, input: unknown): Promise<void> {
  const parsed = membershipRoleChangeSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  const data = parsed.data;
  scope(context, data.expectedSchoolId);
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    await authorize(tx, context);
    const current = await target(tx, context, data.membershipId);
    if (data.mode === "legacy" && current.member.role !== "SCHOOL_MANAGER") throw new PermissionRoleError("invalid");
    const ids = data.roles.map(row => row.id).sort();
    const selected = await tx.permissionRole.findMany({ where: { schoolId: context.schoolId!, id: { in: ids } }, select: { id: true, updatedAt: true } });
    if (selected.length !== ids.length) throw new PermissionRoleError("notFound");
    const revisions = new Map(data.roles.map(row => [row.id, row.revision]));
    if (selected.some(row => revisions.get(row.id) !== row.updatedAt.toISOString())) throw new PermissionRoleError("conflict");
    if (current.mode === data.mode && JSON.stringify(current.ids) === JSON.stringify(ids)) return;
    if (current.revision !== data.revision) throw new PermissionRoleError("conflict");
    if (current.mode === "legacy" && data.mode === "configured" && current.member.status === "ACTIVE" && current.member.user.isActive && !current.member.user.passwordChangeRequired) {
      await assertPreservesUnrestrictedManager(tx, context.schoolId!, [current.member.id]);
    }
    // Remove links before an intentional legacy reset; the database refuses an implicit reset.
    await tx.membershipPermissionRole.deleteMany({ where: { membershipId: current.member.id } });
    const updated = await tx.membership.updateMany({ where: { id: current.member.id, schoolId: context.schoolId!, updatedAt: current.member.updatedAt }, data: {
      permissionsConfigured: data.mode === "configured",
      permissionRoleId: current.member.role === "SCHOOL_MANAGER" ? (ids.length === 1 ? ids[0] : null) : current.member.permissionRoleId,
      updatedAt: new Date(Math.max(Date.now(), current.member.updatedAt.getTime() + 1)),
    } });
    if (updated.count !== 1) throw new PermissionRoleError("conflict");
    if (ids.length) await tx.membershipPermissionRole.createMany({ data: ids.map(permissionRoleId => ({ membershipId: current.member.id, permissionRoleId })) });
    await tx.auditLog.create({ data: {
      schoolId: context.schoolId!, actorUserId: context.userId, entity: "Membership", entityId: current.member.id, action: "membership.assignPermissionRoles",
      before: { mode: current.mode, permissionRoleIds: current.ids }, after: { mode: data.mode, permissionRoleIds: ids },
    } });
  }, { isolationLevel: "ReadCommitted" }));
}
