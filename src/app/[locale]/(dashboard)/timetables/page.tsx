import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getClassGroupSchedule, getScheduleBoardData } from "@/features/academic/data/scheduling";
import { isSchoolAdministrator, type SessionContext } from "@/features/identity/domain/access";
import { PrintButton } from "@/features/academic/ui/print-button";
import { ScheduleBoard } from "@/features/academic/ui/schedule-board";
import { ScheduleView } from "@/features/academic/ui/schedule-view";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/timetables">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "scheduling" });

  return { title: t("title") };
}

/**
 * Montagem do horário — gestor apenas. `ScheduleEntry`/`TimeSlot`/`Room` já existiam no
 * schema; esta página é a primeira interface a escrevê-los para uma escola real, em vez
 * de só os do seed. Ver openspec/changes/scheduling-module.
 */
export default async function TimetablesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/timetables">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("scheduling");
  const tCommon = await getTranslations("common");
  const tForm = await getTranslations("form");

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

  const data = await getScheduleBoardData(session.schoolId);

  const resolvedSearchParams = await searchParams;
  const printClassGroupId = typeof resolvedSearchParams.imprimir === "string" ? resolvedSearchParams.imprimir : "";
  const printClassGroup = data.options.classGroups.find((group) => group.id === printClassGroupId);
  const printEntries = printClassGroup
    ? await getClassGroupSchedule(session.schoolId, printClassGroup.id)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {data.academicYear ? (
        <>
          <div className="print:hidden">
            <ScheduleBoard {...data} />
          </div>

          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6 print:border-none print:p-0">
            <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{t("print.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("print.subtitle")}</p>
              </div>
            </div>

            {/* Sem JavaScript: o próprio GET reflecte a turma escolhida no URL. */}
            <form className="flex flex-wrap items-end gap-4 print:hidden" action="" method="get">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("print.classGroup")}</span>
                <select
                  name="imprimir"
                  defaultValue={printClassGroupId}
                  className="h-12 min-w-48 rounded-md border border-border-strong bg-surface px-4 text-base text-foreground"
                >
                  <option value="">{tForm("selectPlaceholder")}</option>
                  {data.options.classGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-on-accent hover:bg-accent-hover"
              >
                {t("print.view")}
              </button>

              {printClassGroup ? <PrintButton /> : null}
            </form>

            {printClassGroup ? (
              <>
                <h3 className="hidden text-xl font-semibold print:block">{printClassGroup.name}</h3>
                {printEntries && printEntries.length > 0 ? (
                  <ScheduleView entries={printEntries} />
                ) : (
                  <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground print:hidden">
                    {t("print.empty")}
                  </p>
                )}
              </>
            ) : null}
          </section>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-muted-foreground">
          {tCommon("noActiveYear")}
        </p>
      )}
    </div>
  );
}
