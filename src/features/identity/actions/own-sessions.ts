"use server";

import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { revokeOwnSessions } from "@/lib/auth/own-sessions";

export async function revokeOwnSessionsAction(target: "current" | "others" | { id: string }) {
  const t = await getTranslations("sessions");
  try {
    const session = await auth();
    // An invalid session is already unable to authenticate; permit clearing its cookie.
    if (!session?.user?.id && target === "current") return { status: "success" as const };
    if (!session?.user?.id || !session.user.authSessionId || !(target === "current" || target === "others" || (typeof target === "object" && target !== null && typeof target.id === "string"))) return { status: "error" as const, message: t("error") };
    await revokeOwnSessions({ userId: session.user.id, authVersion: session.user.authVersion ?? 0, authSessionId: session.user.authSessionId }, target);
    return { status: "success" as const };
  } catch { return { status: "error" as const, message: t("error") }; }
}
