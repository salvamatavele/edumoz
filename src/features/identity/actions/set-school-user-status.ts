"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { changeSchoolUserStatus } from "@/features/identity/data/school-user-status";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { matchesSchoolMutationScope, SchoolUserError, type SchoolUserStatusInput } from "@/features/identity/domain/school-users";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

export async function setSchoolUserStatus(input: SchoolUserStatusInput): Promise<{ status: "success" } | { status: "error"; message: string }> {
  const t = await getTranslations("users");
  const session = await auth();
  if (!session?.schoolId) return { status: "error", message: t("errors.forbidden") };
  const context = toSessionContext(session);
  if (!hasPermission(context, "users", "edit")) return { status: "error", message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error", message: t("errors.schoolChanged") };
  try { await changeSchoolUserStatus(context, input); }
  catch (error) {
    if (error instanceof SchoolUserError) return { status: "error", message: t(`errors.${error.code}`) };
    throw error;
  }
  for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/users" }));
  return { status: "success" };
}
