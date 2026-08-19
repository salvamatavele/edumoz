import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getReportCard, listReportCardFilters } from "@/features/academic/data/report-cards";
import { isFamilyRole } from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/report-cards">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reportCards" });

  return { title: t("title") };
}

/** Pauta por turma, disciplina e trimestre — lê só de `TermResult`, nunca recalcula. */
export default async function ReportCardsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/report-cards">) {
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

  // Só quem trabalha na escola (gestor, professor) vê a pauta — um papel de família tem o
  // seu próprio ecrã, com só as suas notas, não as da turma inteira.
  if (session.role && isFamilyRole(session.role)) {
    redirect({ href: "/portal", locale });
  }

  const resolvedSearchParams = await searchParams;
  const classGroupId = typeof resolvedSearchParams.turma === "string" ? resolvedSearchParams.turma : "";
  const subjectId = typeof resolvedSearchParams.disciplina === "string" ? resolvedSearchParams.disciplina : "";
  const termId = typeof resolvedSearchParams.periodo === "string" ? resolvedSearchParams.periodo : "";

  const filters = await listReportCardFilters(session.schoolId);
  const reportCard =
    classGroupId && subjectId && termId
      ? await getReportCard(session.schoolId, classGroupId, subjectId, termId)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-3xl font-semibold">{t("reportCards.title")}</h1>
        <p className="text-muted-foreground">{t("reportCards.subtitle")}</p>
      </div>

      {/* Formulário simples, sem JavaScript: o próprio GET reflecte a escolha no URL. */}
      <form className="flex flex-wrap items-end gap-4 print:hidden" action="" method="get">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("reportCards.classGroup")}</span>
          <select
            name="turma"
            defaultValue={classGroupId}
            className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
          >
            <option value="">{t("form.selectPlaceholder")}</option>
            {filters.classGroups.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("reportCards.subject")}</span>
          <select
            name="disciplina"
            defaultValue={subjectId}
            className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
          >
            <option value="">{t("form.selectPlaceholder")}</option>
            {filters.subjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("reportCards.term")}</span>
          <select
            name="periodo"
            defaultValue={termId}
            className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
          >
            <option value="">{t("form.selectPlaceholder")}</option>
            {filters.terms.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-on-accent hover:bg-accent-hover"
        >
          {t("reportCards.filter")}
        </button>
      </form>

      {!reportCard ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("reportCards.chooseFilters")}
        </p>
      ) : reportCard.status === "not-found" ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("reportCards.notFound")}
        </p>
      ) : reportCard.status === "term-open" ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("reportCards.termOpen")}
        </p>
      ) : reportCard.rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("reportCards.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold print:block">
            {reportCard.classGroupName} — {reportCard.subjectName} — {reportCard.termName}
          </h2>

          <div className="overflow-x-auto rounded-lg border border-border print:overflow-visible print:border-none">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground print:bg-transparent">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("reportCards.student")}</th>
                  <th className="px-4 py-3 font-medium">{t("reportCards.average")}</th>
                  <th className="px-4 py-3 font-medium">{t("reportCards.finalScore")}</th>
                  <th className="px-4 py-3 font-medium">{t("reportCards.situation")}</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.rows.map((row) => (
                  <tr key={row.enrollmentId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{row.studentName}</td>
                    <td className="px-4 py-3">{row.average ?? "—"}</td>
                    <td className="px-4 py-3">{row.finalScore ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.passed === null
                        ? t("reportCards.pending")
                        : row.passed
                          ? t("reportCards.passed")
                          : t("reportCards.failed")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
