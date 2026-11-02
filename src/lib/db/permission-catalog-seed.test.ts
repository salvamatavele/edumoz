// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { prisma } from "./client";
import { seedPermissionCatalog } from "./permission-catalog-seed";
import { PERMISSION_CATALOG } from "@/features/identity/domain/permission-catalog";
let schoolId = "";
afterAll(async () => { if (schoolId) await prisma.school.delete({ where: { id: schoolId } }); await prisma.$disconnect(); });
it("initializes the full catalog idempotently without granting or replacing a role's permissions", async () => {
  const school = await prisma.school.create({ data: { code: `CATALOG-${randomUUID()}`, name: "Synthetic catalog seed", province: "Maputo", district: "KaMpfumu" } }); schoolId = school.id;
  const permission = await prisma.permission.upsert({ where: { resource_action: { resource: "students", action: "view" } }, update: {}, create: { resource: "students", action: "view" } });
  const role = await prisma.permissionRole.create({ data: { schoolId, name: "Synthetic unchanged reader", permissions: { create: { permissionId: permission.id } } } });
  const empty = await prisma.permissionRole.create({ data: { schoolId, name: "Synthetic remains empty" } });
  const before = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
  await seedPermissionCatalog(prisma);
  const catalog = await prisma.permission.findMany({ where: { OR: [...PERMISSION_CATALOG] }, orderBy: { id: "asc" } });
  expect(catalog).toHaveLength(PERMISSION_CATALOG.length);
  await seedPermissionCatalog(prisma);
  expect(await prisma.permission.findMany({ where: { OR: [...PERMISSION_CATALOG] }, orderBy: { id: "asc" } })).toEqual(catalog);
  expect(await prisma.rolePermission.findMany({ where: { roleId: role.id } })).toEqual(before);
  expect(await prisma.rolePermission.count({ where: { roleId: empty.id } })).toBe(0);
});
