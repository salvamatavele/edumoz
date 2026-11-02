"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { previewSchoolUserRemoval, removeSchoolUser } from "../data/school-user-removal";
import { hasPermission, toSessionContext } from "../domain/access";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import type { SchoolUserRemovalInput } from "../domain/school-user-removal";
import { auth } from "@/lib/auth/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

async function contextFor(expectedSchoolId: unknown) {
  const session = await auth();
  if (!session?.schoolId) throw new SchoolUserError("forbidden");
  const context = toSessionContext(session);
  if (!hasPermission(context, "users", "edit")) throw new SchoolUserError("forbidden");
  if (!matchesSchoolMutationScope(session.schoolId, expectedSchoolId)) throw new SchoolUserError("schoolChanged");
  return context;
}
export async function previewSchoolUserRemovalAction(input: { userId: string; expectedSchoolId: string }) {
  const t = await getTranslations("users");
  try {
    const context = await contextFor(input?.expectedSchoolId);
    const user = await previewSchoolUserRemoval(context, input);
    return { status: "success" as const, user };
  } catch (error) { return { status: "error" as const, message: t(error instanceof SchoolUserError ? `errors.${error.code}` : "errors.removalUnavailable") }; }
}
export async function removeSchoolUserAction(input: SchoolUserRemovalInput) {
  const t = await getTranslations("users");
  try {
    const context = await contextFor(input?.expectedSchoolId);
    await removeSchoolUser(context, input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/users" }));
    return { status: "success" as const };
  } catch (error) { return { status: "error" as const, message: t(error instanceof SchoolUserError ? `errors.${error.code}` : "errors.removalUnavailable") }; }
}
