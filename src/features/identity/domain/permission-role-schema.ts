import { z } from "zod";

/**
 * Criação/edição de um `PermissionRole`. `permissionIds` são cuids do catálogo fixo
 * (`Permission`, semeado por `seed-permissions.ts`) — o formulário é uma grelha de
 * checkboxes recurso×acção, não campos livres; a Server Action confirma que cada id
 * pertence mesmo ao catálogo antes de gravar (ver `create-permission-role.ts`).
 */
export const createPermissionRoleSchema = z.object({
  expectedSchoolId: z.string().trim().min(1).max(191),
  requestId: z.uuid(),
  name: z.string().trim().min(3).max(120).refine(value => /[\p{L}\p{N}]/u.test(value)),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  permissionIds: z.array(z.string().trim().min(1).max(191)).max(500),
});

export type CreatePermissionRoleInput = z.infer<typeof createPermissionRoleSchema>;

/**
 * Atribuição de um papel a uma `Membership` de gestor. `permissionRoleId: null` remove a
 * restrição — a `Membership` volta a ter acesso total, o comportamento por omissão.
 */
export const assignPermissionRoleSchema = z.object({
  expectedSchoolId: z.string().trim().min(1).max(191),
  membershipId: z.string().trim().min(1),
  permissionRoleId: z.string().trim().min(1).nullable(),
});

export type AssignPermissionRoleInput = z.infer<typeof assignPermissionRoleSchema>;

export class PermissionRoleError extends Error {
  constructor(readonly code: "invalid" | "duplicateName" | "requestChanged" | "notFound" | "conflict" | "protectedRole" | "roleInUse") { super(code); }
}

export const permissionRoleTargetSchema = z.object({
  id: z.string().trim().min(1).max(191),
  expectedSchoolId: z.string().trim().min(1).max(191),
});
export const editPermissionRoleSchema = createPermissionRoleSchema.omit({ requestId: true }).extend({
  id: z.string().trim().min(1).max(191), revision: z.iso.datetime(),
});
export const deletePermissionRoleSchema = permissionRoleTargetSchema.extend({ revision: z.iso.datetime() });
export interface EditablePermissionRole {
  id: string; name: string; description: string; permissionIds: string[];
  revision: string; isSystem: boolean; memberCount: number;
}
