"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { DefaultValues } from "react-hook-form";

import type { DataTableColumn } from "@/components/data-table/data-table";
import type { FieldDefinition } from "@/components/form/field-schema";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFeeItem } from "@/features/finance/actions/create-fee-item";
import { createFeeSchedule } from "@/features/finance/actions/create-fee-schedule";
import type {
  FeeItemRow,
  FeeScheduleOptions,
  FeeScheduleRow,
} from "@/features/finance/data/fee-schedules";
import type { DebtReportFilters, DebtReportRow, StudentAccount } from "@/features/finance/data/invoicing";
import type { InvoiceForPayment } from "@/features/finance/data/payments";
import {
  createFeeItemSchema,
  type CreateFeeItemInput,
  createFeeScheduleSchema,
  type CreateFeeScheduleInput,
} from "@/features/finance/domain/fee-schedule-schema";
import { GenerateInvoicesForm } from "@/features/finance/ui/generate-invoices-form";
import { PaymentManager } from "@/features/finance/ui/payment-manager";
import { EntitySection } from "@/features/academic/ui/settings/entity-section";
import { Link, useRouter } from "@/i18n/navigation";
import { FeeRecurrence } from "@/types";

interface FinancePanelProps {
  readonly canCreate?: boolean;
  readonly canEdit?: boolean;
  readonly feeSchedules: { readonly rows: readonly FeeScheduleRow[]; readonly academicYear: string | null };
  readonly feeItems: { readonly rows: readonly FeeItemRow[]; readonly academicYear: string | null };
  readonly options: FeeScheduleOptions;
  readonly debtReportFilters: DebtReportFilters;
  readonly debtReport: readonly DebtReportRow[] | null;
  readonly debtReportQuery: { readonly classGroupId: string; readonly periodYear: string; readonly periodMonth: string };
  readonly studentAccount: StudentAccount | null;
  readonly invoiceForPayment: InvoiceForPayment | null;
  readonly initialTab: "feeSchedules" | "feeItems" | "invoicing" | "payments";
}

const INVOICE_STATUS_TONE: Record<string, "neutral" | "warning" | "destructive" | "success"> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  PAID: "success",
  CANCELLED: "neutral",
};

