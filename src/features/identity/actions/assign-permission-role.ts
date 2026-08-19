"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { loadMembershipPermissions } from "@/features/identity/data/permissions";
import {
  assignPermissionRoleSchema,
  type AssignPermissionRoleInput,
} from "@/features/identity/domain/permission-role-schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";
import { Role } from "@/types";

/**
 * Atribui (ou remove, com `permissionRoleId: null`) um papel configurável a uma
 * `Membership` de gestor. Mesma autorização de `createPermissionRole` — só quem já tem
 * acesso total, e nunca a própria `Membership` de quem está a atribuir (um gestor restrito
 * não se pode promover a si próprio removendo a sua própria restrição).
 */
export async function assignPermissionRole(
  values: AssignPermissionRoleInput,
): Promise<FormActionResult<AssignPermissionRoleInput>> {
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

  const parsed = assignPermissionRoleSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("common.forbidden") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const membership = await db.membership.findFirst({
    where: { id: data.membershipId, role: "SCHOOL_MANAGER" },
    select: { id: true, userId: true, permissionRoleId: true },
  });

  if (!membership) {
    return { status: "error", message: t("permissionRoles.errors.membershipNotFound") };
  }

  if (data.permissionRoleId) {
    const role = await db.permissionRole.findFirst({ where: { id: data.permissionRoleId }, select: { id: true } });

    if (!role) {
      return { status: "error", message: t("permissionRoles.errors.roleNotFound") };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membership.id },
      data: { permissionRoleId: data.permissionRoleId },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "membership.assignPermissionRole",
        entity: "Membership",
        entityId: membership.id,
        before: { permissionRoleId: membership.permissionRoleId },
        after: { permissionRoleId: data.permissionRoleId },
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/settings" }));
  }

  return { status: "success" };
}
