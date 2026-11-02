"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getSchoolUserStaffLink, previewSchoolUserStaffLink, changeSchoolUserStaffLink } from "../data/school-user-staff-link";
import { hasPermission, toSessionContext } from "../domain/access";
import { matchesSchoolMutationScope, SchoolUserError } from "../domain/school-users";
import type { ProfessionalChangeInput, ProfessionalPreviewInput } from "../domain/professional-link";
import type { TeacherLinkTarget } from "../domain/school-user-teacher-link";
import { auth } from "@/lib/auth/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
async function execute<T>(input: TeacherLinkTarget, operation: (context: ReturnType<typeof toSessionContext>) => Promise<T>) {
  const t = await getTranslations("users"); const session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "users", "edit")) return { status: "error" as const, message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error" as const, message: t("errors.schoolChanged") };
  try { return { status: "success" as const, data: await operation(toSessionContext(session)) }; }
  catch (error) { return { status: "error" as const, message: t(error instanceof SchoolUserError ? `errors.${error.code === "linkUnavailable" ? "staffLinkUnavailable" : error.code}` : "errors.staffLinkUnavailable") }; }
}
export async function loadStaffLinkAction(input: TeacherLinkTarget) { return execute(input, context => getSchoolUserStaffLink(context, input)); }
export async function previewStaffLinkAction(input: ProfessionalPreviewInput) { return execute(input, context => previewSchoolUserStaffLink(context, input)); }
export async function changeStaffLinkAction(input: ProfessionalChangeInput) {
  return execute(input, async context => {
    await changeSchoolUserStaffLink(context, input);
    for (const locale of routing.locales) for (const href of ["/users", "/staff"] as const) revalidatePath(getPathname({ locale, href }));
    return null;
  });
}
