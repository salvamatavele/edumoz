"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmPayment } from "@/features/finance/actions/confirm-payment";
import { initiateMobileMoneyPayment } from "@/features/finance/actions/initiate-mobile-money-payment";
import { recordManualPayment } from "@/features/finance/actions/record-manual-payment";
import { reversePayment } from "@/features/finance/actions/reverse-payment";
import type { InvoiceForPayment, PaymentRow } from "@/features/finance/data/payments";
import { Link, useRouter } from "@/i18n/navigation";
import { PaymentProvider, type InvoiceStatus, type PaymentStatus } from "@/types";

type ProviderValue = (typeof PaymentProvider)[keyof typeof PaymentProvider];

interface PaymentManagerProps {
  readonly invoice: InvoiceForPayment;
}

const INVOICE_STATUS_TONE: Record<InvoiceStatus, "neutral" | "warning" | "destructive" | "success"> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  PAID: "success",
  CANCELLED: "neutral",
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, "neutral" | "warning" | "destructive" | "success"> = {
  INITIATED: "neutral",
  PENDING: "warning",
  CONFIRMED: "success",
  FAILED: "destructive",
  REVERSED: "destructive",
};

const MANUAL_METHODS = ["CASH", "BANK_DEPOSIT", "BANK_TRANSFER"] as const;

function ErrorBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive bg-destructive-surface p-3 text-sm text-destructive">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      {message}
    </p>
  );
}

