import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listAssessmentSchemeOptions, listAssessmentSchemes } from "@/features/academic/data/assessment-schemes";
import { listTerms } from "@/features/academic/data/term-results";
import { CloseTermSection } from "@/features/academic/ui/close-term-section";
import { AssessmentSchemeSection } from "@/features/academic/ui/settings/assessment-scheme-section";
import { isSchoolAdministrator, type SessionContext } from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/assessment">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assessmentSchemes" });

  return { title: t("title") };
}

/**
 * Esquemas de avaliação — a fórmula de cálculo de médias. Fica também pronta para acolher
 * o resto do módulo de Avaliação (spec #7, lançamento de notas) quando for construído.
 */
export default async function AssessmentPage({ params }: PageProps<"/[locale]/assessment">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("assessmentSchemes");
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

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    redirect({ href: "/students", locale });
  }

  const { schoolId } = session;

  const [schemes, options, terms] = await Promise.all([
    listAssessmentSchemes(schoolId),
    listAssessmentSchemeOptions(schoolId),
    listTerms(schoolId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <AssessmentSchemeSection rows={schemes.rows} academicYear={schemes.academicYear} options={options} />

      <CloseTermSection terms={terms} />
    </div>
  );
}