export function FinancePanel({
  canCreate = true,
  canEdit = true,
  feeSchedules,
  feeItems,
  options,
  debtReportFilters,
  debtReport,
  debtReportQuery,
  studentAccount,
  invoiceForPayment,
  initialTab,
}: FinancePanelProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tCommon = useTranslations("common");
  const tForm = useTranslations("form");
  const financeQuery = {
    turma: debtReportQuery.classGroupId,
    periodYear: debtReportQuery.periodYear,
    periodMonth: debtReportQuery.periodMonth,
  };

  const feeScheduleColumns = useMemo<DataTableColumn<FeeScheduleRow>[]>(
    () => [
      { accessorKey: "name", header: t("feeSchedules.columns.name"), meta: { label: t("feeSchedules.columns.name") } },
      {
        accessorKey: "gradeLevelName",
        header: t("feeSchedules.columns.gradeLevel"),
        meta: { label: t("feeSchedules.columns.gradeLevel") },
        cell: ({ row }) => row.original.gradeLevelName ?? t("feeSchedules.wholeSchool"),
      },
      {
        accessorKey: "studyPathName",
        header: t("feeSchedules.columns.studyPath"),
        meta: { label: t("feeSchedules.columns.studyPath") },
        cell: ({ row }) => row.original.studyPathName ?? t("feeSchedules.wholeSchool"),
      },
      {
        accessorKey: "itemCount",
        header: t("feeSchedules.columns.itemCount"),
        meta: { label: t("feeSchedules.columns.itemCount") },
      },
    ],
    [t],
  );

  const feeScheduleFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateFeeScheduleInput, string>>> = [
    { name: "name", kind: "text", label: t("feeSchedules.create.fields.name"), required: true, autoFocus: true },
    {
      name: "gradeLevelId",
      kind: "select",
      label: t("feeSchedules.create.fields.gradeLevelId"),
      options: [
        { value: "none", label: t("feeSchedules.wholeSchool") },
        ...options.gradeLevels.map((option) => ({ value: option.id, label: option.name })),
      ],
    },
    {
      name: "studyPathId",
      kind: "select",
      label: t("feeSchedules.create.fields.studyPathId"),
      options: [
        { value: "none", label: t("feeSchedules.wholeSchool") },
        ...options.studyPaths.map((option) => ({ value: option.id, label: option.name })),
      ],
    },
  ];

  const feeItemColumns = useMemo<DataTableColumn<FeeItemRow>[]>(
    () => [
      { accessorKey: "feeScheduleName", header: t("feeItems.columns.feeSchedule"), meta: { label: t("feeItems.columns.feeSchedule") } },
      { accessorKey: "code", header: t("feeItems.columns.code"), meta: { label: t("feeItems.columns.code") } },
      { accessorKey: "name", header: t("feeItems.columns.name"), meta: { label: t("feeItems.columns.name") } },
      { accessorKey: "amount", header: t("feeItems.columns.amount"), meta: { label: t("feeItems.columns.amount") } },
      {
        accessorKey: "recurrence",
        header: t("feeItems.columns.recurrence"),
        meta: { label: t("feeItems.columns.recurrence") },
        cell: ({ row }) => t(`recurrence.${row.original.recurrence}`),
      },
      {
        accessorKey: "isMandatory",
        header: t("feeItems.columns.isMandatory"),
        meta: { label: t("feeItems.columns.isMandatory") },
        cell: ({ row }) => (row.original.isMandatory ? tCommon("yes") : tCommon("no")),
      },
    ],
    [t, tCommon],
  );

  const feeItemFields: ReadonlyArray<FieldDefinition<Extract<keyof CreateFeeItemInput, string>>> = [
    {
      name: "feeScheduleId",
      kind: "select",
      label: t("feeItems.create.fields.feeScheduleId"),
      required: true,
      options: options.feeSchedules.map((option) => ({ value: option.id, label: option.name })),
    },
    { name: "code", kind: "text", label: t("feeItems.create.fields.code"), required: true },
    { name: "name", kind: "text", label: t("feeItems.create.fields.name"), required: true },
    { name: "amount", kind: "number", label: t("feeItems.create.fields.amount"), required: true },
    {
      name: "recurrence",
      kind: "select",
      label: t("feeItems.create.fields.recurrence"),
      required: true,
      options: Object.values(FeeRecurrence).map((recurrence) => ({ value: recurrence, label: t(`recurrence.${recurrence}`) })),
    },
    { name: "dueDayOfMonth", kind: "number", label: t("feeItems.create.fields.dueDayOfMonth") },
    { name: "isMandatory", kind: "checkbox", label: t("feeItems.create.fields.isMandatory"), fullWidth: true },
  ];

  return (
    <Tabs
      key={initialTab}
      defaultValue={initialTab}
      onValueChange={(tab) => router.replace({
        pathname: "/finance",
        query: { ...Object.fromEntries(searchParams), tab },
      }, { scroll: false })}
    >
      <TabsList>
        <TabsTrigger value="feeSchedules">{t("tabs.feeSchedules")}</TabsTrigger>
        <TabsTrigger value="feeItems">{t("tabs.feeItems")}</TabsTrigger>
        <TabsTrigger value="invoicing">{t("tabs.invoicing")}</TabsTrigger>
        <TabsTrigger value="payments">{t("tabs.payments")}</TabsTrigger>
      </TabsList>

      <TabsContent value="feeSchedules">
        <EntitySection<FeeScheduleRow, CreateFeeScheduleInput>
          canCreate={canCreate}
          subtitle={t("feeSchedules.subtitle")}
          tableLabel={t("feeSchedules.tableLabel")}
          columns={feeScheduleColumns}
          rows={feeSchedules.rows}
          getRowId={(row) => row.id}
          emptyTitle={t("feeSchedules.empty")}
          emptyHint={feeSchedules.academicYear ? t("feeSchedules.emptyHint") : tCommon("noActiveYear")}
          createTrigger={t("feeSchedules.create.trigger")}
          createTitle={t("feeSchedules.create.title")}
          createDescription={t("feeSchedules.create.description")}
          definition={{ schema: createFeeScheduleSchema, fields: feeScheduleFields }}
          defaultValues={{ name: "", gradeLevelId: "none", studyPathId: "none" }}
          onSubmit={createFeeSchedule}
          missingDependencyReason={!options.hasActiveAcademicYear ? tCommon("noActiveYear") : null}
        />
      </TabsContent>

      <TabsContent value="feeItems">
        <EntitySection<FeeItemRow, CreateFeeItemInput>
          canCreate={canCreate}
          subtitle={t("feeItems.subtitle")}
          tableLabel={t("feeItems.tableLabel")}
          columns={feeItemColumns}
          rows={feeItems.rows}
          getRowId={(row) => row.id}
          emptyTitle={t("feeItems.empty")}
          emptyHint={t("feeItems.emptyHint")}
          createTrigger={t("feeItems.create.trigger")}
          createTitle={t("feeItems.create.title")}
          createDescription={t("feeItems.create.description")}
          definition={{ schema: createFeeItemSchema, fields: feeItemFields }}
          defaultValues={
            {
              feeScheduleId: "",
              code: "",
              name: "",
              amount: 0,
              recurrence: "",
              isMandatory: true,
            } as unknown as DefaultValues<CreateFeeItemInput>
          }
          onSubmit={createFeeItem}
          missingDependencyReason={options.feeSchedules.length === 0 ? t("feeItems.missingFeeSchedule") : null}
        />
      </TabsContent>

      <TabsContent value="invoicing">
        <div className="flex flex-col gap-6">
          {canCreate ? <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <GenerateInvoicesForm feeSchedules={options.feeSchedules} />
          </section> : null}

          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h3 className="text-lg font-semibold">{t("invoicing.debtReportTitle")}</h3>

            {/* Sem JavaScript: o próprio GET reflecte a escolha no URL. */}
            <form className="flex flex-wrap items-end gap-4" action="" method="get">
              <input type="hidden" name="tab" value="invoicing" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="debt-turma" className="text-sm font-medium text-foreground">
                  {t("invoicing.fields.classGroup")}
                </label>
                <select
                  id="debt-turma"
                  name="turma"
                  defaultValue={debtReportQuery.classGroupId}
                  className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
                >
                  <option value="">{tForm("selectPlaceholder")}</option>
                  {debtReportFilters.classGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="debt-year" className="text-sm font-medium text-foreground">
                  {t("invoicing.fields.periodYear")}
                </label>
                <input
                  id="debt-year"
                  name="periodYear"
                  type="number"
                  defaultValue={debtReportQuery.periodYear}
                  className="h-12 w-32 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="debt-month" className="text-sm font-medium text-foreground">
                  {t("invoicing.fields.periodMonth")}
                </label>
                <input
                  id="debt-month"
                  name="periodMonth"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={debtReportQuery.periodMonth}
                  className="h-12 w-32 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-on-accent hover:bg-accent-hover"
              >
                {t("invoicing.fields.search")}
              </button>
            </form>

            {debtReport === null ? (
              <p className="text-sm text-muted-foreground">{t("invoicing.debtReportChooseFilters")}</p>
            ) : debtReport.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("invoicing.debtReportEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.student")}</th>
                      <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.reference")}</th>
                      <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.total")}</th>
                      <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.paidAmount")}</th>
                      <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.status")}</th>
                      <th className="px-4 py-3 font-medium">{t("payments.columns.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtReport.map((row) => (
                      <tr key={row.invoiceId} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <Link
                            href={{
                              pathname: "/finance",
                              query: { ...financeQuery, tab: "invoicing", conta: row.enrollmentId },
                            }}
                            className="underline decoration-dotted underline-offset-4 hover:text-accent"
                          >
                            {row.studentName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{row.reference}</td>
                        <td className="px-4 py-3">{row.total}</td>
                        <td className="px-4 py-3">{row.paidAmount}</td>
                        <td className="px-4 py-3">
                          <Badge tone={INVOICE_STATUS_TONE[row.status] ?? "neutral"}>{t(`invoiceStatus.${row.status}`)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={{ pathname: "/finance", query: { ...financeQuery, tab: "payments", factura: row.invoiceId } }}
                            className="underline decoration-dotted underline-offset-4 hover:text-accent"
                          >
                            {t("payments.manageTrigger")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {studentAccount ? (
            <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">{studentAccount.studentName}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("invoicing.account.balance")}: <span className="font-semibold text-foreground">{studentAccount.balance}</span>
                </p>
              </div>

              {studentAccount.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("invoicing.account.empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.reference")}</th>
                        <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.total")}</th>
                        <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.paidAmount")}</th>
                        <th className="px-4 py-3 font-medium">{t("invoicing.debtReport.status")}</th>
                        <th className="px-4 py-3 font-medium">{t("payments.columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAccount.invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-foreground">{invoice.reference}</td>
                          <td className="px-4 py-3">{invoice.total}</td>
                          <td className="px-4 py-3">{invoice.paidAmount}</td>
                          <td className="px-4 py-3">
                            <Badge tone={INVOICE_STATUS_TONE[invoice.status] ?? "neutral"}>{t(`invoiceStatus.${invoice.status}`)}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={{ pathname: "/finance", query: { ...financeQuery, conta: studentAccount.enrollmentId, tab: "payments", factura: invoice.id } }}
                              className="underline decoration-dotted underline-offset-4 hover:text-accent"
                            >
                              {t("payments.manageTrigger")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="payments">
        {invoiceForPayment ? (
          <PaymentManager key={invoiceForPayment.id} invoice={invoiceForPayment} canCreate={canCreate} canEdit={canEdit} />
        ) : (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
            {t("payments.selectInvoiceHint")}
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
