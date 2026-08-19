import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { findTeacherByUserId } from "@/features/academic/data/attendance";
import { getPortalSchedule, getTeacherSchedule } from "@/features/academic/data/scheduling";
import { ScheduleView } from "@/features/academic/ui/schedule-view";
import { Role } from "@/types";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/my-timetable">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "scheduling" });

  return { title: t("view.title") };
}

/**
 * Consulta do próprio horário — professor, aluno ou encarregado de educação. A montagem
 * (`/timetables`, gestor apenas) é uma página diferente; aqui é sempre só leitura, do
 * horário de quem está autenticado, nunca de outra pessoa. Mesmo padrão de autorização de
 * `/portal` (notas) para a parte de aluno/encarregado.
 */
export default async function MyTimetablePage({
  params,
  searchParams,
}: PageProps<"/[locale]/my-timetable">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("scheduling");
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

  if (session.role === Role.TEACHER) {
    const teacher = await findTeacherByUserId(session.schoolId, session.user.id);
    const entries = teacher ? await getTeacherSchedule(session.schoolId, teacher.id) : [];

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold">{t("view.title")}</h1>
        <ScheduleView entries={entries} showTeacher={false} />
      </div>
    );
  }

  if (session.role === Role.STUDENT || session.role === Role.GUARDIAN) {
    const resolvedSearchParams = await searchParams;
    const requestedStudentId =
      typeof resolvedSearchParams.aluno === "string" ? resolvedSearchParams.aluno : undefined;

    const portal = await getPortalSchedule(session.schoolId, session.role, session.user.id, requestedStudentId);

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t("view.title")}</h1>
          {portal.selectedStudentName ? <p className="text-muted-foreground">{portal.selectedStudentName}</p> : null}
        </div>

        {portal.children.length > 1 ? (
          <form className="flex flex-wrap items-end gap-4" action="" method="get">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t("view.child")}</span>
              <select
                name="aluno"
                defaultValue={portal.children.find((child) => child.name === portal.selectedStudentName)?.studentId}
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
              {t("view.view")}
            </button>
          </form>
        ) : null}

        {portal.entries === null ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">{t("view.noAccess")}</p>
        ) : (
          <ScheduleView entries={portal.entries} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">{t("view.noAccess")}</p>
    </div>
  );
}
