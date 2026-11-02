"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { loadSchoolPermissionRole, saveSchoolPermissionRole, deleteSchoolPermissionRole } from "../data/permission-role-management";
import { isUnrestrictedSchoolAdministrator, toSessionContext } from "../domain/access";
import { PermissionRoleError, type permissionRoleTargetSchema, type editPermissionRoleSchema, type deletePermissionRoleSchema } from "../domain/permission-role-schema";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
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
function refreshSettings() { for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/settings" })); }
export async function loadPermissionRoleAction(input: z.infer<typeof permissionRoleTargetSchema>) {
  const t = await getTranslations();
  try { return { status: "success" as const, role: await loadSchoolPermissionRole(await contextFor(input?.expectedSchoolId), input) }; }
  catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
export async function savePermissionRoleAction(input: z.infer<typeof editPermissionRoleSchema>) {
  const t = await getTranslations();
  try { await saveSchoolPermissionRole(await contextFor(input?.expectedSchoolId), input); refreshSettings(); return { status: "success" as const }; }
  catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
export async function deletePermissionRoleAction(input: z.infer<typeof deletePermissionRoleSchema>) {
  const t = await getTranslations();
  try { await deleteSchoolPermissionRole(await contextFor(input?.expectedSchoolId), input); refreshSettings(); return { status: "success" as const }; }
  catch (error) { return { status: "error" as const, message: t(errorKey(error)) }; }
}
