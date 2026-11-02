"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeOwnSessionsAction } from "../actions/own-sessions";

export function SignOutButton() {
  const t = useTranslations("sessions");
  const auth = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return <div className="flex flex-col items-end gap-1"><Button type="button" variant="ghost" size="icon" aria-label={auth("signOut")} disabled={pending} aria-busy={pending} onClick={() => {
    setError(false);
    startTransition(async () => {
      try {
        const result = await revokeOwnSessionsAction("current");
        if (result.status !== "success") { setError(true); return; }
        await signOut({ callbackUrl: "/" });
      } catch { setError(true); }
    });
  }}><LogOut aria-hidden="true" className="size-5" strokeWidth={1.75} /></Button>{error ? <p role="alert" className="max-w-48 text-xs text-destructive">{t("error")}</p> : null}</div>;
}
