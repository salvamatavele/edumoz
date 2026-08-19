import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listTeachers, listTeachingGroups, listTeachingStaffOptions } from "@/features/academic/data/teaching-staff";
import { TeachingStaffPanel } from "@/features/academic/ui/settings/teaching-staff-panel";
import { isSchoolAdministrator, type SessionContext } from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/teachers">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teachingStaff" });

  return { title: t("title") };
}

/** Professores e as suas atribuições a turmas/disciplinas — ver docs/specs/README.md #6. */
export default async function TeachersPage({ params }: PageProps<"/[locale]/teachers">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("teachingStaff");
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

  const [teachers, teachingGroups, options] = await Promise.all([
    listTeachers(schoolId),
    listTeachingGroups(schoolId),
    listTeachingStaffOptions(schoolId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <TeachingStaffPanel teachers={teachers} teachingGroups={teachingGroups} options={options} />
    </div>
  );
}
