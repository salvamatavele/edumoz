"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { loadMembershipPermissions } from "@/features/identity/data/permissions";
import {
  createPermissionRoleSchema,
  type CreatePermissionRoleInput,
} from "@/features/identity/domain/permission-role-schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";
import { Role } from "@/types";

/**
 * Cria um papel configurável. Só quem já tem acesso total pode geri-los — um gestor
 * restrito (com `permissionRoleId` já atribuído a si próprio) não pode criar nem alterar
 * papéis, para não se auto-conceder permissões que o seu papel actual não tem. Ver
 * openspec/changes/permissions-management/design.md.
 */
export async function createPermissionRole(
  values: CreatePermissionRoleInput,
): Promise<FormActionResult<CreatePermissionRoleInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  if (!session.isPlatformAdmin) {
    if (session.role !== Role.SCHOOL_MANAGER) {
      return { status: "error", message: t("common.forbidden") };
    }

    const { permissionRoleId } = await loadMembershipPermissions(session.schoolId, session.user.id);

    if (permissionRoleId) {
      return { status: "error", message: t("common.forbidden") };
    }
  }

  const parsed = createPermissionRoleSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", fieldErrors: { name: t("permissionRoles.errors.name") } };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  // Ids arbitrários vindos do cliente são filtrados contra o catálogo real — só sobrevive
  // o que corresponde mesmo a um `Permission` semeado (ver permission-role-schema.ts).
  const validPermissions = await db.permission.findMany({
    where: { id: { in: data.permissionIds } },
    select: { id: true },
  });

  const role = await db.$transaction(async (tx) => {
    const created = await tx.permissionRole.create({
      data: {
        schoolId,
        name: data.name,
        description: data.description || null,
        permissions: { create: validPermissions.map((p) => ({ permissionId: p.id })) },
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "permissionRole.create",
        entity: "PermissionRole",
        entityId: created.id,
        after: JSON.parse(JSON.stringify(created)),
      },
    });

    return created;
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/settings" }));
  }

  return { status: "success", message: role.name };
}
