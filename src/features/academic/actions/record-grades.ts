"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { findTeacherByUserId } from "@/features/academic/data/attendance";
import type { GradeActionResult } from "@/features/academic/domain/grade-schema";
import { recordGradesSchema, type RecordGradesInput } from "@/features/academic/domain/grade-schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Lança/altera notas de uma `Assessment`. Molde: `submit-attendance.ts` — autorização por
 * posse do `TeachingGroup` (o professor dono), nunca `isSchoolAdministrator`; nunca confia
 * em `enrollmentId`s do cliente, volta a resolver `TeachingGroupMember` no servidor.
 */
export async function recordGrades(values: RecordGradesInput): Promise<GradeActionResult> {
  const t = await getTranslations();
  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const { schoolId } = session;
  const teacher = await findTeacherByUserId(schoolId, session.user.id);

  if (!teacher) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = recordGradesSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("gradeEntry.errors.invalid") };
  }

  const db = getTenantDb(schoolId);

  const assessment = await db.assessment.findUnique({
    where: { id: parsed.data.assessmentId },
    select: { id: true, teachingGroupId: true, teachingGroup: { select: { teacherId: true } } },
  });

  if (!assessment || assessment.teachingGroup.teacherId !== teacher.id) {
    return { status: "error", message: t("common.forbidden") };
  }

  // Nunca confiar no `enrollmentId` que o cliente manda — só os que realmente pertencem
  // ao agrupamento desta avaliação entram na escrita.
  const members = await db.teachingGroupMember.findMany({
    where: { teachingGroupId: assessment.teachingGroupId },
    select: { enrollmentId: true },
  });
  const memberIds = new Set(members.map((member) => member.enrollmentId));
  const changes = parsed.data.changes.filter((change) => memberIds.has(change.enrollmentId));

  await db.$transaction(async (tx) => {
    for (const change of changes) {
      await tx.grade.upsert({
        where: {
          assessmentId_enrollmentId: {
            assessmentId: assessment.id,
            enrollmentId: change.enrollmentId,
          },
        },
        create: {
          schoolId,
          assessmentId: assessment.id,
          enrollmentId: change.enrollmentId,
          score: change.score ?? null,
          isAbsent: change.isAbsent,
          note: change.note || null,
          recordedById: session.user.id,
        },
        update: {
          score: change.score ?? null,
          isAbsent: change.isAbsent,
          note: change.note || null,
          recordedById: session.user.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "grade.record",
        entity: "Assessment",
        entityId: assessment.id,
        after: JSON.parse(JSON.stringify({ changes })),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/grades" }));
  }

  return { status: "success" };
}
