/**
 * Catálogo fixo de recursos e acções — a fonte de verdade do que É PERMITIDO CONFIGURAR,
 * não do que está configurado (isso vive em `PermissionRole`/`RolePermission`, na base de
 * dados). Um recurso só entra aqui se houver mesmo uma verificação real no código a
 * aplicá-lo — um superadmin escolhe combinações, nunca inventa capacidades novas. Ver
 * openspec/changes/permissions-management/design.md.
 */

export const PERMISSION_RESOURCES = [
  "students",
  "enrollments",
  "attendance",
  "grades",
  "term-closing",
  "report-cards",
  "academic-structure",
  "teaching-staff",
  "assessment-schemes",
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

/**
 * "editar" cobre também "actualizar" — são a mesma operação (mudar um registo
 * existente); distingui-las não teria nenhuma diferença observável.
 */
export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionCatalogEntry {
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

/** Todas as combinações recurso × acção — o que `seed-permissions.ts` semeia. */
export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = PERMISSION_RESOURCES.flatMap(
  (resource) => PERMISSION_ACTIONS.map((action) => ({ resource, action })),
);
