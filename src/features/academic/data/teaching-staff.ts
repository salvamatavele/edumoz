import { getTenantDb } from "@/lib/db/tenant";
import type { SubjectScope } from "@/types";

import type { SelectOption } from "./academic-structure";

export interface TeacherRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly qualification: string | null;
  readonly maxWeeklyHours: number | null;
  readonly hasLoginAccess: boolean;
}

export async function listTeachers(schoolId: string): Promise<TeacherRow[]> {
  const db = getTenantDb(schoolId);

  const teachers = await db.teacher.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return teachers.map(
    (teacher) =>
      ({
        id: teacher.id,
        code: teacher.code,
        name: `${teacher.firstName} ${teacher.lastName}`,
        phone: teacher.phone,
        email: teacher.email,
        qualification: teacher.qualification,
        maxWeeklyHours: teacher.maxWeeklyHours,
        hasLoginAccess: teacher.userId !== null,
      }) satisfies TeacherRow,
  );
}

export interface TeachingGroupRow {
  readonly id: string;
  readonly name: string;
  readonly subject: string;
  readonly teacher: string | null;
  readonly classGroup: string | null;
  readonly scope: SubjectScope;
}

export async function listTeachingGroups(
  schoolId: string,
): Promise<{ rows: TeachingGroupRow[]; academicYear: string | null }> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  if (!academicYear) return { rows: [], academicYear: null };

  const groups = await db.teachingGroup.findMany({
    where: { academicYearId: academicYear.id },
    select: {
      id: true,
      name: true,
      scope: true,
      subject: { select: { name: true } },
      teacher: { select: { firstName: true, lastName: true } },
      classGroup: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = groups.map(
    (group) =>
      ({
        id: group.id,
        name: group.name,
        subject: group.subject.name,
        teacher: group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : null,
        classGroup: group.classGroup?.name ?? null,
        scope: group.scope,
      }) satisfies TeachingGroupRow,
  );

  return { rows, academicYear: academicYear.label };
}

export interface TeachingStaffOptions {
  readonly teachers: readonly SelectOption[];
  readonly subjects: readonly SelectOption[];
  readonly classGroups: readonly SelectOption[];
  readonly hasActiveAcademicYear: boolean;
}

/** Opções resolvidas para o formulário de `TeachingGroup`. */
export async function listTeachingStaffOptions(schoolId: string): Promise<TeachingStaffOptions> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const [teachers, subjects, classGroups] = await Promise.all([
    db.teacher.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    academicYear
      ? db.classGroup.findMany({
          where: { academicYearId: academicYear.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: `${teacher.firstName} ${teacher.lastName}`,
    })),
    subjects,
    classGroups,
    hasActiveAcademicYear: academicYear !== null,
  };
}
