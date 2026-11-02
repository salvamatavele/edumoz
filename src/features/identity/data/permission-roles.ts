import { hasLegacyFullProfileAccess } from "../domain/functional-permissions";
import { countSchoolRoleMembers } from "./permission-role-member-counts";
import { ROLE_OPTION_PAGE_SIZE } from "../domain/membership-role-schema";
import { z } from "zod";
import type { PermissionAction, PermissionResource } from "@/features/identity/domain/permission-catalog";
import { getTenantDb } from "@/lib/db/tenant";

export interface PermissionCatalogEntryRow {
  readonly id: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

/** Catálogo global, com os ids que `RolePermission` referencia. Não é por escola. */
export async function listPermissionCatalog(schoolId: string): Promise<PermissionCatalogEntryRow[]> {
  const db = getTenantDb(schoolId);

  const rows = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    resource: row.resource as PermissionResource,
    action: row.action as PermissionAction,
  }));
}

export interface PermissionRoleRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissionIds: readonly string[];
  readonly memberCount: number;
  readonly isSystem: boolean;
}

/** Papéis configuráveis da escola, com as suas permissões marcadas. */
export async function listPermissionRoles(schoolId: string): Promise<PermissionRoleRow[]> {
  const db = getTenantDb(schoolId);

  const roles = await db.permissionRole.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { permissionId: true } },

    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
  });

  const memberCounts = await countSchoolRoleMembers(schoolId);
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissionIds: role.permissions.map((p) => p.permissionId),
    memberCount: memberCounts.get(role.id) ?? 0,
    isSystem: role.isSystem,
  }));
}

export interface AssignableStaffRow {
  readonly membershipId: string;
  readonly userName: string;
  readonly baseRole: "SCHOOL_MANAGER" | "TEACHER";
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly mode: "legacy" | "configured";
  readonly assignedRoleCount: number;
  readonly isCurrentUser: boolean;
  readonly overrideCount?: number;
  readonly activeOverrideCount?: number;
}
export const assignableStaffQuerySchema = z.object({
  staffQuery: z.string().trim().max(120).default(""),
  staffPage: z.coerce.number().int().min(1).max(10000).default(1),
});
export interface AssignableStaffPage {
  readonly rows: readonly AssignableStaffRow[];
  readonly query: string;
  readonly page: number;
  readonly total: number;
  readonly pageCount: number;
}

/** Bounded staff associations; only the server decides which row belongs to the viewer. */
export async function listAssignableStaff(schoolId: string, viewerUserId: string, input: z.infer<typeof assignableStaffQuerySchema>): Promise<AssignableStaffPage> {
  const db = getTenantDb(schoolId);
  const where = { role: { in: ["SCHOOL_MANAGER", "TEACHER"] as ("SCHOOL_MANAGER" | "TEACHER")[] }, status: { in: ["ACTIVE", "SUSPENDED"] as ("ACTIVE" | "SUSPENDED")[] }, user: { isPlatformAdmin: false, ...(input.staffQuery ? { name: { contains: input.staffQuery } } : {}) } };
  const total = await db.membership.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ROLE_OPTION_PAGE_SIZE));
  const page = Math.min(input.staffPage, pageCount);
  const memberships = await db.membership.findMany({
    where, skip: (page - 1) * ROLE_OPTION_PAGE_SIZE, take: ROLE_OPTION_PAGE_SIZE,
    select: { id: true, role: true, status: true, permissionRoleId: true, permissionsConfigured: true, _count: { select: { permissionOverrides: true } }, assignedRoles: { select: { permissionRoleId: true } }, user: { select: { id: true, name: true } } },
    orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
  });
  const activeAssociations = memberships.length ? await db.membership.findMany({ where: { userId: { in: [...new Set(memberships.map(member => member.user.id))] }, status: "ACTIVE", role: { in: ["SCHOOL_MANAGER", "TEACHER"] } }, select: { userId: true, _count: { select: { permissionOverrides: true } } } }) : [];
  const activeOverrides = new Map<string, number>();
  for (const member of activeAssociations) activeOverrides.set(member.userId, (activeOverrides.get(member.userId) ?? 0) + member._count.permissionOverrides);
  return { query: input.staffQuery, total, page, pageCount, rows: memberships.map(member => ({
    membershipId: member.id, userName: member.user.name ?? "",
    baseRole: member.role as "SCHOOL_MANAGER" | "TEACHER", status: member.status as "ACTIVE" | "SUSPENDED", mode: hasLegacyFullProfileAccess(member) ? "legacy" : "configured",
    assignedRoleCount: new Set([...member.assignedRoles.map(row => row.permissionRoleId), ...(member.role === "SCHOOL_MANAGER" && member.permissionRoleId ? [member.permissionRoleId] : [])]).size,
    isCurrentUser: member.user.id === viewerUserId,
    overrideCount: member._count.permissionOverrides, activeOverrideCount: activeOverrides.get(member.user.id) ?? 0,
  })) };
}
