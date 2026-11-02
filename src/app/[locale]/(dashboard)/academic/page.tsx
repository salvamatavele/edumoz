import { AccessDenied } from "@/components/layout/access-denied";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  listAcademicStructureOptions,
  listClassGroups,
  listCurriculumSubjects,
  listGradeLevels,
  listSections,
  listStudyPaths,
  listSubjects,
} from "@/features/academic/data/academic-structure";
import { listRooms, listTimeSlots } from "@/features/academic/data/scheduling";
import { AcademicStructurePanel } from "@/features/academic/ui/settings/academic-structure-panel";
import { hasPermission, toSessionContext } from "@/features/identity/domain/access";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/academic">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academic" });

  return { title: t("title") };
}

/**
 * Estrutura académica — classes, secções, percursos, disciplinas e turmas. Uma das três
 * áreas em que "Configuração" se dividiu (ver feedback do utilizador sobre a antiga
 * página única): cada uma agora tem a sua própria entrada na navegação, e esta continua
 * organizada internamente por separadores em vez de tabelas empilhadas.
 */
export default async function AcademicPage({ params }: PageProps<"/[locale]/academic">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("academic");
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

  const context = toSessionContext(session);

  if (!hasPermission(context, "academic-structure", "view")) {
    return <AccessDenied message={tCommon("forbidden")} />;
  }

  const { schoolId } = session;

  const [gradeLevels, sections, studyPaths, subjects, curriculumSubjects, classGroups, rooms, timeSlots, options] =
    await Promise.all([
      listGradeLevels(schoolId),
      listSections(schoolId),
      listStudyPaths(schoolId),
      listSubjects(schoolId),
      listCurriculumSubjects(schoolId),
      listClassGroups(schoolId),
      listRooms(schoolId),
      listTimeSlots(schoolId),
      listAcademicStructureOptions(schoolId),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <AcademicStructurePanel canCreate={hasPermission(context, "academic-structure", "create")}
        gradeLevels={gradeLevels}
        sections={sections}
        studyPaths={studyPaths}
        subjects={subjects}
        curriculumSubjects={curriculumSubjects}
        classGroups={classGroups}
        rooms={rooms}
        timeSlots={timeSlots}
        options={options}
      />
    </div>
  );
}
