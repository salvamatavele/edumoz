"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reopenTerm } from "@/features/academic/actions/reopen-term";
import { closeTerm } from "@/features/academic/actions/close-term";
import type { TermOption } from "@/features/academic/data/term-results";
import { useRouter } from "@/i18n/navigation";

interface CloseTermSectionProps {
  readonly canClose?: boolean;
  readonly terms: readonly TermOption[];
}

/** Closing and audited reopening share the established confirmation dialog. */
export function CloseTermSection({ terms, canClose = true }: CloseTermSectionProps) {
  const t = useTranslations("termClosing");
  const tForm = useTranslations("form");
  const router = useRouter();
  const [confirming, setConfirming] = useState<TermOption | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const isReopening = confirming?.status === "CLOSED";
  function beginConfirmation(term: TermOption) {
    setError(null);
    setReason("");
    setConfirming(term);
  }

  function handleConfirm() {
    if (!confirming) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = isReopening ? await reopenTerm({ termId: confirming.id, reason }) : await closeTerm({ termId: confirming.id });

        if (result.status === "error") {
          setError(result.message);
          return;
        }

        setConfirming(null);
        router.refresh();
      } catch { setError(tForm("genericError")); router.refresh(); }
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {terms.map((term) => (
            <li
              key={term.id}
              className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{term.name}</span>
                <Badge tone={term.status === "CLOSED" ? "neutral" : "success"}>
                  {t(`status.${term.status}`)}
                </Badge>
              </div>

              {canClose ? (
                <Button size="sm" variant="secondary" onClick={() => beginConfirmation(term)}>
                  {t(term.status === "CLOSED" ? "reopenTrigger" : "trigger")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={confirming !== null && terms.some((term) => term.id === confirming.id && term.status === confirming.status)} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(isReopening ? "reopenTitle" : "confirmTitle", { term: confirming?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t(isReopening ? "reopenDescription" : "confirmDescription")}</DialogDescription>
          </DialogHeader>

          {isReopening ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="term-reopen-reason" className="text-sm font-medium text-foreground">{t("reasonLabel")}</label>
              <textarea id="term-reopen-reason" aria-describedby="term-reopen-hint" required minLength={10} maxLength={1000} disabled={isPending} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 w-full resize-y rounded-md border border-border-strong bg-surface px-4 py-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              <p id="term-reopen-hint" className="text-sm text-muted-foreground">{t("reasonHint")}</p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setConfirming(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isPending || (isReopening && reason.trim().length < 10)} onClick={handleConfirm}>
              {isPending ? t(isReopening ? "reopening" : "closing") : t(isReopening ? "reopenConfirm" : "confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
