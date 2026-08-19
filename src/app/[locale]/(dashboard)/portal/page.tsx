import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getPortalGrades } from "@/features/academic/data/student-grades";
import { auth } from "@/lib/auth/config";
import { Role } from "@/types";

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

  const portal = await getPortalGrades(session.schoolId, session.role, session.user.id, requestedStudentId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("portal.grades.title")}</h1>
        {portal.selected ? (
          <p className="text-muted-foreground">{portal.selected.studentName}</p>
        ) : null}
      </div>

      {portal.children.length > 1 ? (
        <form className="flex flex-wrap items-end gap-4" action="" method="get">
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
