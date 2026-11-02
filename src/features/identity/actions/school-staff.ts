"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getSchoolStaff, saveSchoolStaff } from "../data/school-staff";
import { hasPermission, toSessionContext } from "../domain/access";
import { SchoolStaffError, type SchoolStaffInput } from "../domain/school-staff";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import { auth } from "@/lib/auth/config";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
async function execute<T>(input: { expectedSchoolId: string }, action: "create" | "edit", operation: (context: ReturnType<typeof toSessionContext>) => Promise<T>) {
  const t = await getTranslations("staff");
  const session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "school-staff", action)) return { status: "error" as const, message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error" as const, message: t("errors.schoolChanged") };
  try { return { status: "success" as const, data: await operation(toSessionContext(session)) }; }
  catch (error) { return { status: "error" as const, message: t(`errors.${error instanceof SchoolStaffError ? error.code : error instanceof SchoolUserError && error.code === "forbidden" ? "forbidden" : "unavailable"}`) }; }
}
export async function loadSchoolStaffAction(input: { id: string; expectedSchoolId: string }) {
  return execute(input, "edit", context => getSchoolStaff(context, input.id));
}
export async function saveSchoolStaffAction(input: SchoolStaffInput) {
  return execute(input, input?.id ? "edit" : "create", async context => {
    await saveSchoolStaff(context, input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/staff" }));
    return null;
  });
}
