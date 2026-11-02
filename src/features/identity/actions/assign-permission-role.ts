"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { FormActionResult } from "@/components/form/field-schema";
import { assignSchoolPermissionRole } from "../data/assign-permission-role";
import { isUnrestrictedSchoolAdministrator, toSessionContext } from "../domain/access";
import { assignPermissionRoleSchema, type AssignPermissionRoleInput } from "../domain/permission-role-schema";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

export async function assignPermissionRole(values: AssignPermissionRoleInput): Promise<FormActionResult<AssignPermissionRoleInput>> {
  const t = await getTranslations();
  const session = await auth();
  if (!session?.schoolId || !isUnrestrictedSchoolAdministrator(toSessionContext(session))) return { status: "error", message: t("common.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, values?.expectedSchoolId)) return { status: "error", message: t("users.errors.schoolChanged") };
  const parsed = assignPermissionRoleSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: t("common.forbidden") };
  try { await assignSchoolPermissionRole(toSessionContext(session), parsed.data); }
  catch (error) { return { status: "error", message: t(error instanceof SchoolUserError ? `users.errors.${error.code}` : "permissionRoles.errors.assignFailed") }; }
  for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/settings" }));
  return { status: "success" };
}
