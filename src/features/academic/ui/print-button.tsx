"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/** Botão de impressão — `window.print()` só existe no cliente. */
export function PrintButton() {
  const t = useTranslations("scheduling");

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden="true" strokeWidth={1.75} />
      {t("print.trigger")}
    </Button>
  );
}
