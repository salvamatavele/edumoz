"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/** Botão de impressão do recibo — `window.print()` só existe no cliente. */
export function ReceiptPrintButton() {
  const t = useTranslations("finance");

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden="true" strokeWidth={1.75} />
      {t("receipt.printTrigger")}
    </Button>
  );
}
