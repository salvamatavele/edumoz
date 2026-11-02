import { hasPermission, type SessionContext } from "@/features/identity/domain/access";
import { editSchoolUserSchema, schoolUserEditTargetSchema, type EditableSchoolUser } from "@/features/identity/domain/edit-school-user";
import { SchoolUserError } from "@/features/identity/domain/school-users";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

async function editableTarget(tx: Prisma.TransactionClient, context: SessionContext, userId: string, unrestricted: boolean) {
  const user = await tx.user.findFirst({ where: {
    id: userId, isActive: true, isPlatformAdmin: false,
    memberships: { some: { schoolId: context.schoolId!, status: { not: "REMOVED" } }, every: { schoolId: context.schoolId! } },
  }, select: { id: true, name: true, contactEmail: true, contactPhone: true, updatedAt: true,
    memberships: { select: { role: true } } } });
  if (!user || (!unrestricted && user.memberships.some(member => member.role === "SCHOOL_MANAGER" || member.role === "PLATFORM_ADMIN"))) throw new SchoolUserError("editUnavailable");
  return user;
}
function requireEdit(context: SessionContext) {
  if (!context.schoolId || !hasPermission(context, "users", "edit")) throw new SchoolUserError("forbidden");
}

/** Only school-exclusive identities may expose an editable global identity snapshot. */
export async function getEditableSchoolUser(context: SessionContext, input: unknown): Promise<EditableSchoolUser> {
  requireEdit(context);
  const parsed = schoolUserEditTargetSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  return prisma.$transaction(async tx => {
    const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
    const user = await editableTarget(tx, context, parsed.data.userId, actor.unrestricted);
    return { userId: user.id, name: user.name ?? "", email: user.contactEmail ?? "", phone: user.contactPhone ?? "", revision: user.updatedAt.toISOString() };
  }, { isolationLevel: "ReadCommitted" });
}

/** Contacts are communication-only: preserve legacy login identifiers and all access state. */
export async function editSchoolUser(context: SessionContext, input: unknown): Promise<void> {
  requireEdit(context);
  const parsed = editSchoolUserSchema.safeParse(input);
  if (!parsed.success) throw new SchoolUserError("invalid");
  const data = parsed.data;
  await withTransactionRetry(() => prisma.$transaction(async tx => {
    const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
    const user = await editableTarget(tx, context, data.userId, actor.unrestricted);
    if (user.updatedAt.toISOString() !== data.revision) throw new SchoolUserError("editConflict");
    const fields = [
      ...(user.name !== data.name ? ["name"] : []),
      ...(user.contactEmail !== (data.email || null) ? ["contactEmail"] : []),
      ...(user.contactPhone !== (data.phone || null) ? ["contactPhone"] : []),
    ];
    if (!fields.length) return;
    const updated = await tx.user.updateMany({ where: {
      id: user.id, updatedAt: user.updatedAt, isActive: true, isPlatformAdmin: false,
      memberships: { some: { schoolId: context.schoolId!, status: { not: "REMOVED" } }, every: { schoolId: context.schoolId! } },
    }, data: { name: data.name, contactEmail: data.email || null, contactPhone: data.phone || null,
      updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)) } });
    if (updated.count !== 1) throw new SchoolUserError("editConflict");
    await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId,
      action: "schoolUser.update", entity: "User", entityId: user.id, after: { changedFields: fields } } });
  }, { isolationLevel: "ReadCommitted" }));
}
