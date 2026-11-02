"use client";

import { ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { revokeOwnSessionsAction } from "../actions/own-sessions";

type SessionRow = { id: string; current: boolean; createdAt: string; lastSeenAt: string };
export function OwnSessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<"success" | "error" | null>(null);
  const [selection, setSelection] = useState<"others" | { id: string } | null>(null);
  const format = (value: string) => new Intl.DateTimeFormat(locale === "pt" ? "pt-MZ" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" }).format(new Date(value));
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5"><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("scope")}</p><Button variant="secondary" disabled={pending || !sessions.some(row => !row.current)} onClick={() => { setMessage(null); setSelection("others"); }}>{t("endOthers")}</Button></div>
    {selection ? <Dialog open onOpenChange={open => { if (!open && !pending) setSelection(null); }}><DialogContent><DialogTitle>{t("confirmTitle")}</DialogTitle><DialogDescription>{t("confirmDescription")}</DialogDescription>{message === "error" ? <p role="alert" className="text-sm text-destructive">{t("error")}</p> : null}<div className="mt-4 flex flex-wrap gap-3"><Button disabled={pending} onClick={() => startTransition(async () => {
      try { const result = await revokeOwnSessionsAction(selection); if (result.status === "error") { setMessage("error"); return; } setSelection(null); setMessage("success"); router.refresh(); } catch { setMessage("error"); }
    })}>{pending ? t("working") : t("confirm")}</Button><Button variant="secondary" disabled={pending} onClick={() => setSelection(null)}>{t("cancel")}</Button></div></DialogContent></Dialog> : null}
    {message && !selection ? <p role={message === "error" ? "alert" : "status"} className={message === "error" ? "text-destructive" : "text-foreground"}>{t(message)}</p> : null}
    <ul className="flex flex-col gap-3">{sessions.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5"><div className="flex min-w-0 items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /><div><h2 className="font-semibold">{row.current ? t("current") : t("other")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("created", { date: format(row.createdAt) })}</p><p className="mt-1 text-sm text-muted-foreground">{t("seen", { date: format(row.lastSeenAt) })}</p></div></div>{!row.current ? <Button variant="secondary" disabled={pending} onClick={() => { setMessage(null); setSelection({ id: row.id }); }}>{t("end")}</Button> : <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t("currentBadge")}</span>}</li>)}</ul>
    <p className="text-sm text-muted-foreground">{t("limit")}</p>
  </div>;
}
