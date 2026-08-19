import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
import { listTeacherTeachingGroups } from "@/features/academic/data/grades";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/grades">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gradeEntry" });

  return { title: t("title") };
}

/** Agrupamentos lectivos do professor, no ano lectivo activo — ponto de entrada para lançar notas. */
export default async function GradesPage({ params }: PageProps<"/[locale]/grades">) {
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

  const teacher = await findTeacherByUserId(session.schoolId, session.user.id);
  const groups = teacher ? await listTeacherTeachingGroups(session.schoolId, teacher.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("gradeEntry.title")}</h1>
        <p className="text-muted-foreground">{t("gradeEntry.subtitle")}</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("gradeEntry.emptyGroups")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={{ pathname: "/grades/[teachingGroupId]", params: { teachingGroupId: group.id } }}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 ease-(--ease-enter) hover:border-border-strong"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">{group.name}</p>
                  <p className="text-sm text-muted-foreground">{group.subjectName}</p>
                </div>
                {!group.isOwn ? <Badge tone="neutral">{t("gradeEntry.headTeacherView")}</Badge> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
