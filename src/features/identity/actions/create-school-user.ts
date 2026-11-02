"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createSchoolUser, reissueInitialSchoolCredential } from "@/features/identity/data/create-school-user";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import type { CreateSchoolUserInput, CreateSchoolUserResult, ReissueInitialCredentialInput } from "@/features/identity/domain/create-school-user";
import { matchesSchoolMutationScope, SchoolUserError } from "@/features/identity/domain/school-users";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";

export async function createSchoolUserAction(input: CreateSchoolUserInput): Promise<CreateSchoolUserResult | { status: "error"; message: string }> {
  const t = await getTranslations("users");
  const session = await auth();
  if (!session?.schoolId) return { status: "error", message: t("errors.forbidden") };
  const context = toSessionContext(session);
  if (!hasPermission(context, "users", "create")) return { status: "error", message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error", message: t("errors.schoolChanged") };
  try {
    const result = await createSchoolUser(context, input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/users" }));
    return result;
  } catch (error) {
    if (error instanceof SchoolUserError) return { status: "error", message: t(`errors.${error.code}`) };
    // Never serialize database error payloads, contacts or credential hashes to the client.
    return { status: "error", message: t("errors.creationUnavailable") };
  }
}

export async function reissueInitialCredentialAction(input: ReissueInitialCredentialInput): Promise<CreateSchoolUserResult | { status: "error"; message: string }> {
  const t = await getTranslations("users");
  const session = await auth();
  if (!session?.schoolId) return { status: "error", message: t("errors.forbidden") };
  const context = toSessionContext(session);
  if (!hasPermission(context, "users", "create")) return { status: "error", message: t("errors.forbidden") };
  if (!matchesSchoolMutationScope(session.schoolId, input?.expectedSchoolId)) return { status: "error", message: t("errors.schoolChanged") };
  try {
    const result = await reissueInitialSchoolCredential(context, input);
    for (const locale of routing.locales) revalidatePath(getPathname({ locale, href: "/users" }));
    return result;
  } catch (error) {
    return { status: "error", message: t(error instanceof SchoolUserError ? `errors.${error.code}` : "errors.creationUnavailable") };
  }
}
