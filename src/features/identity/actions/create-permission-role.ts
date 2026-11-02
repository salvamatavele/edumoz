"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { FormActionResult } from "@/components/form/field-schema";
import { createSchoolPermissionRole } from "../data/create-permission-role";
import { isUnrestrictedSchoolAdministrator, toSessionContext } from "../domain/access";
import { createPermissionRoleSchema, PermissionRoleError, type CreatePermissionRoleInput } from "../domain/permission-role-schema";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

export async function createPermissionRole(values: CreatePermissionRoleInput): Promise<FormActionResult<CreatePermissionRoleInput>> {
  const t = await getTranslations();
  const session = await auth();
  if (!session?.schoolId || !isUnrestrictedSchoolAdministrator(toSessionContext(session))) return { status: "error", message: t("common.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, values?.expectedSchoolId)) return { status: "error", message: t("users.errors.schoolChanged") };
  const parsed = createPermissionRoleSchema.safeParse(values);
  if (!parsed.success) return parsed.error.issues.some(issue => issue.path[0] === "name") ? { status: "error", fieldErrors: { name: t("permissionRoles.errors.name") } } : { status: "error", message: t("permissionRoles.errors.createFailed") };
  try {
    const role = await createSchoolPermissionRole(toSessionContext(session), parsed.data);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/settings" }));
    return { status: "success", message: role.name };
  } catch (error) {
    return { status: "error", message: t(error instanceof SchoolUserError ? `users.errors.${error.code}` : error instanceof PermissionRoleError ? `permissionRoles.errors.${error.code}` : "permissionRoles.errors.createFailed") };
  }
}
