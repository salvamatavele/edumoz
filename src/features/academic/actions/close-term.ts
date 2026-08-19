"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { getTermClosingPlan, listSchemesForYear, pickScheme } from "@/features/academic/data/term-results";
import {
  closeTermSchema,
  type CloseTermActionResult,
  type CloseTermInput,
} from "@/features/academic/domain/term-closing-schema";
import { computeSubjectResult } from "@/features/academic/domain/grade-engine";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Fecha um trimestre — materializa `TermResult` para cada matrícula×disciplina do seu
 * percurso, com o esquema aplicável resolvido (`pickScheme`, o mesmo usado pela grelha de
 * lançamento) e a sua versão congelada no resultado. Só `isSchoolAdministrator`: ao
 * contrário do lançamento de notas, o raio de acção é toda a escola, não um agrupamento.
 * Tudo numa única transacção — uma falha a meio não deixa o trimestre parcialmente
 * fechado.
 */
export async function closeTerm(values: CloseTermInput): Promise<CloseTermActionResult> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = closeTermSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("termClosing.errors.invalid") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  const term = await db.term.findUnique({
    where: { id: parsed.data.termId },
    select: { id: true, status: true },
  });

  if (!term) {
    return { status: "error", message: t("termClosing.errors.notFound") };
  }

  if (term.status === "CLOSED") {
    return { status: "error", message: t("termClosing.errors.alreadyClosed") };
  }

  const plan = await getTermClosingPlan(schoolId, term.id);
  if (!plan) {
    return { status: "error", message: t("termClosing.errors.notFound") };
  }

  const schemes = await listSchemesForYear(schoolId, plan.academicYearId);

  let resultCount = 0;

  await db.$transaction(async (tx) => {
    for (const subjectEntry of plan.subjectEntries) {
      const resolved = pickScheme(schemes, {
        gradeLevelId: subjectEntry.gradeLevelId,
        subjectId: subjectEntry.subjectId,
      });

      // Sem esquema aplicável, não há fórmula com que calcular — esta disciplina fica de
      // fora do fecho, em vez de gravar um resultado inventado.
      if (!resolved) continue;

      const result = computeSubjectResult(resolved.definition, subjectEntry.entries);

      const componentAverages: Record<string, string | null> = {};
      for (const component of result.components) {
        componentAverages[component.componentCode] = component.average?.toString() ?? null;
      }

      await tx.termResult.upsert({
        where: {
          enrollmentId_subjectId_termId: {
            enrollmentId: subjectEntry.enrollmentId,
            subjectId: subjectEntry.subjectId,
            termId: term.id,
          },
        },
        create: {
          schoolId,
          enrollmentId: subjectEntry.enrollmentId,
          subjectId: subjectEntry.subjectId,
          termId: term.id,
          schemeId: resolved.schemeId,
          schemeVersion: resolved.definition.version,
          componentAverages,
          average: result.average?.toString() ?? null,
          examScore: result.examScore?.toString() ?? null,
          finalScore: result.finalScore?.toString() ?? null,
          isExempt: result.isExempt,
          isAdmittedToExam: result.isAdmittedToExam,
          passed: result.passed,
        },
        update: {
          schemeId: resolved.schemeId,
          schemeVersion: resolved.definition.version,
          componentAverages,
          average: result.average?.toString() ?? null,
          examScore: result.examScore?.toString() ?? null,
          finalScore: result.finalScore?.toString() ?? null,
          isExempt: result.isExempt,
          isAdmittedToExam: result.isAdmittedToExam,
          passed: result.passed,
        },
      });

      resultCount += 1;
    }

    await tx.term.update({
      where: { id: term.id },
      data: { status: "CLOSED", closedAt: new Date(), closedById: session.user.id },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "term.close",
        entity: "Term",
        entityId: term.id,
        after: JSON.parse(JSON.stringify({ status: "CLOSED", resultCount })),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/assessment" }));
  }

  return { status: "success", resultCount };
}
