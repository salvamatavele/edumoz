import { PERMISSION_CATALOG } from "../../features/identity/domain/permission-catalog";
import type { PrismaClient } from "../../generated/prisma/client";

/** Reference data only: never creates roles, assignments or grants. */
export async function seedPermissionCatalog(client: Pick<PrismaClient, "permission">): Promise<void> {
  for (const entry of PERMISSION_CATALOG) {
    await client.permission.upsert({ where: { resource_action: { resource: entry.resource, action: entry.action } }, update: {}, create: { resource: entry.resource, action: entry.action } });
  }
}
