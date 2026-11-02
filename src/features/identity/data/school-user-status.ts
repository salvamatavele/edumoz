import { isLegacyUnrestrictedAssociation } from "../domain/functional-permissions";
import { assertPreservesUnrestrictedManager } from "./school-identity-policy";
import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { SchoolUserError, schoolUserStatusSchema } from "@/features/identity/domain/school-users";
import { prisma } from "@/lib/db/client";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";
import { withTransactionRetry } from "@/lib/db/transaction-retry";

/** This global identity transaction may change only memberships of the authorized school. */
export async function changeSchoolUserStatus(context: SessionContext, input: unknown): Promise<void> {
  if (!context.schoolId || !hasPermission(context, "users", "edit")) throw new SchoolUserError("forbidden");
  const parsed = schoolUserStatusSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const { userId, status } = parsed.data;
  const schoolId = context.schoolId;
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
    const target = await tx.user.findFirst({ where: { id: userId, memberships: { some: { schoolId, status: { not: "REMOVED" } } } }, select: {
      isActive: true, isPlatformAdmin: true, passwordChangeRequired: true, memberships: { where: { schoolId, status: { not: "REMOVED" } }, select: { id: true, role: true, status: true, permissionsConfigured: true, permissionOverrides: { select: { id: true } }, assignedRoles: { select: { permissionRoleId: true }, orderBy: { permissionRoleId: "asc" } }, permissionRoleId: true } },
    } });
    if (!target) throw new SchoolUserError("notFound");
    if (!actor.unrestricted && target.memberships.some(member => member.role === "SCHOOL_MANAGER" || member.role === "PLATFORM_ADMIN")) throw new SchoolUserError("protectedAccount");
    if (target.isPlatformAdmin) throw new SchoolUserError("protectedAccount");
    if (!target.isActive) throw new SchoolUserError("disabledAccount");
    const changes = target.memberships.filter(member => member.status !== status);
    if (!changes.length) return;
    // Activating an accumulated association may activate exceptions against its manager role.
    if (status === "ACTIVE" && changes.some(member => member.permissionOverrides.length)) {
      await assertPreservesUnrestrictedManager(tx, schoolId, target.memberships.map(member => member.id));
    }
    if (status === "SUSPENDED" && !target.passwordChangeRequired && target.memberships.some(member => member.status === "ACTIVE" && isLegacyUnrestrictedAssociation(member))) {
      await assertPreservesUnrestrictedManager(tx, schoolId, target.memberships.map(member => member.id));
    }
    await tx.membership.updateMany({ where: { schoolId, userId, status: { notIn: [status, "REMOVED"] } }, data: { status } });
    await tx.auditLog.create({ data: {
      schoolId, actorUserId: context.userId, action: status === "SUSPENDED" ? "schoolUser.suspend" : "schoolUser.activate",
      entity: "User", entityId: userId,
      before: changes.map(member => ({ membershipId: member.id, role: member.role, status: member.status })),
      after: { status, membershipIds: changes.map(member => member.id) },
    } });
  }, { isolationLevel: "ReadCommitted" }));
}
