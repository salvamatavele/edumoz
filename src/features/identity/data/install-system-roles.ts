import type { SessionContext } from "../domain/access";
import { PermissionRoleError } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { SYSTEM_ROLE_DEFINITIONS, projectSystemRolePermissions } from "../domain/system-role-catalog";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

/** Creates defaults once per school. Never assigns people or rewrites an existing role. */
export async function installSchoolSystemRoles(context: SessionContext, expectedSchoolId: string): Promise<{ created: number }> {
  if (!context.schoolId || expectedSchoolId !== context.schoolId) throw new SchoolUserError("schoolChanged");
  try {
    return await withTransactionRetry(() => prisma.$transaction(async tx => {
      const actor = await authorizeSchoolIdentityMutation(tx, context, "edit");
      if (!actor.unrestricted) throw new SchoolUserError("forbidden");
      const permissions = await tx.permission.findMany({ select: { id: true, resource: true, action: true } });
      const ids = new Map(permissions.map(row => [`${row.resource}/${row.action}`, row.id]));
      const created: { id: string; key: string }[] = [];
      for (const definition of SYSTEM_ROLE_DEFINITIONS) {
        const key = `system-${definition.key}`;
        const existing = await tx.permissionRole.findUnique({ where: { schoolId_key: { schoolId: context.schoolId!, key } }, select: { isSystem: true } });
        if (existing) {
          if (!existing.isSystem) throw new PermissionRoleError("protectedRole");
          continue;
        }
        const permissionIds = projectSystemRolePermissions(definition).map(grant => {
          const id = ids.get(`${grant.resource}/${grant.action}`);
          if (!id) throw new PermissionRoleError("invalid");
          return id;
        });
        const role = await tx.permissionRole.create({ data: {
          schoolId: context.schoolId!, key, isSystem: true, sortOrder: definition.sortOrder,
          name: definition.label, description: definition.description,
          permissions: { create: permissionIds.map(permissionId => ({ permissionId })) },
        }, select: { id: true } });
        created.push({ id: role.id, key });
      }
      if (created.length) await tx.auditLog.create({ data: {
        schoolId: context.schoolId!, actorUserId: context.userId, entity: "School", entityId: context.schoolId!,
        action: "permissionRole.installSystemDefaults", after: { roles: created },
      } });
      return { created: created.length };
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new PermissionRoleError("duplicateName");
    throw error;
  }
}
