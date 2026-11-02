"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { installSchoolSystemRoles } from "../data/install-system-roles";
import { isUnrestrictedSchoolAdministrator, toSessionContext } from "../domain/access";
import { PermissionRoleError } from "../domain/permission-role-schema";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import { auth } from "@/lib/auth/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function installSystemRolesAction(input: { expectedSchoolId: string }) {
  const t = await getTranslations();
  try {
    const session = await auth();
    if (!session?.schoolId || !isUnrestrictedSchoolAdministrator(toSessionContext(session))) throw new SchoolUserError("forbidden");
    if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) throw new SchoolUserError("schoolChanged");
    const result = await installSchoolSystemRoles(toSessionContext(session), session.schoolId);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/settings" }));
    return { status: "success" as const, created: result.created };
  } catch (error) {
    return { status: "error" as const, message: t(error instanceof SchoolUserError ? `users.errors.${error.code}` : error instanceof PermissionRoleError ? `permissionRoles.errors.${error.code}` : "permissionRoles.errors.operationFailed") };
  }
}
