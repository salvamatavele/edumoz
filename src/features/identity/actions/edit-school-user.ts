"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { editSchoolUser, getEditableSchoolUser } from "@/features/identity/data/edit-school-user";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import type { EditableSchoolUser, EditSchoolUserInput, SchoolUserEditTarget } from "@/features/identity/domain/edit-school-user";
import { matchesSchoolMutationScope, SchoolUserError } from "@/features/identity/domain/school-users";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

type Failure = { status: "error"; message: string };
async function editContext(input: SchoolUserEditTarget) {
  const t = await getTranslations("users");
  const session = await auth();
  if (!session?.schoolId || !hasPermission(toSessionContext(session), "users", "edit")) return { error: t("errors.forbidden") } as const;
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { error: t("errors.schoolChanged") } as const;
  return { context: toSessionContext(session) } as const;
}
async function failure(error: unknown): Promise<Failure> {
  const t = await getTranslations("users");
  return { status: "error", message: t(error instanceof SchoolUserError ? `errors.${error.code}` : "errors.editUnavailable") };
}
export async function loadSchoolUserEditAction(input: SchoolUserEditTarget): Promise<{ status: "success"; user: EditableSchoolUser } | Failure> {
  const scope = await editContext(input);
  if (scope.error) return { status: "error", message: scope.error };
  try { return { status: "success", user: await getEditableSchoolUser(scope.context!, input) }; }
  catch (error) { return failure(error); }
}
export async function editSchoolUserAction(input: EditSchoolUserInput): Promise<{ status: "success" } | Failure> {
  const scope = await editContext(input);
  if (scope.error) return { status: "error", message: scope.error };
  try {
    await editSchoolUser(scope.context!, input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/users" }));
    return { status: "success" };
  } catch (error) { return failure(error); }
}
