import { z } from "zod";

/**
 * Criação/edição de um `PermissionRole`. `permissionIds` são cuids do catálogo fixo
 * (`Permission`, semeado por `seed-permissions.ts`) — o formulário é uma grelha de
 * checkboxes recurso×acção, não campos livres; a Server Action confirma que cada id
 * pertence mesmo ao catálogo antes de gravar (ver `create-permission-role.ts`).
 */
export const createPermissionRoleSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  permissionIds: z.array(z.string().trim().min(1)),
});

export type CreatePermissionRoleInput = z.infer<typeof createPermissionRoleSchema>;

/**
 * Atribuição de um papel a uma `Membership` de gestor. `permissionRoleId: null` remove a
 * restrição — a `Membership` volta a ter acesso total, o comportamento por omissão.
 */
export const assignPermissionRoleSchema = z.object({
  membershipId: z.string().trim().min(1),
  permissionRoleId: z.string().trim().min(1).nullable(),
});

export type AssignPermissionRoleInput = z.infer<typeof assignPermissionRoleSchema>;
