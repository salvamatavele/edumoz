"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import type { SchemeValidationError } from "@/features/academic/domain/assessment";
import {
  createAssessmentSchemeSchema,
  type CreateAssessmentSchemeInput,
} from "@/features/academic/domain/assessment-scheme-schema";
import { validateScheme } from "@/features/academic/domain/grade-engine";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { toDecimal, toDecimalOrNull } from "@/features/shared/domain/numeric";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Traduz um erro de `validateScheme` para texto específico — nunca uma mensagem genérica.
 * A ordem dos argumentos de interpolação segue o que cada `t()` espera em
 * `messages/{pt,en}.json` (`assessmentSchemes.errors.*`).
 */
function describeSchemeError(
  error: SchemeValidationError,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  switch (error.kind) {
    case "WEIGHTS_DO_NOT_SUM_TO_ONE":
      return t("assessmentSchemes.errors.weightsDoNotSumToOne", { actual: error.actual });
    case "NO_COMPONENTS":
      return t("assessmentSchemes.errors.noComponents");
    case "DUPLICATE_COMPONENT_CODE":
      return t("assessmentSchemes.errors.duplicateComponentCode", { code: error.code });
    case "INVALID_SCALE":
      return t("assessmentSchemes.errors.invalidScale", { detail: error.detail });
    case "EXAM_WEIGHT_WITHOUT_EXAM":
      return t("assessmentSchemes.errors.examWeightWithoutExam");
    case "THRESHOLD_OUT_OF_SCALE":
      return t("assessmentSchemes.errors.thresholdOutOfScale", { field: error.field });
  }
}

/**
 * Cria um esquema de avaliação e os seus componentes. Zod valida a FORMA primeiro;
 * `validateScheme` (`grade-engine.ts`, já existente e testado) valida a COERÊNCIA do
 * esquema inteiro — os pesos dos componentes têm de somar exactamente 1.0000 — só depois
 * de ambos passarem é que se escreve. Só `isSchoolAdministrator`: configurar a fórmula de
 * médias é uma decisão de gestão, não de sala de aula.
 */
export async function createAssessmentScheme(
  values: CreateAssessmentSchemeInput,
): Promise<FormActionResult<CreateAssessmentSchemeInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "assessment-schemes", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createAssessmentSchemeSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateAssessmentSchemeInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateAssessmentSchemeInput;
      fieldErrors[field] = t(`assessmentSchemes.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) {
    return { status: "error", message: t("assessmentSchemes.errors.noActiveYear") };
  }

  const data = parsed.data;

  const schemeErrors = validateScheme({
    id: "new",
    version: 1,
    name: data.name,
    regime: data.regime,
    scaleMin: toDecimal(data.scaleMin),
    scaleMax: toDecimal(data.scaleMax),
    passMark: toDecimal(data.passMark),
    roundingMode: data.roundingMode,
    decimalPlaces: data.decimalPlaces,
    components: data.components.map((component, index) => ({
      code: component.code,
      name: component.name,
      type: component.type,
      weight: toDecimal(component.weight),
      minGrade: toDecimalOrNull(component.minGrade ?? null),
      order: index,
    })),
    hasExam: data.hasExam,
    examWeight: toDecimal(data.examWeight),
    minGradeForExam: toDecimalOrNull(data.minGradeForExam ?? null),
    exemptionGrade: toDecimalOrNull(data.exemptionGrade ?? null),
    minExamGrade: toDecimalOrNull(data.minExamGrade ?? null),
  });

  if (schemeErrors.length > 0) {
    return {
      status: "error",
      fieldErrors: {
        components: schemeErrors.map((error) => describeSchemeError(error, t)).join(" "),
      },
    };
  }

  await db.$transaction(async (tx) => {
    const scheme = await tx.assessmentScheme.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        gradeLevelId: data.gradeLevelId && data.gradeLevelId !== "none" ? data.gradeLevelId : null,
        subjectId: data.subjectId && data.subjectId !== "none" ? data.subjectId : null,
        name: data.name,
        regime: data.regime,
        scaleMin: data.scaleMin,
        scaleMax: data.scaleMax,
        passMark: data.passMark,
        roundingMode: data.roundingMode,
        decimalPlaces: data.decimalPlaces,
        hasExam: data.hasExam,
        examWeight: data.examWeight,
        minGradeForExam: data.minGradeForExam ?? null,
        exemptionGrade: data.exemptionGrade ?? null,
        minExamGrade: data.minExamGrade ?? null,
        components: {
          create: data.components.map((component, index) => ({
            code: component.code,
            name: component.name,
            type: component.type,
            weight: component.weight,
            minGrade: component.minGrade ?? null,
            order: index,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "assessmentScheme.create",
        entity: "AssessmentScheme",
        entityId: scheme.id,
        after: JSON.parse(JSON.stringify(scheme)),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/assessment" }));
  }

  return { status: "success" };
}
