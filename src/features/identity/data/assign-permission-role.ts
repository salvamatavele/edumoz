import { isLegacyUnrestrictedAssociation } from "../domain/functional-permissions";
import { assertPreservesUnrestrictedManager } from "./school-identity-policy";
import type { SessionContext } from "../domain/access";
import { assignPermissionRoleSchema } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { prisma } from "@/lib/db/client";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

export async function assignSchoolPermissionRole(context: SessionContext, input: unknown): Promise<void> {
  const parsed = assignPermissionRoleSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const data = parsed.data;
  if (!context.schoolId || data.expectedSchoolId !== context.schoolId) throw new SchoolUserError("schoolChanged");
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
    if (!actor.unrestricted) throw new SchoolUserError("forbidden");
    const member = await tx.membership.findFirst({ where: { id: data.membershipId, schoolId: context.schoolId!, role: "SCHOOL_MANAGER", status: "ACTIVE" }, select: { id: true, userId: true, role: true, updatedAt: true, permissionsConfigured: true, assignedRoles: { select: { permissionRoleId: true } }, permissionRoleId: true, user: { select: { isActive: true, isPlatformAdmin: true, passwordChangeRequired: true } } } });
    if (!member) throw new SchoolUserError("notFound");
    if (member.userId === context.userId || member.user.isPlatformAdmin) throw new SchoolUserError("protectedAccount");
    if (data.permissionRoleId && !(await tx.permissionRole.findFirst({ where: { id: data.permissionRoleId, schoolId: context.schoolId! }, select: { id: true } }))) throw new SchoolUserError("notFound");
    // A legacy single-role form cannot overwrite a multiple or explicitly empty configuration.
    const effectiveIds = new Set([...member.assignedRoles.map(row => row.permissionRoleId), ...(member.permissionRoleId ? [member.permissionRoleId] : [])]);
    if (effectiveIds.size > 1 || (member.permissionsConfigured && !member.permissionRoleId)) throw new SchoolUserError("invalid");
    if (member.permissionRoleId === data.permissionRoleId) return;
    if (isLegacyUnrestrictedAssociation(member) && data.permissionRoleId && member.user.isActive && !member.user.passwordChangeRequired) {
      await assertPreservesUnrestrictedManager(tx, context.schoolId!, [member.id]);
    }
    await tx.membershipPermissionRole.deleteMany({ where: { membershipId: member.id } });
    await tx.membership.update({ where: { id: member.id }, data: { permissionRoleId: data.permissionRoleId, permissionsConfigured: Boolean(data.permissionRoleId), updatedAt: new Date(Math.max(Date.now(), member.updatedAt.getTime() + 1)) } });
    if (data.permissionRoleId) await tx.membershipPermissionRole.create({ data: { membershipId: member.id, permissionRoleId: data.permissionRoleId } });
    await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, entity: "Membership", entityId: member.id, action: "membership.assignPermissionRole", before: { permissionRoleId: member.permissionRoleId }, after: { permissionRoleId: data.permissionRoleId } } });
  }, { isolationLevel: "ReadCommitted" }));
}
