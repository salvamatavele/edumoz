"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { AttendanceMutationError } from "@/features/academic/data/attendance-mutations";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { findTeacherByUserId } from "@/features/academic/data/attendance";
import type { AttendanceActionResult } from "@/features/academic/domain/attendance-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Reabre uma sessão `SUBMITTED` para `DRAFT`. Ao contrário de `submitAttendance`, aceita
 * dois donos: o gestor da escola (`isSchoolAdministrator`) OU o próprio professor da
 * sessão — um gestor tem de conseguir corrigir um erro sem depender do professor estar
 * disponível, mas um professor continua a poder corrigir a sua própria sessão sozinho.
 *
 * Grava em `AuditLog` o estado dos registos ANTES de reabrir — não o depois, que fica a
 * cargo do próximo `submitAttendance` (esse já audita a sua própria escrita). Uma sessão
 * que mude sem rasto não é defensável perante um encarregado de educação que conteste uma
 * exclusão por faltas.
 */
export async function reopenAttendance(sessionId: string): Promise<AttendanceActionResult> {
  const t = await getTranslations();
  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return { status: "error", message: t("attendance.errors.invalid") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  const attendanceSession = await db.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teachingGroupId: true, scheduleEntryId: true, timeSlotId: true, status: true },
  });

  if (!attendanceSession) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  const context = toSessionContext(session);

  const teacher = await findTeacherByUserId(schoolId, session.user.id);
  // Sem `timeSlotId` não há forma de identificar de forma determinística qual professor é
  // dono — só chega aqui em sessões antigas/sem horário associado; só o gestor as reabre.
  const owningEntry = attendanceSession.timeSlotId
    ? await db.scheduleEntry.findFirst({
        where: {
          ...(attendanceSession.scheduleEntryId ? { id: attendanceSession.scheduleEntryId } : {}),
          teachingGroupId: attendanceSession.teachingGroupId,
          timeSlotId: attendanceSession.timeSlotId,
        },
        select: { teacherId: true },
      })
    : null;
  const isOwner = teacher != null && owningEntry?.teacherId === teacher.id;

  if (!hasPermission(context, "attendance", "edit") && !isOwner) {
    return { status: "error", message: t("attendance.errors.forbidden") };
  }

  try {
    await withTransactionRetry(() => db.$transaction(async (tx) => {
      const claimed = await tx.attendanceSession.updateMany({
        where: { id: attendanceSession.id, status: "SUBMITTED" }, data: { status: "DRAFT" },
      });
      if (claimed.count !== 1) throw new AttendanceMutationError("alreadyOpen");
      const before = await tx.attendanceRecord.findMany({
        where: { sessionId: attendanceSession.id },
        select: { enrollmentId: true, status: true, minutesLate: true, note: true },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "attendance.reopen",
          entity: "AttendanceSession",
          entityId: attendanceSession.id,
          before: JSON.parse(JSON.stringify(before)),
        },
      });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) {
    if (error instanceof AttendanceMutationError) return { status: "error", message: t(`attendance.errors.${error.code}`) };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/attendance" }));
  }

  return { status: "success" };
}
