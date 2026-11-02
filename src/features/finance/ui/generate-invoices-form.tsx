"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInvoices } from "@/features/finance/actions/generate-invoices";
import { useRouter } from "@/i18n/navigation";

interface GenerateInvoicesFormProps {
  readonly feeSchedules: ReadonlyArray<{ readonly id: string; readonly name: string }>;
}

/**
 * Geração de facturas em lote — sempre uma acção real (não um GET), porque escreve na
 * base de dados. Mostra quantas facturas foram criadas e quantas já existiam (a acção é
 * idempotente por matrícula+período, ver `generate-invoices.ts`).
 */
export function GenerateInvoicesForm({ feeSchedules }: GenerateInvoicesFormProps) {
  const t = useTranslations("finance");
  const tForm = useTranslations("form");
  const router = useRouter();
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [feeScheduleId, setFeeScheduleId] = useState(feeSchedules[0]?.id ?? "");
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await generateInvoices({
          feeScheduleId,
          periodYear: Number(periodYear),
          periodMonth: periodMonth ? Number(periodMonth) : undefined,
        });

        if (result.status === "error") {
          setError(result.message ?? tForm("genericError"));
          return;
        }

        setMessage(
          t("invoicing.generateResult", { created: result.created ?? 0, skipped: result.skipped ?? 0 }),
        );
        router.refresh();
      } catch { setError(tForm("genericError")); router.refresh(); }
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">{t("invoicing.generateTitle")}</h3>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      ) : null}

      {message ? (
        <p role="status" className="rounded-md border border-success bg-success-surface p-3 text-sm text-success">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-schedule`}>{t("invoicing.fields.feeScheduleId")}</Label>
          <Select disabled={isPending} value={feeScheduleId} onValueChange={setFeeScheduleId}>
            <SelectTrigger id={`${formId}-schedule`} className="h-12">
              <SelectValue placeholder={tForm("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {feeSchedules.map((schedule) => (
                <SelectItem key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          label={t("invoicing.fields.periodYear")}
          type="number"
          required
          disabled={isPending}
          value={periodYear}
          onChange={(event) => setPeriodYear(event.target.value)}
        />

        <Input
          label={t("invoicing.fields.periodMonth")}
          type="number"
          min={1}
          max={12}
          helperText={t("invoicing.periodMonthHelper")}
          disabled={isPending}
          value={periodMonth}
          onChange={(event) => setPeriodMonth(event.target.value)}
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending || !feeScheduleId}>
          {isPending ? tForm("saving") : t("invoicing.generateTrigger")}
        </Button>
      </div>
    </form>
  );
}
