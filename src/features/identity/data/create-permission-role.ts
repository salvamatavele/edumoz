import { createHash } from "node:crypto";
import type { SessionContext } from "../domain/access";
import { CONSUMED_PERMISSION_CATALOG } from "../domain/permission-catalog";
import { createPermissionRoleSchema, PermissionRoleError } from "../domain/permission-role-schema";
import { SchoolUserError } from "../domain/school-users";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { authorizeSchoolIdentityMutation } from "./school-identity-authorization";

export async function createSchoolPermissionRole(context: SessionContext, input: unknown) {
  const parsed = createPermissionRoleSchema.safeParse(input);
  if (!parsed.success) throw new PermissionRoleError("invalid");
  const data = parsed.data;
  if (!context.schoolId || data.expectedSchoolId !== context.schoolId) throw new SchoolUserError("schoolChanged");
  try {
    return await withTransactionRetry(() => prisma.$transaction(async tx => {
      const actor = await authorizeSchoolIdentityMutation(tx, context, "create");
      if (!actor.unrestricted) throw new SchoolUserError("forbidden");
      const catalog = new Set(CONSUMED_PERMISSION_CATALOG.map(row => `${row.resource}/${row.action}`));
      const requested = await tx.permission.findMany({ where: { id: { in: data.permissionIds } }, select: { id: true, resource: true, action: true } });
      const permissionIds = requested.filter(row => catalog.has(`${row.resource}/${row.action}`)).map(row => row.id).sort();
      if (permissionIds.length !== new Set(data.permissionIds).size) throw new PermissionRoleError("invalid");
      const id = createHash("sha256").update(JSON.stringify(["permission-role-create", context.schoolId, context.userId, data.requestId])).digest("hex");
      const existing = await tx.permissionRole.findFirst({ where: { id, schoolId: context.schoolId! }, select: { id: true, name: true, description: true, permissions: { select: { permissionId: true } } } });
      if (existing) {
        if (existing.name !== data.name || existing.description !== (data.description || null) || JSON.stringify(existing.permissions.map(row => row.permissionId).sort()) !== JSON.stringify(permissionIds)) throw new PermissionRoleError("requestChanged");
        return { id: existing.id, name: existing.name };
      }
      const last = await tx.permissionRole.findFirst({ where: { schoolId: context.schoolId! }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      const created = await tx.permissionRole.create({ data: { id, key: `custom-${id.slice(0, 32)}`, sortOrder: (last?.sortOrder ?? 1000) + 1, schoolId: context.schoolId!, name: data.name, description: data.description || null, permissions: { create: permissionIds.map(permissionId => ({ permissionId })) } }, select: { id: true, name: true } });
      await tx.auditLog.create({ data: { schoolId: context.schoolId!, actorUserId: context.userId, entity: "PermissionRole", entityId: created.id, action: "permissionRole.create", after: { name: data.name, permissionIds } } });
      return created;
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new PermissionRoleError("duplicateName"); throw error; }
}
