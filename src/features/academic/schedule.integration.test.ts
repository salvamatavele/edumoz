// @vitest-environment node
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SubjectScope } from "@/types";

import { getTenantDb } from "@/lib/db/tenant";

import { detectScheduleConflicts } from "./domain/schedule-conflicts";
import type {
  ScheduleEntryCandidate,
  TeachingGroupMembership,
} from "./domain/scheduling";

const { prisma } = await import("@/lib/db/client");

/** Exercise mixed teaching groups against real persistence without application seed data. */
describe("horário integrado com dados isolados", () => {
  let schoolId = "";
  let academicYearId = "";
  let entries: ScheduleEntryCandidate[] = [];
  let memberships: TeachingGroupMembership[] = [];

  beforeAll(async () => {
    const suffix = randomUUID();
    const school = await prisma.school.create({
      data: { code: `SCHEDULE-${suffix}`, name: "Synthetic schedule school", province: "Maputo", district: "KaMpfumu" },
    });
    schoolId = school.id;
    const db = getTenantDb(schoolId);
    const year = await db.academicYear.create({
      data: { schoolId, year: 2026, label: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-15"), isActive: true },
    });
    academicYearId = year.id;
    const gradeLevel = await db.gradeLevel.create({
      data: { schoolId, code: "10", name: "10", order: 10, cycle: "SECONDARY_FIRST_CYCLE" },
    });
    const path = await db.studyPath.create({
      data: { schoolId, academicYearId, gradeLevelId: gradeLevel.id, code: "10", name: "10" },
    });
    const classGroup = await db.classGroup.create({
      data: { schoolId, academicYearId, name: "10A", shift: "MORNING" },
    });
    const enrollmentIds: string[] = [];
    for (let index = 0; index < 2; index++) {
      const student = await db.student.create({
        data: { schoolId, code: `ST-${index}`, firstName: "Synthetic", lastName: `Student ${index}`, birthDate: new Date("2010-01-01"), gender: "FEMALE" },
      });
      const enrollment = await db.enrollment.create({
        data: { schoolId, academicYearId, studentId: student.id, studyPathId: path.id, classGroupId: classGroup.id, number: `2026/${index}` },
      });
      enrollmentIds.push(enrollment.id);
    }
    const teachers = await Promise.all([0, 1].map((index) => db.teacher.create({
      data: { schoolId, code: `T-${index}`, firstName: "Synthetic", lastName: `Teacher ${index}` },
    })));
    const rooms = await Promise.all([0, 1].map((index) => db.room.create({
      data: { schoolId, code: `R-${index}`, name: `Room ${index}`, kind: "CLASSROOM" },
    })));
    const slots = await Promise.all([7, 8, 9].map((hour) => db.timeSlot.create({
      data: { schoolId, academicYearId, dayOfWeek: "MONDAY", shift: "MORNING", startTime: `0${hour}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00` },
    })));
    const scopes = [SubjectScope.CORE, SubjectScope.SECTION, SubjectScope.INTERNAL, SubjectScope.SECTION];
    for (const [index, scope] of scopes.entries()) {
      const parallel = index === 3;
      const subject = await db.subject.create({ data: { schoolId, code: `SUB-${index}`, name: `Subject ${index}` } });
      const group = await db.teachingGroup.create({
        data: {
          schoolId, academicYearId, subjectId: subject.id, teacherId: teachers[parallel ? 1 : 0].id,
          name: `Group ${index}`, scope,
          members: { create: (scope === SubjectScope.SECTION ? [enrollmentIds[parallel ? 1 : 0]] : enrollmentIds).map((enrollmentId) => ({ enrollmentId })) },
        },
      });
      await db.scheduleEntry.create({
        data: { schoolId, academicYearId, teachingGroupId: group.id, teacherId: teachers[parallel ? 1 : 0].id, roomId: rooms[parallel ? 1 : 0].id, timeSlotId: slots[parallel ? 1 : index].id },
      });
    }

    const rows = await db.scheduleEntry.findMany({
      where: { academicYearId },
      select: {
        id: true,
        teachingGroupId: true,
        teacherId: true,
        roomId: true,
        timeSlotId: true,
      },
    });

    entries = rows;

    const groups = await db.teachingGroup.findMany({
      where: { academicYearId },
      select: { id: true, members: { select: { enrollmentId: true } } },
    });

    memberships = groups.map((group) => ({
      teachingGroupId: group.id,
      enrollmentIds: group.members.map((m) => m.enrollmentId),
    }));
  });

  afterAll(async () => {
    if (schoolId) {
      const db = getTenantDb(schoolId);
      await db.scheduleEntry.deleteMany();
      await db.enrollment.deleteMany();
      await prisma.school.delete({ where: { id: schoolId } });
    }
    await prisma.$disconnect();
  });

  it("tem aulas e agrupamentos com alunos", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(memberships.length).toBeGreaterThan(0);
    expect(memberships.every((m) => m.enrollmentIds.length > 0)).toBe(true);
  });

  it("não tem um único conflito — de professor, sala, agrupamento ou aluno", () => {
    expect(detectScheduleConflicts({ entries, memberships })).toEqual([]);
  });

  it("coloca Secções diferentes no mesmo tempo lectivo", () => {
    // Sem isto, o horário não estaria a exercitar as turmas mistas de todo.
    const bySlot = new Map<string, number>();
    for (const entry of entries) {
      bySlot.set(entry.timeSlotId, (bySlot.get(entry.timeSlotId) ?? 0) + 1);
    }

    expect([...bySlot.values()].some((count) => count > 1)).toBe(true);
  });

  it("tem um professor com Tronco Comum, Secção e Currículo Interno no mesmo ano", async () => {
    const db = getTenantDb(schoolId);

    const groups = await db.teachingGroup.findMany({
      where: { academicYearId, teacherId: { not: null } },
      select: { teacherId: true, scope: true },
    });

    const scopesByTeacher = new Map<string, Set<SubjectScope>>();
    for (const group of groups) {
      if (!group.teacherId) continue;

      const set = scopesByTeacher.get(group.teacherId) ?? new Set<SubjectScope>();
      set.add(group.scope);
      scopesByTeacher.set(group.teacherId, set);
    }

    const spansAllScopes = [...scopesByTeacher.values()].some(
      (scopes) =>
        scopes.has(SubjectScope.CORE) &&
        scopes.has(SubjectScope.SECTION) &&
        scopes.has(SubjectScope.INTERNAL),
    );

    expect(spansAllScopes).toBe(true);
  });

  it("recusaria uma aula que colidisse com o horário existente", () => {
    const [first] = entries;

    const duplicate: ScheduleEntryCandidate = {
      teachingGroupId: "grupo-inventado",
      teacherId: first.teacherId,
      roomId: first.roomId,
      timeSlotId: first.timeSlotId,
    };

    const conflicts = detectScheduleConflicts({
      entries: [...entries, duplicate],
      memberships,
    });

    const kinds = new Set(conflicts.map((c) => c.kind));
    expect(kinds).toContain("TEACHER_DOUBLE_BOOKED");
    expect(kinds).toContain("ROOM_DOUBLE_BOOKED");
  });
});
