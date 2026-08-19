import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
import {
  findCurrentOpenTerm,
  listTeachingGroupAssessments,
  resolveTeachingGroupAccess,
  resolveTeachingGroupScheme,
} from "@/features/academic/data/grades";
import { CreateAssessmentButton } from "@/features/academic/ui/create-assessment-button";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/grades/[teachingGroupId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gradeEntry" });

  return { title: t("title") };
}

/** Avaliações de um agrupamento, no trimestre aberto — criar novas, ou abrir a grelha de uma existente. */
export default async function TeachingGroupGradesPage({
  params,
}: PageProps<"/[locale]/grades/[teachingGroupId]">) {
  const { locale, teachingGroupId } = await params;
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

  const { schoolId } = session;
  const teacher = await findTeacherByUserId(schoolId, session.user.id);
  const db = getTenantDb(schoolId);

  const access = teacher ? await resolveTeachingGroupAccess(schoolId, teachingGroupId, teacher.id) : null;

  const group = access
    ? await db.teachingGroup.findUnique({
        where: { id: teachingGroupId },
        select: { name: true, subject: { select: { name: true } } },
      })
    : null;

  if (!access || !group) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("common.forbidden")}
        </p>
      </div>
    );
  }

  const [term, scheme] = await Promise.all([
    findCurrentOpenTerm(schoolId),
    resolveTeachingGroupScheme(schoolId, teachingGroupId),
  ]);

  const assessments =
    term && scheme ? await listTeachingGroupAssessments(schoolId, teachingGroupId, term.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold">
            {group.name} — {group.subject.name}
          </h1>
          {!access.isOwn ? <Badge tone="neutral">{t("gradeEntry.headTeacherView")}</Badge> : null}
        </div>
        <p className="text-muted-foreground">{term?.name ?? t("gradeEntry.noOpenTerm")}</p>
      </div>

      {!term ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("gradeEntry.noOpenTerm")}
        </div>
      ) : !scheme ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("gradeEntry.noScheme")}
        </div>
      ) : (
        <>
          {access.isOwn ? (
            <div className="flex items-center justify-end">
              <CreateAssessmentButton teachingGroupId={teachingGroupId} termId={term.id} components={scheme.components} />
            </div>
          ) : null}

          {assessments.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
              {t("gradeEntry.emptyAssessments")}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {assessments.map((assessment) => (
                <li key={assessment.id}>
                  <Link
                    href={{
                      pathname: "/grades/[teachingGroupId]/[assessmentId]",
                      params: { teachingGroupId, assessmentId: assessment.id },
                    }}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 ease-(--ease-enter) hover:border-border-strong"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-foreground">{assessment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {assessment.componentName} ({assessment.componentCode})
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
