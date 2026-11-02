import { isLegacyUnrestrictedAssociation } from "../domain/functional-permissions";
import { assertPreservesUnrestrictedManager } from "./school-identity-policy";
import { createHash } from "node:crypto";
import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { schoolUserRemovalSchema, schoolUserRemovalTargetSchema, type SchoolUserRemovalPreview } from "@/features/identity/domain/school-user-removal";
import { SchoolUserError } from "@/features/identity/domain/school-users";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

function requirePermission(context: SessionContext) {
  if (!context.schoolId || !hasPermission(context, "users", "edit")) throw new SchoolUserError("forbidden");
}
async function targetForRemoval(tx: Prisma.TransactionClient, context: SessionContext, userId: string) {
  const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
  const target = await tx.user.findFirst({ where: { id: userId, memberships: { some: { schoolId: context.schoolId! } } }, select: {
    id: true, name: true, loginCode: true, email: true, updatedAt: true, isActive: true, isPlatformAdmin: true, passwordChangeRequired: true,
    memberships: { where: { schoolId: context.schoolId! }, orderBy: { id: "asc" }, select: { id: true, role: true, status: true, permissionsConfigured: true, assignedRoles: { select: { permissionRoleId: true }, orderBy: { permissionRoleId: "asc" } }, permissionRoleId: true, updatedAt: true } },
  } });
  if (!target) throw new SchoolUserError("notFound");
  if (target.id === context.userId || target.isPlatformAdmin || (!actor.unrestricted && target.memberships.some(row => row.status !== "REMOVED" && (row.role === "SCHOOL_MANAGER" || row.role === "PLATFORM_ADMIN")))) throw new SchoolUserError("protectedAccount");
  const revision = createHash("sha256").update(JSON.stringify([target.id, target.name, target.loginCode, target.updatedAt, target.memberships])).digest("hex");
  return { target, revision };
}
export async function previewSchoolUserRemoval(context: SessionContext, input: unknown): Promise<SchoolUserRemovalPreview> {
  requirePermission(context);
  const parsed = schoolUserRemovalTargetSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  return prisma.$transaction(async tx => {
    const { target, revision } = await targetForRemoval(tx, context, parsed.data.userId);
    if (target.memberships.every(row => row.status === "REMOVED")) throw new SchoolUserError("notFound");
    return { userId: target.id, name: target.name ?? "", loginCode: target.loginCode, revision };
  }, { isolationLevel: "ReadCommitted" });
}
/** Retire local memberships; preserve the global account and every historical profile. */
export async function removeSchoolUser(context: SessionContext, input: unknown): Promise<void> {
  requirePermission(context);
  const parsed = schoolUserRemovalSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    const { target, revision } = await targetForRemoval(tx, context, parsed.data.userId);
    const remaining = target.memberships.filter(row => row.status !== "REMOVED");
    if (!remaining.length) return;
    if (parsed.data.revision !== revision) throw new SchoolUserError("removalConflict");
    if (target.isActive && !target.passwordChangeRequired && remaining.some(row => row.status === "ACTIVE" && isLegacyUnrestrictedAssociation(row))) {
      await assertPreservesUnrestrictedManager(tx, context.schoolId!, remaining.map(member => member.id));
    }
    await tx.membership.updateMany({ where: { schoolId: context.schoolId!, userId: target.id, status: { not: "REMOVED" } }, data: { status: "REMOVED", isDefault: false } });
    const invitations = target.email ? await tx.invitation.updateMany({ where: { schoolId: context.schoolId!, email: target.email, status: "PENDING" }, data: { status: "REVOKED", revokedAt: new Date() } }) : { count: 0 };
    await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, entity: "User", entityId: target.id, action: "schoolUser.remove", before: remaining.map(row => ({ membershipId: row.id, role: row.role, status: row.status })), after: { status: "REMOVED", pendingInvitationsRevoked: invitations.count } } });
  }, { isolationLevel: "ReadCommitted" }));
}
