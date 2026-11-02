"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  listScheduleEntriesForYear,
  listTeachingGroupMemberships,
  listWeeklyHoursByTeacher,
} from "@/features/academic/data/scheduling";
import { conflictsForPlacement } from "@/features/academic/domain/schedule-conflicts";
import {
  placeScheduleEntrySchema,
  type PlaceScheduleEntryInput,
  type PlaceScheduleEntryResult,
} from "@/features/academic/domain/place-schedule-entry-schema";
import type { ScheduleConflict } from "@/features/academic/domain/scheduling";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { withTransactionRetry } from "@/lib/db/transaction-retry";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

class SchedulePlacementError extends Error {
  constructor(readonly code: "invalid" | "noActiveYear" | "raceCondition") { super(code); }
}

/**
 * Traduz um conflito para texto, com os nomes já resolvidos — nunca uma mensagem genérica.
 * `names` já tem tudo o que qualquer conflito possa precisar, resolvido numa só consulta
 * antes de chamar esta função (ver `placeScheduleEntry`).
 */
function describeConflict(
  conflict: ScheduleConflict,
  names: { teachers: Map<string, string>; rooms: Map<string, string>; groups: Map<string, string> },
  otherGroupId: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const otherGroupName = names.groups.get(otherGroupId) ?? otherGroupId;

  switch (conflict.kind) {
    case "TEACHER_DOUBLE_BOOKED":
      return t("scheduling.conflicts.teacherDoubleBooked", {
        teacher: names.teachers.get(conflict.teacherId) ?? conflict.teacherId,
        group: otherGroupName,
      });
    case "ROOM_DOUBLE_BOOKED":
      return t("scheduling.conflicts.roomDoubleBooked", {
        room: names.rooms.get(conflict.roomId) ?? conflict.roomId,
        group: otherGroupName,
      });
    case "GROUP_DOUBLE_BOOKED":
      return t("scheduling.conflicts.groupDoubleBooked");
    case "STUDENT_DOUBLE_BOOKED":
      // Nunca alcançado directamente — agregado antes, ver `placeScheduleEntry`.
      return t("scheduling.conflicts.studentDoubleBooked", { count: 1, group: otherGroupName });
  }
}

/**
 * Coloca um agrupamento lectivo num tempo e sala, com verificação de conflitos ANTES de
 * gravar. Ver openspec/changes/scheduling-module/design.md — a mesma
 * `conflictsForPlacement` corre no cliente (resposta imediata) e aqui (nunca confia no
 * que o cliente reportou): recarrega o horário actual da base de dados e revalida.
 */
