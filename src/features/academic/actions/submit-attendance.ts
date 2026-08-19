"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { findTeacherByUserId } from "@/features/academic/data/attendance";
import type { AttendanceActionResult } from "@/features/academic/domain/attendance-schema";
import {
  submitAttendanceSchema,
  type SubmitAttendanceInput,
} from "@/features/academic/domain/attendance-schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Submete uma sessão de presenças. Molde: `create-student.ts`/`enroll-student.ts`.
 *
 * Diferença destes dois: a autorização aqui não é `isSchoolAdministrator` — é ser
 * especificamente O PROFESSOR dono da `ScheduleEntry` desta sessão. Um gestor não marca
 * presenças em nome de outro professor.
 */
export async function submitAttendance(
  values: SubmitAttendanceInput,
): Promise<AttendanceActionResult> {
  const t = await getTranslations();
  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  const { schoolId } = session;
  const teacher = await findTeacherByUserId(schoolId, session.user.id);

  if (!teacher) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  const parsed = submitAttendanceSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("attendance.errors.invalid") };
  }

  const db = getTenantDb(schoolId);

  const scheduleEntry = await db.scheduleEntry.findUnique({
    where: { id: parsed.data.scheduleEntryId },
    select: { id: true, teacherId: true, teachingGroupId: true, timeSlotId: true },
  });

  if (!scheduleEntry || scheduleEntry.teacherId !== teacher.id) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  // Nunca confiar no `enrollmentId` que o cliente manda — só os que realmente pertencem
  // ao agrupamento desta sessão entram na escrita.
  const members = await db.teachingGroupMember.findMany({
    where: { teachingGroupId: scheduleEntry.teachingGroupId },
    select: { enrollmentId: true },
  });
  const memberIds = new Set(members.map((member) => member.enrollmentId));
  const changes = parsed.data.changes.filter((change) => memberIds.has(change.enrollmentId));

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.attendanceSession.findFirst({
        where: {
          teachingGroupId: scheduleEntry.teachingGroupId,
          date: parsed.data.date,
          timeSlotId: scheduleEntry.timeSlotId,
        },
        select: { id: true },
      });

      const attendanceSession = existing
        ? await tx.attendanceSession.update({
            where: { id: existing.id },
            data: { status: "SUBMITTED", takenById: session.user.id, takenAt: new Date() },
          })
        : await tx.attendanceSession.create({
            data: {
              schoolId,
              teachingGroupId: scheduleEntry.teachingGroupId,
              scheduleEntryId: scheduleEntry.id,
              timeSlotId: scheduleEntry.timeSlotId,
              date: parsed.data.date,
              status: "SUBMITTED",
              takenById: session.user.id,
              takenAt: new Date(),
            },
          });

      for (const change of changes) {
        await tx.attendanceRecord.upsert({
          where: {
            sessionId_enrollmentId: {
              sessionId: attendanceSession.id,
              enrollmentId: change.enrollmentId,
            },
          },
          create: {
            sessionId: attendanceSession.id,
            enrollmentId: change.enrollmentId,
            status: change.status,
            minutesLate: change.minutesLate,
            note: change.note,
          },
          update: {
            status: change.status,
            minutesLate: change.minutesLate,
            note: change.note,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "attendance.submit",
          entity: "AttendanceSession",
          entityId: attendanceSession.id,
          after: JSON.parse(JSON.stringify({ status: "SUBMITTED", changes })),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/attendance" }));
    }

    return { status: "success" };
  } catch (error) {
    // Corrida entre duas submissões da mesma sessão (dois separadores, ex.) — o índice
    // único (teachingGroupId, date, timeSlotId) apanha-a; o professor tenta de novo.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return { status: "error", message: t("attendance.errors.conflict") };
    }

    throw error;
  }
}
