"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getSchoolUserTeacherLink, previewSchoolUserTeacherLink, changeSchoolUserTeacherLink } from "@/features/identity/data/school-user-teacher-link";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { matchesSchoolMutationScope, SchoolUserError } from "@/features/identity/domain/school-users";
import type { ChangeTeacherLinkInput, PreviewTeacherLinkInput, TeacherLinkTarget } from "@/features/identity/domain/school-user-teacher-link";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

async function execute<T>(input: TeacherLinkTarget, operation: (context: ReturnType<typeof toSessionContext>) => Promise<T>) {
  const t = await getTranslations("users");
  const session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "users", "edit")) return { status: "error" as const, message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error" as const, message: t("errors.schoolChanged") };
  try { return { status: "success" as const, data: await operation(toSessionContext(session)) }; }
  catch (error) { return { status: "error" as const, message: t(error instanceof SchoolUserError ? `errors.${error.code}` : "errors.linkUnavailable") }; }
}
export async function loadTeacherLinkAction(input: TeacherLinkTarget) {
  return execute(input, context => getSchoolUserTeacherLink(context, input));
}
export async function previewTeacherLinkAction(input: PreviewTeacherLinkInput) {
  return execute(input, context => previewSchoolUserTeacherLink(context, input));
}
export async function changeTeacherLinkAction(input: ChangeTeacherLinkInput) {
  return execute(input, async context => {
    await changeSchoolUserTeacherLink(context, input);
    for (const locale of routing.locales) for (const href of ["/users", "/teachers"] as const) revalidatePath(getPathname({ locale, href }));
    return null;
  });
}
