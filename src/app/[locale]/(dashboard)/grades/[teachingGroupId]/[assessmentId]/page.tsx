import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { AssessmentSchemeDefinition } from "@/features/academic/domain/assessment";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
import { getGradeRoster } from "@/features/academic/data/grades";
import { GradeSheet, type SerializedScheme } from "@/features/academic/ui/grade-sheet";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/grades/[teachingGroupId]/[assessmentId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gradeEntry" });

  return { title: t("title") };
}

function serializeScheme(definition: AssessmentSchemeDefinition): SerializedScheme {
  return {
    id: definition.id,
    version: definition.version,
    name: definition.name,
    regime: definition.regime,
    scaleMin: definition.scaleMin.toString(),
    scaleMax: definition.scaleMax.toString(),
    passMark: definition.passMark.toString(),
    roundingMode: definition.roundingMode,
    decimalPlaces: definition.decimalPlaces,
    hasExam: definition.hasExam,
    examWeight: definition.examWeight.toString(),
    minGradeForExam: definition.minGradeForExam?.toString() ?? null,
    exemptionGrade: definition.exemptionGrade?.toString() ?? null,
    minExamGrade: definition.minExamGrade?.toString() ?? null,
    components: definition.components.map((component) => ({
      code: component.code,
      name: component.name,
      type: component.type,
      weight: component.weight.toString(),
      minGrade: component.minGrade?.toString() ?? null,
      order: component.order,
    })),
  };
}

export default async function GradeSheetPage({
  params,
}: PageProps<"/[locale]/grades/[teachingGroupId]/[assessmentId]">) {
  const { locale, assessmentId } = await params;
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
  const roster = teacher ? await getGradeRoster(schoolId, assessmentId, teacher.id) : null;

  // O professor dono do agrupamento vê e edita a sua grelha; um director de turma vê
  // (sem editar) a grelha de disciplinas da turma que dirige, mesmo sem leccioná-las —
  // `getGradeRoster` já filtra por isto e devolve `isOwn`. `recordGrades.ts` volta a
  // verificar posse antes de qualquer escrita, por isso o acesso de leitura aqui alargado
  // nunca abre escrita real.
  if (!roster || !teacher) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
          {t("common.forbidden")}
        </p>
      </div>
    );
  }

  return (
    <GradeSheet
      assessment={{
        id: roster.assessment.id,
        name: roster.assessment.name,
        componentCode: roster.assessment.componentCode,
        maxScore: roster.assessment.maxScore,
        weight: roster.assessment.weight,
      }}
      teachingGroupName={roster.teachingGroupName}
      subjectName={roster.subjectName}
      scheme={serializeScheme(roster.scheme)}
      initialEntries={roster.entries.map((entry) => ({
        enrollmentId: entry.enrollmentId,
        studentName: entry.studentName,
        score: entry.score,
        isAbsent: entry.isAbsent,
        otherEntries: entry.otherEntries,
      }))}
      readOnly={!roster.isOwn}
    />
  );
}
