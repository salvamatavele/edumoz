import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { getPortalGrades } from "@/features/academic/data/student-grades";
import { getPortalFinance } from "@/features/finance/data/family-finance";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";
import { Role, type InvoiceStatus } from "@/types";

const INVOICE_STATUS_TONE: Record<InvoiceStatus, "neutral" | "warning" | "destructive" | "success"> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  PAID: "success",
  CANCELLED: "neutral",
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/portal">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portal" });

  return { title: t("title") };
}

/**
 * Destino de quem tem um papel de família (aluno, encarregado de educação) — "as minhas
 * notas" ou "o meu educando". Protegido como `/alunos`: sem sessão, `auth()` devolve `null`
 * e mostra a mesma mensagem de acesso. A autorização real (só o próprio aluno, só um
 * educando com relação válida) vive em `getPortalGrades` — esta página só mostra o que ela
 * devolve.
 */
export default async function PortalPage({
  params,
  searchParams,
}: PageProps<"/[locale]/portal">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const session = await auth();

  if (!session?.schoolId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("auth.noAccess")}
        </p>
      </div>
    );
  }

  if (session.role !== Role.STUDENT && session.role !== Role.GUARDIAN) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">{t("portal.title")}</h1>
        <p className="text-muted-foreground">{t("portal.comingSoon")}</p>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedStudentId =
    typeof resolvedSearchParams.aluno === "string" ? resolvedSearchParams.aluno : undefined;
  const activeTab = resolvedSearchParams.tab === "finance" ? "finance" : "grades";

  const tabQuery = (tab: "grades" | "finance") =>
    requestedStudentId ? { tab, aluno: requestedStudentId } : { tab };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("portal.title")}</h1>
      </div>

      <div className="flex gap-2 border-b border-border">
        <Link
          href={{ pathname: "/portal", query: tabQuery("grades") }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "grades"
              ? "border-b-2 border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("portal.tabs.grades")}
        </Link>
        <Link
          href={{ pathname: "/portal", query: tabQuery("finance") }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "finance"
              ? "border-b-2 border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("portal.tabs.finance")}
        </Link>
      </div>

      {activeTab === "grades" ? (
        <GradesSection
          schoolId={session.schoolId}
          role={session.role}
          userId={session.user.id}
          requestedStudentId={requestedStudentId}
        />
      ) : (
        <FinanceSection
          schoolId={session.schoolId}
          role={session.role}
          userId={session.user.id}
          requestedStudentId={requestedStudentId}
        />
      )}
    </div>
  );
}

interface SectionProps {
  readonly schoolId: string;
  readonly role: typeof Role.STUDENT | typeof Role.GUARDIAN;
  readonly userId: string;
  readonly requestedStudentId: string | undefined;
}

async function GradesSection({ schoolId, role, userId, requestedStudentId }: SectionProps) {
  const t = await getTranslations();
  const portal = await getPortalGrades(schoolId, role, userId, requestedStudentId);

  return (
    <div className="flex flex-col gap-6">
      {portal.selected ? <p className="text-muted-foreground">{portal.selected.studentName}</p> : null}

      {portal.children.length > 1 ? (
        <form className="flex flex-wrap items-end gap-4" action="" method="get">
          <input type="hidden" name="tab" value="grades" />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("portal.grades.child")}</span>
            <select
              name="aluno"
              defaultValue={portal.selected?.studentId}
              className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
            >
              {portal.children.map((child) => (
                <option key={child.studentId} value={child.studentId}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-on-accent hover:bg-accent-hover"
          >
            {t("portal.grades.view")}
          </button>
        </form>
      ) : null}

      {!portal.selected ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("portal.grades.noAccess")}
        </p>
      ) : portal.selected.rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("portal.grades.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("portal.grades.term")}</th>
                <th className="px-4 py-3 font-medium">{t("portal.grades.subject")}</th>
                <th className="px-4 py-3 font-medium">{t("portal.grades.average")}</th>
                <th className="px-4 py-3 font-medium">{t("portal.grades.finalScore")}</th>
                <th className="px-4 py-3 font-medium">{t("portal.grades.situation")}</th>
              </tr>
            </thead>
            <tbody>
              {portal.selected.rows.map((row, index) => (
                <tr key={`${row.termId}-${row.subjectName}-${index}`} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{row.termName}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.subjectName}</td>
                  <td className="px-4 py-3">{row.average ?? "—"}</td>
                  <td className="px-4 py-3">{row.finalScore ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.passed === null
                      ? t("portal.grades.pending")
                      : row.passed
                        ? t("portal.grades.passed")
                        : t("portal.grades.failed")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function FinanceSection({ schoolId, role, userId, requestedStudentId }: SectionProps) {
  const t = await getTranslations();
  const portal = await getPortalFinance(schoolId, role, userId, requestedStudentId);

  return (
    <div className="flex flex-col gap-6">
      {portal.selected ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground">{portal.selected.studentName}</p>
          <p className="text-sm text-muted-foreground">
            {t("portal.finance.balance")}: <span className="font-semibold text-foreground">{portal.selected.balance}</span>
          </p>
        </div>
      ) : null}

      {portal.children.length > 1 ? (
        <form className="flex flex-wrap items-end gap-4" action="" method="get">
          <input type="hidden" name="tab" value="finance" />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("portal.finance.child")}</span>
            <select
              name="aluno"
              defaultValue={portal.selected?.studentId}
              className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
            >
              {portal.children.map((child) => (
                <option key={child.studentId} value={child.studentId}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-on-accent hover:bg-accent-hover"
          >
            {t("portal.finance.view")}
          </button>
        </form>
      ) : null}

      {!portal.selected ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("portal.finance.noAccess")}
        </p>
      ) : portal.selected.invoices.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("portal.finance.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("finance.invoicing.debtReport.reference")}</th>
                <th className="px-4 py-3 font-medium">{t("finance.invoicing.debtReport.total")}</th>
                <th className="px-4 py-3 font-medium">{t("finance.invoicing.debtReport.paidAmount")}</th>
                <th className="px-4 py-3 font-medium">{t("finance.invoicing.debtReport.status")}</th>
              </tr>
            </thead>
            <tbody>
              {portal.selected.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{invoice.reference}</td>
                  <td className="px-4 py-3">{invoice.total}</td>
                  <td className="px-4 py-3">{invoice.paidAmount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{t(`finance.invoiceStatus.${invoice.status}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