export async function placeScheduleEntry(
  values: PlaceScheduleEntryInput,
): Promise<PlaceScheduleEntryResult> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "scheduling", values?.id ? "edit" : "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = placeScheduleEntrySchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("scheduling.errors.invalid") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) {
    return { status: "error", message: t("scheduling.errors.noActiveYear") };
  }

  const group = await db.teachingGroup.findUnique({
    where: { id: data.teachingGroupId },
    select: { teacherId: true, name: true },
  });

  if (!group?.teacherId) {
    return { status: "error", message: t("scheduling.errors.noTeacherAssigned") };
  }

  const teacherId = group.teacherId;

  const timeSlotExists = await db.timeSlot.findUnique({
    where: { id: data.timeSlotId },
    select: { id: true },
  });

  if (!timeSlotExists) {
    return { status: "error", message: t("scheduling.errors.invalid") };
  }

  const [entries, memberships] = await Promise.all([
    listScheduleEntriesForYear(schoolId, academicYear.id),
    listTeachingGroupMemberships(schoolId, academicYear.id),
  ]);

  const candidate = {
    id: data.id,
    teachingGroupId: data.teachingGroupId,
    teacherId,
    roomId: data.roomId,
    timeSlotId: data.timeSlotId,
  };

  const conflicts = conflictsForPlacement(candidate, entries, memberships);

  if (conflicts.length > 0) {
    // `STUDENT_DOUBLE_BOOKED` agrega por contagem, não por lista de nomes — várias
    // matrículas podem colidir com o mesmo par de agrupamentos.
    const studentConflicts = conflicts.filter((c) => c.kind === "STUDENT_DOUBLE_BOOKED");
    const otherConflicts = conflicts.filter((c) => c.kind !== "STUDENT_DOUBLE_BOOKED");

    const teacherIds = otherConflicts.flatMap((c) => (c.kind === "TEACHER_DOUBLE_BOOKED" ? [c.teacherId] : []));
    const roomIds = otherConflicts.flatMap((c) => (c.kind === "ROOM_DOUBLE_BOOKED" ? [c.roomId] : []));
    const groupIds = [
      ...conflicts.flatMap((c) => ("teachingGroupIds" in c ? [...c.teachingGroupIds] : [])),
    ].filter((id) => id !== data.teachingGroupId);

    const [teachers, rooms, groups] = await Promise.all([
      db.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, firstName: true, lastName: true } }),
      db.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, name: true } }),
      db.teachingGroup.findMany({ where: { id: { in: groupIds } }, select: { id: true, name: true } }),
    ]);

    const names = {
      teachers: new Map(teachers.map((teacher) => [teacher.id, `${teacher.firstName} ${teacher.lastName}`])),
      rooms: new Map(rooms.map((room) => [room.id, room.name])),
      groups: new Map(groups.map((teachingGroup) => [teachingGroup.id, teachingGroup.name])),
    };

    const messages = otherConflicts.map((conflict) => {
      const otherGroupId = "teachingGroupIds" in conflict ? conflict.teachingGroupIds.find((id) => id !== data.teachingGroupId) : undefined;
      return describeConflict(conflict, names, otherGroupId ?? "", t);
    });

    if (studentConflicts.length > 0) {
      const byPair = new Map<string, Set<string>>();

      for (const conflict of studentConflicts) {
        if (conflict.kind !== "STUDENT_DOUBLE_BOOKED") continue;
        const otherGroupId = conflict.teachingGroupIds.find((id) => id !== data.teachingGroupId) ?? conflict.teachingGroupIds[0];
        const set = byPair.get(otherGroupId) ?? new Set<string>();
        set.add(conflict.enrollmentId);
        byPair.set(otherGroupId, set);
      }

      for (const [otherGroupId, enrollmentIds] of byPair) {
        messages.push(
          t("scheduling.conflicts.studentDoubleBooked", {
            count: enrollmentIds.size,
            group: names.groups.get(otherGroupId) ?? otherGroupId,
          }),
        );
      }
    }

    return { status: "conflict", conflicts: messages };
  }

  try {
    await withTransactionRetry(() => db.$transaction(async (tx) => {
      // All schedule placements lock the active year before checking shared students.
      // SQL uniqueness alone cannot detect a student attending two different groups.
      const claimed = await tx.academicYear.updateMany({
        where: { id: academicYear.id, isActive: true }, data: { isActive: true },
      });
      if (claimed.count !== 1) throw new SchedulePlacementError("noActiveYear");
      const [currentGroup, currentSlot, currentRoom, existingEntry] = await Promise.all([
        tx.teachingGroup.findFirst({ where: { id: data.teachingGroupId, academicYearId: academicYear.id, teacher: { isActive: true } }, select: { teacherId: true } }),
        tx.timeSlot.findFirst({ where: { id: data.timeSlotId, academicYearId: academicYear.id }, select: { id: true } }),
        tx.room.findFirst({ where: { id: data.roomId, isActive: true }, select: { id: true } }),
        data.id ? tx.scheduleEntry.findFirst({ where: { id: data.id, academicYearId: academicYear.id }, select: { id: true } }) : Promise.resolve(true),
      ]);
      if (!currentGroup || currentGroup.teacherId !== teacherId || !currentSlot || !currentRoom || !existingEntry) throw new SchedulePlacementError("invalid");
      const currentEntries = await tx.scheduleEntry.findMany({
        where: { academicYearId: academicYear.id },
        select: { id: true, teachingGroupId: true, teacherId: true, roomId: true, timeSlotId: true },
      });
      const currentGroups = await tx.teachingGroup.findMany({
        where: { academicYearId: academicYear.id },
        select: { id: true, members: { select: { enrollmentId: true } } },
      });
      const currentMemberships = currentGroups.map((group) => ({ teachingGroupId: group.id, enrollmentIds: group.members.map((member) => member.enrollmentId) }));
      if (conflictsForPlacement(candidate, currentEntries, currentMemberships).length > 0) throw new SchedulePlacementError("raceCondition");
      let entry: { id: string };

      if (data.id) {
        entry = await tx.scheduleEntry.update({
          where: { id: data.id },
          data: {
            teachingGroupId: data.teachingGroupId,
            teacherId,
            roomId: data.roomId,
            timeSlotId: data.timeSlotId,
          },
        });
      } else {
        entry = await tx.scheduleEntry.create({
          data: {
            schoolId,
            academicYearId: academicYear.id,
            teachingGroupId: data.teachingGroupId,
            teacherId,
            roomId: data.roomId,
            timeSlotId: data.timeSlotId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: data.id ? "scheduleEntry.update" : "scheduleEntry.create",
          entity: "ScheduleEntry",
          entityId: entry.id,
          after: JSON.parse(JSON.stringify(entry)),
        },
      });
    }, { isolationLevel: "ReadCommitted" }));
  } catch (error) {
    if (error instanceof SchedulePlacementError) {
      return error.code === "raceCondition"
        ? { status: "conflict", conflicts: [t("scheduling.conflicts.raceCondition")] }
        : { status: "error", message: t(`scheduling.errors.${error.code}`) };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      // Os três índices únicos apanharam uma condição de corrida que a verificação em
      // memória, feita sobre um horário já desactualizado, não viu — rede de segurança
      // final, nunca a primeira linha de defesa (ver design.md).
      return { status: "conflict", conflicts: [t("scheduling.conflicts.raceCondition")] };
    }

    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/timetables" }));
  }

  // Aviso de carga horária — nunca bloqueia, corre só depois de gravar com sucesso. Lida
  // DEPOIS da transacção: a colocação já gravada (nova ou remarcada) já entra na soma,
  // sem ser preciso somar a candidata à parte.
  const hoursByTeacher = await listWeeklyHoursByTeacher(schoolId, academicYear.id);
  const teacher = await db.teacher.findUnique({
    where: { id: teacherId },
    select: { maxWeeklyHours: true },
  });

  if (teacher?.maxWeeklyHours) {
    const totalHours = hoursByTeacher.get(teacherId) ?? 0;

    if (totalHours > teacher.maxWeeklyHours) {
      return {
        status: "success",
        warning: t("scheduling.warnings.maxWeeklyHoursExceeded", {
          total: totalHours,
          max: teacher.maxWeeklyHours,
        }),
      };
    }
  }

  return { status: "success" };
}