export function PaymentManager({ invoice }: PaymentManagerProps) {
  const t = useTranslations("finance");
  const tForm = useTranslations("form");
  const router = useRouter();
  const formId = useId();

  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState<(typeof MANUAL_METHODS)[number]>("CASH");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  const [provider, setProvider] = useState<ProviderValue>(Object.values(PaymentProvider)[0]);
  const [payerPhone, setPayerPhone] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [mobileMessage, setMobileMessage] = useState<string | null>(null);

  const [reversingPayment, setReversingPayment] = useState<PaymentRow | null>(null);
  const [reason, setReason] = useState("");
  const [reverseError, setReverseError] = useState<string | null>(null);

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    setManualError(null);
    setManualMessage(null);

    startTransition(async () => {
      const result = await recordManualPayment({
        invoiceId: invoice.id,
        amount: Number(manualAmount),
        method: manualMethod,
      });

      if (result.status === "error") {
        setManualError(result.message ?? tForm("genericError"));
        return;
      }

      setManualAmount("");
      setManualMessage(t("payments.manualSuccess"));
      router.refresh();
    });
  }

  function handleMobileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMobileError(null);
    setMobileMessage(null);

    startTransition(async () => {
      const result = await initiateMobileMoneyPayment({
        invoiceId: invoice.id,
        provider,
        payerPhone,
      });

      if (result.status === "error") {
        setMobileError(result.message ?? tForm("genericError"));
        return;
      }

      setPayerPhone("");
      setMobileMessage(t("payments.mobileMoneySuccess"));
      router.refresh();
    });
  }

  function handleConfirm(paymentId: string) {
    setConfirmingId(paymentId);

    startTransition(async () => {
      await confirmPayment({ paymentId });
      setConfirmingId(null);
      router.refresh();
    });
  }

  function handleReverse() {
    if (!reversingPayment) return;
    setReverseError(null);

    startTransition(async () => {
      const result = await reversePayment({ paymentId: reversingPayment.id, reason });

      if (result.status === "error") {
        setReverseError(result.message ?? tForm("genericError"));
        return;
      }

      setReversingPayment(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{invoice.studentName}</h3>
            <p className="text-sm text-muted-foreground">{invoice.reference}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{t(`invoiceStatus.${invoice.status}`)}</Badge>
            <p className="text-sm text-muted-foreground">
              {t("invoicing.debtReport.total")}: <span className="font-semibold text-foreground">{invoice.total}</span>
              {" · "}
              {t("invoicing.debtReport.paidAmount")}: <span className="font-semibold text-foreground">{invoice.paidAmount}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 rounded-md border border-border p-4">
            <h4 className="font-medium">{t("payments.manualTitle")}</h4>

            {manualError ? <ErrorBanner message={manualError} /> : null}
            {manualMessage ? (
              <p role="status" className="rounded-md border border-success bg-success-surface p-2 text-sm text-success">
                {manualMessage}
              </p>
            ) : null}

            <Input
              label={t("payments.fields.amount")}
              type="number"
              min={0.01}
              step="0.01"
              required
              disabled={isPending}
              value={manualAmount}
              onChange={(event) => setManualAmount(event.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-method`}>{t("payments.fields.method")}</Label>
              <Select disabled={isPending} value={manualMethod} onValueChange={(value) => setManualMethod(value as typeof manualMethod)}>
                <SelectTrigger id={`${formId}-method`} className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(`payments.methods.${method}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isPending || !manualAmount}>
              {isPending ? tForm("saving") : t("payments.manualTrigger")}
            </Button>
          </form>

          <form onSubmit={handleMobileSubmit} className="flex flex-col gap-3 rounded-md border border-border p-4">
            <h4 className="font-medium">{t("payments.mobileMoneyTitle")}</h4>

            {mobileError ? <ErrorBanner message={mobileError} /> : null}
            {mobileMessage ? (
              <p role="status" className="rounded-md border border-success bg-success-surface p-2 text-sm text-success">
                {mobileMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-provider`}>{t("payments.fields.provider")}</Label>
              <Select disabled={isPending} value={provider} onValueChange={(value) => setProvider(value as ProviderValue)}>
                <SelectTrigger id={`${formId}-provider`} className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentProvider).map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`payments.providers.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              label={t("payments.fields.payerPhone")}
              type="tel"
              placeholder="+258841234567"
              required
              disabled={isPending}
              value={payerPhone}
              onChange={(event) => setPayerPhone(event.target.value)}
            />

            <Button type="submit" disabled={isPending || !payerPhone}>
              {isPending ? tForm("saving") : t("payments.mobileMoneyTrigger")}
            </Button>
          </form>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h4 className="font-medium">{t("payments.tableTitle")}</h4>

        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payments.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("payments.columns.method")}</th>
                  <th className="px-4 py-3 font-medium">{t("payments.columns.amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("payments.columns.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("payments.columns.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("payments.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {t(`payments.methods.${payment.method}`)}
                      {payment.provider ? ` — ${t(`payments.providers.${payment.provider}`)}` : ""}
                    </td>
                    <td className="px-4 py-3">{payment.amount}</td>
                    <td className="px-4 py-3">
                      <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>{t(`payments.status.${payment.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(payment.createdAt).toLocaleDateString("pt-MZ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {payment.status === "INITIATED" || payment.status === "PENDING" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => handleConfirm(payment.id)}
                          >
                            {confirmingId === payment.id && isPending ? tForm("saving") : t("payments.actions.confirm")}
                          </Button>
                        ) : null}

                        {payment.status === "CONFIRMED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => setReversingPayment(payment)}
                          >
                            {t("payments.actions.reverse")}
                          </Button>
                        ) : null}

                        {payment.status === "CONFIRMED" || payment.status === "REVERSED" ? (
                          <Button type="button" size="sm" variant="ghost" asChild>
                            <Link href={{ pathname: "/finance/receipt/[id]", params: { id: payment.id } }} target="_blank">
                              {t("payments.actions.receipt")}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={reversingPayment !== null} onOpenChange={(open) => !open && setReversingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payments.reverseDialog.title")}</DialogTitle>
            <DialogDescription>{t("payments.reverseDialog.description")}</DialogDescription>
          </DialogHeader>

          {reverseError ? <ErrorBanner message={reverseError} /> : null}

          <Input
            label={t("payments.reverseDialog.reasonLabel")}
            required
            disabled={isPending}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setReversingPayment(null)}>
              {t("payments.reverseDialog.cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isPending || reason.trim() === ""} onClick={handleReverse}>
              {isPending ? t("payments.reverseDialog.confirming") : t("payments.reverseDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
