"use server";

import { getTranslations } from "next-intl/server";
import { PasswordChangeError, type ChangePasswordInput } from "@/features/identity/domain/change-password";
import { auth } from "@/lib/auth/config";
import { changeOwnPassword } from "@/lib/auth/change-password";

export async function changeOwnPasswordAction(input: ChangePasswordInput): Promise<{ status: "success" } | { status: "error"; message: string }> {
  const t = await getTranslations("passwordChange");
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: t("errors.forbidden") };
  try {
    await changeOwnPassword({ userId: session.user.id, authVersion: session.user.authVersion ?? 0 }, input);
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: t(error instanceof PasswordChangeError ? `errors.${error.code}` : "errors.unavailable") };
  }
}
