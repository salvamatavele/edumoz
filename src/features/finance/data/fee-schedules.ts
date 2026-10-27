import { getTenantDb } from "@/lib/db/tenant";
import type { FeeRecurrence } from "@/types";

export interface SelectOption {
  readonly id: string;
  readonly name: string;
}

export interface FeeScheduleRow {
  readonly id: string;
  readonly name: string;
  readonly gradeLevelName: string | null;
  readonly studyPathName: string | null;
  readonly itemCount: number;
}

/** Tabelas de propinas do ano lectivo activo. */
export async function listFeeSchedules(
  schoolId: string,
): Promise<{ rows: FeeScheduleRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const schedules = await db.feeSchedule.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      id: true,
      name: true,
      gradeLevel: { select: { name: true } },
      studyPath: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    rows: schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      gradeLevelName: schedule.gradeLevel?.name ?? null,
      studyPathName: schedule.studyPath?.name ?? null,
      itemCount: schedule._count.items,
    })),
    academicYear: academicYear.label,
  };
}

export interface FeeItemRow {
  readonly id: string;
  readonly feeScheduleId: string;
  readonly feeScheduleName: string;
  readonly code: string;
  readonly name: string;
  readonly amount: string;
  readonly recurrence: FeeRecurrence;
  readonly dueDayOfMonth: number | null;
  readonly isMandatory: boolean;
}

/** Rubricas de todas as tabelas de propinas do ano lectivo activo. */
export async function listFeeItems(
  schoolId: string,
): Promise<{ rows: FeeItemRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const items = await db.feeItem.findMany({
    where: { feeSchedule: { academicYearId: academicYear.id } },
    select: {
      id: true,
      feeScheduleId: true,
      feeSchedule: { select: { name: true } },
      code: true,
      name: true,
      amount: true,
      recurrence: true,
      dueDayOfMonth: true,
      isMandatory: true,
    },
    orderBy: [{ feeSchedule: { name: "asc" } }, { code: "asc" }],
  });

  return {
    rows: items.map((item) => ({
      id: item.id,
      feeScheduleId: item.feeScheduleId,
      feeScheduleName: item.feeSchedule.name,
      code: item.code,
      name: item.name,
      amount: item.amount.toString(),
      recurrence: item.recurrence,
      dueDayOfMonth: item.dueDayOfMonth,
      isMandatory: item.isMandatory,
    })),
    academicYear: academicYear.label,
  };
}

export interface FeeScheduleOptions {
  readonly gradeLevels: readonly SelectOption[];
  readonly studyPaths: readonly SelectOption[];
  readonly feeSchedules: readonly SelectOption[];
  readonly hasActiveAcademicYear: boolean;
}

/** Opções resolvidas para os formulários desta secção. */
export async function listFeeScheduleOptions(schoolId: string): Promise<FeeScheduleOptions> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const [gradeLevels, studyPaths, feeSchedules] = await Promise.all([
    db.gradeLevel.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
    academicYear
      ? db.studyPath.findMany({
          where: { academicYearId: academicYear.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    academicYear
      ? db.feeSchedule.findMany({
          where: { academicYearId: academicYear.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    gradeLevels,
    studyPaths,
    feeSchedules,
    hasActiveAcademicYear: academicYear !== null,
  };
}
