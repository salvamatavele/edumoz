import { notFound } from "next/navigation";
import { invoicePeriodSchema } from "@/features/finance/domain/invoice-schema";
import { AccessDenied } from "@/components/layout/access-denied";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listFeeItems, listFeeScheduleOptions, listFeeSchedules } from "@/features/finance/data/fee-schedules";
import { getDebtReport, getStudentAccount, listDebtReportFilters } from "@/features/finance/data/invoicing";
import { getInvoiceForPayment } from "@/features/finance/data/payments";
import { FinancePanel } from "@/features/finance/ui/finance-panel";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/finance">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finance" });

  return { title: t("title") };
}

/**
 * Finanças — tabelas de propinas, facturação e pagamentos. Gestor apenas: um erro aqui
 * envolve dinheiro real, nunca uma decisão de sala de aula. Ver openspec/changes/finance.
 */
export default async function FinancePage({
  params,
  searchParams,
}: PageProps<"/[locale]/finance">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("finance");
  const tCommon = await getTranslations("common");

  const session = await auth();

  if (!session?.schoolId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {tCommon("forbidden")}
        </p>
      </div>
    );
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "view")) {
    return <AccessDenied message={tCommon("forbidden")} />;
  }

  const { schoolId } = session;

  const resolvedSearchParams = await searchParams;
  const classGroupId = typeof resolvedSearchParams.turma === "string" ? resolvedSearchParams.turma : "";
  const periodYearParam = typeof resolvedSearchParams.periodYear === "string" ? resolvedSearchParams.periodYear : "";
  const periodMonthParam = typeof resolvedSearchParams.periodMonth === "string" ? resolvedSearchParams.periodMonth : "";
  const enrollmentId = typeof resolvedSearchParams.conta === "string" ? resolvedSearchParams.conta : "";
  const invoiceId = typeof resolvedSearchParams.factura === "string" ? resolvedSearchParams.factura : "";
  const requestedTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "";

  const period = periodYearParam
    ? invoicePeriodSchema.safeParse({ periodYear: periodYearParam, periodMonth: periodMonthParam || undefined })
    : null;
  if (period && !period.success) notFound();

  const [feeSchedules, feeItems, options, debtReportFilters] = await Promise.all([
    listFeeSchedules(schoolId),
    listFeeItems(schoolId),
    listFeeScheduleOptions(schoolId),
    listDebtReportFilters(schoolId),
  ]);

  const periodYear = period?.success ? period.data.periodYear : null;
  const debtReport =
    classGroupId && periodYear
      ? await getDebtReport(schoolId, classGroupId, periodYear, period?.success ? period.data.periodMonth ?? null : null)
      : null;

  const studentAccount = enrollmentId ? await getStudentAccount(schoolId, enrollmentId) : null;
  const invoiceForPayment = invoiceId ? await getInvoiceForPayment(schoolId, invoiceId) : null;

  const initialTab: "feeSchedules" | "feeItems" | "invoicing" | "payments" =
    requestedTab === "invoicing" || requestedTab === "feeItems" || requestedTab === "payments"
      ? requestedTab
      : "feeSchedules";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <FinancePanel canCreate={hasPermission(context, "finance", "create")} canEdit={hasPermission(context, "finance", "edit")}
        feeSchedules={feeSchedules}
        feeItems={feeItems}
        options={options}
        debtReportFilters={debtReportFilters}
        debtReport={debtReport}
        debtReportQuery={{
          classGroupId,
          periodYear: periodYearParam || String(new Date().getFullYear()),
          periodMonth: periodMonthParam,
        }}
        studentAccount={studentAccount}
        invoiceForPayment={invoiceForPayment}
        initialTab={initialTab}
      />
    </div>
  );
}
