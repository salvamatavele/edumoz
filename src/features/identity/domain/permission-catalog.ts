/**
 * Catálogo fixo de recursos e acções — a fonte de verdade do que É PERMITIDO CONFIGURAR,
 * não do que está configurado (isso vive em `PermissionRole`/`RolePermission`, na base de
 * dados). Um recurso só entra aqui se houver mesmo uma verificação real no código a
 * aplicá-lo — um superadmin escolhe combinações, nunca inventa capacidades novas. Ver
 * openspec/changes/permissions-management/design.md.
 */

export const PERMISSION_RESOURCES = [
  "users",
  "school-staff",
  "students",
  "enrollments",
  "attendance",
  "grades",
  "term-closing",
  "report-cards",
  "academic-structure",
  "teaching-staff",
  "assessment-schemes",
  "finance",
  "scheduling",
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
  (resource) => PERMISSION_ACTIONS.filter((action) => !["users", "school-staff"].includes(resource) || action !== "delete").map((action) => ({ resource, action })),
);

/** Only these pairs currently protect a real administrative page or mutation. */
export const CONSUMED_PERMISSION_ACTIONS = {
  users: ["view", "create", "edit"],
  "school-staff": ["view", "create", "edit"],
  students: ["view", "create"],
  enrollments: ["create"],
  attendance: ["view", "edit"],
  grades: [],
  "term-closing": ["view", "edit"],
  "report-cards": ["view"],
  "academic-structure": ["view", "create"],
  "teaching-staff": ["view", "create"],
  "assessment-schemes": ["view", "create"],
  finance: ["view", "create", "edit"],
  scheduling: ["view", "create", "edit"],
} as const satisfies Record<PermissionResource, readonly PermissionAction[]>;
export function isConsumedPermission(resource: string, action: string): boolean {
  return Object.hasOwn(CONSUMED_PERMISSION_ACTIONS, resource)
    && (CONSUMED_PERMISSION_ACTIONS[resource as PermissionResource] as readonly string[]).includes(action);
}
export const CONSUMED_PERMISSION_CATALOG = PERMISSION_CATALOG.filter(row => isConsumedPermission(row.resource, row.action));
