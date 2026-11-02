"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { loadSchoolMembershipRoles, searchSchoolPermissionRoles, saveSchoolMembershipRoles } from "../data/membership-permission-roles";
import { isUnrestrictedSchoolAdministrator, toSessionContext } from "../domain/access";
import { PermissionRoleError } from "../domain/permission-role-schema";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import type { membershipRoleTargetSchema, membershipRoleOptionsSchema, MembershipRoleChangeInput } from "../domain/membership-role-schema";
import type { z } from "zod";
import { auth } from "@/lib/auth/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

async function contextFor(expectedSchoolId: unknown) {
  const session = await auth();
  if (!session?.schoolId || !isUnrestrictedSchoolAdministrator(toSessionContext(session))) throw new SchoolUserError("forbidden");
  if (!matchesSchoolMutationScope(session.schoolId, expectedSchoolId)) throw new SchoolUserError("schoolChanged");
  return toSessionContext(session);
}
function errorKey(error: unknown) {
  return error instanceof SchoolUserError ? `users.errors.${error.code}` : error instanceof PermissionRoleError ? `permissionRoles.errors.${error.code}` : "permissionRoles.errors.operationFailed";
}
export async function loadMembershipRolesAction(input: z.infer<typeof membershipRoleTargetSchema>) {
  const t = await getTranslations();
  try { return { status: "success" as const, preview: await loadSchoolMembershipRoles(await contextFor(input?.expectedSchoolId), input) }; }
  catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
export async function searchMembershipRoleOptionsAction(input: z.infer<typeof membershipRoleOptionsSchema>) {
  const t = await getTranslations();
  try { return { status: "success" as const, options: await searchSchoolPermissionRoles(await contextFor(input?.expectedSchoolId), input) }; }
  catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
export async function saveMembershipRolesAction(input: MembershipRoleChangeInput) {
  const t = await getTranslations();
  try {
    await saveSchoolMembershipRoles(await contextFor(input?.expectedSchoolId), input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/settings" }));
    return { status: "success" as const };
  } catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
