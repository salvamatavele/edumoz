import type { SessionContext } from "../domain/access";
import { PERMISSION_CATALOG, isConsumedPermission } from "../domain/permission-catalog";
import { deletePermissionRoleSchema, editPermissionRoleSchema, permissionRoleTargetSchema, PermissionRoleError, type EditablePermissionRole } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

function scope(context: SessionContext, expectedSchoolId: string) {
  if (!context.schoolId || context.schoolId !== expectedSchoolId) throw new SchoolUserError("schoolChanged");
}
async function authorizedRole(tx: Prisma.TransactionClient, context: SessionContext, id: string) {
  const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
  if (!actor.unrestricted) throw new SchoolUserError("forbidden");
  const role = await tx.permissionRole.findFirst({ where: { id, schoolId: context.schoolId! }, select: {
    id: true, name: true, description: true, updatedAt: true, isSystem: true,
    permissions: { select: { permissionId: true } },
  } });
  if (!role) throw new PermissionRoleError("notFound");
  const memberCount = await tx.membership.count({ where: { schoolId: context.schoolId!, OR: [{ permissionRoleId: role.id }, { assignedRoles: { some: { permissionRoleId: role.id } } }] } });
  return { ...role, _count: { memberships: memberCount } };
}
function editable(role: Awaited<ReturnType<typeof authorizedRole>>): EditablePermissionRole {
  return { id: role.id, name: role.name, description: role.description ?? "", revision: role.updatedAt.toISOString(), isSystem: role.isSystem, memberCount: role._count.memberships, permissionIds: role.permissions.map(row => row.permissionId).sort() };
}
export async function loadSchoolPermissionRole(context: SessionContext, input: unknown): Promise<EditablePermissionRole> {
  const parsed = permissionRoleTargetSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  scope(context, parsed.data.expectedSchoolId);
  return prisma.$transaction(async tx => editable(await authorizedRole(tx, context, parsed.data.id)), { isolationLevel: "ReadCommitted" });
}
export async function saveSchoolPermissionRole(context: SessionContext, input: unknown): Promise<void> {
  const parsed = editPermissionRoleSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  const data = parsed.data;
  scope(context, data.expectedSchoolId);
  try {
    await withTransactionRetry(() => prisma.$transaction(async tx => {
      const role = await authorizedRole(tx, context, data.id);
      const known = new Set(PERMISSION_CATALOG.map(row => `${row.resource}/${row.action}`));
      const requestedIds = [...new Set(data.permissionIds)].sort();
      const permissions = await tx.permission.findMany({ where: { id: { in: requestedIds } }, select: { id: true, resource: true, action: true } });
      if (permissions.length !== requestedIds.length || permissions.some(row => !known.has(`${row.resource}/${row.action}`))) throw new PermissionRoleError("invalid");
      if (permissions.some(row => !isConsumedPermission(row.resource, row.action) && !role.permissions.some(existing => existing.permissionId === row.id))) throw new PermissionRoleError("invalid");
      const beforeIds = role.permissions.map(row => row.permissionId).sort();
      const grantsChanged = JSON.stringify(beforeIds) !== JSON.stringify(requestedIds);
      const fields = [...(role.name !== data.name ? ["name"] : []), ...(role.description !== (data.description || null) ? ["description"] : []), ...(grantsChanged ? ["permissions"] : [])];
      if (!fields.length) return;
      if (role.updatedAt.toISOString() !== data.revision) throw new PermissionRoleError("conflict");
      const changed = await tx.permissionRole.updateMany({ where: { id: role.id, schoolId: context.schoolId!, updatedAt: role.updatedAt }, data: {
        name: data.name, description: data.description || null, updatedAt: new Date(Math.max(Date.now(), role.updatedAt.getTime() + 1)),
      } });
      if (changed.count !== 1) throw new PermissionRoleError("conflict");
      if (grantsChanged) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (requestedIds.length) await tx.rolePermission.createMany({ data: requestedIds.map(permissionId => ({ roleId: role.id, permissionId })) });
      }
      await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, entity: "PermissionRole", entityId: role.id, action: "permissionRole.update",
        before: { name: role.name, permissionIds: beforeIds }, after: { name: data.name, permissionIds: requestedIds, changedFields: fields },
      } });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new PermissionRoleError("duplicateName"); throw error; }
}
export async function deleteSchoolPermissionRole(context: SessionContext, input: unknown): Promise<void> {
  const parsed = deletePermissionRoleSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  scope(context, parsed.data.expectedSchoolId);
  try {
    await withTransactionRetry(() => prisma.$transaction(async tx => {
      const role = await authorizedRole(tx, context, parsed.data.id);
      if (role.isSystem) throw new PermissionRoleError("protectedRole");
      if (role._count.memberships) throw new PermissionRoleError("roleInUse");
      if (role.updatedAt.toISOString() !== parsed.data.revision) throw new PermissionRoleError("conflict");
      const removed = await tx.permissionRole.deleteMany({ where: { id: role.id, schoolId: context.schoolId!, updatedAt: role.updatedAt, isSystem: false } });
      if (removed.count !== 1) throw new PermissionRoleError("conflict");
      await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, entity: "PermissionRole", entityId: role.id, action: "permissionRole.delete", before: { name: role.name, permissionIds: role.permissions.map(row => row.permissionId).sort() } } });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new PermissionRoleError("roleInUse"); throw error; }
}
