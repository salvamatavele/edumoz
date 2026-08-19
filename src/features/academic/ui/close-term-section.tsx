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
import { closeTerm } from "@/features/academic/actions/close-term";
import type { TermOption } from "@/features/academic/data/term-results";
import { useRouter } from "@/i18n/navigation";

interface CloseTermSectionProps {
  readonly terms: readonly TermOption[];
}

/**
 * Fecho de trimestre — raio de acção grande (todas as disciplinas, todos os alunos), sem
 * forma de reabrir nesta fase (ver design.md, Non-Goals). Por isso nunca um botão directo:
 * sempre um ecrã de confirmação explícito antes de correr.
 */
export function CloseTermSection({ terms }: CloseTermSectionProps) {
  const t = useTranslations("termClosing");
  const router = useRouter();
  const [confirming, setConfirming] = useState<TermOption | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!confirming) return;
    setError(null);

    startTransition(async () => {
      const result = await closeTerm({ termId: confirming.id });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setConfirming(null);
      router.refresh();
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

              {term.status === "OPEN" ? (
                <Button size="sm" variant="secondary" onClick={() => setConfirming(term)}>
                  {t("trigger")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle", { term: confirming?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("confirmDescription")}</DialogDescription>
          </DialogHeader>

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
            <Button type="button" variant="destructive" disabled={isPending} onClick={handleConfirm}>
              {isPending ? t("closing") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
