import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import {
  getAttendanceReport,
  listAttendanceReportFilters,
} from "@/features/academic/data/attendance";
import { auth } from "@/lib/auth/config";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/attendance-report">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "attendance" });

  return { title: t("reportTitle") };
}

export default async function AttendanceReportPage({
  params,
  searchParams,
}: PageProps<"/[locale]/attendance-report">) {
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

  const context = toSessionContext(session);

  if (!hasPermission(context, "attendance", "view")) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("attendance.errors.forbidden")}
        </p>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const classGroupId =
    typeof resolvedSearchParams.turma === "string" ? resolvedSearchParams.turma : "";
  const termId =
    typeof resolvedSearchParams.periodo === "string" ? resolvedSearchParams.periodo : "";

  const filters = await listAttendanceReportFilters(session.schoolId);
  const rows =
    classGroupId && termId
      ? await getAttendanceReport(session.schoolId, classGroupId, termId)
      : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("attendance.reportTitle")}</h1>
        <p className="text-muted-foreground">{t("attendance.reportSubtitle")}</p>
      </div>

      {/* Formulário simples, sem JavaScript: o próprio GET reflecte a escolha no URL. */}
      <form className="flex flex-wrap items-end gap-4" action="" method="get">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("attendance.classGroup")}</span>
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
          <span className="text-sm font-medium text-foreground">{t("attendance.term")}</span>
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
          {t("attendance.filter")}
        </button>
      </form>

      {!classGroupId || !termId ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("attendance.reportChooseFilters")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("attendance.reportEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("attendance.student")}</th>
                <th className="px-4 py-3 font-medium">{t("attendance.bySubject")}</th>
                <th className="px-4 py-3 font-medium">{t("attendance.totalAbsences")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.enrollmentId} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{row.studentName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.summary.bySubject.map((subject) => (
                        <Badge
                          key={subject.subjectId}
                          tone={subject.absent > 0 ? "destructive" : "neutral"}
                        >
                          {subject.subjectName}: {subject.absent}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.summary.totalAbsences}
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
