// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { SubjectScope } from "@/types";

import { findSchoolByCode } from "@/lib/db/schools";
import { getTenantDb } from "@/lib/db/tenant";

import { detectScheduleConflicts } from "./domain/schedule-conflicts";
import type {
  ScheduleEntryCandidate,
  TeachingGroupMembership,
} from "./domain/scheduling";

/**
 * Cruza o horário realmente gravado pelo seed com o motor de conflitos.
 *
 * A mensagem "13 aulas, sem conflitos" que o seed imprime é apenas texto — nada a
 * verifica. Este teste transforma-a numa afirmação verificável, e cobre os critérios de
 * aceitação do horário em docs/specs/domain-foundation.md §6.
 */
describe("horário semeado", () => {
  let schoolId = "";
  let academicYearId = "";
  let entries: ScheduleEntryCandidate[] = [];
  let memberships: TeachingGroupMembership[] = [];

  beforeAll(async () => {
    const school = await findSchoolByCode("EPC-MAPUTO");

    if (!school) {
      throw new Error("Escola de demonstração em falta. Corra `pnpm db:seed` primeiro.");
    }

    schoolId = school.id;
    const db = getTenantDb(schoolId);

    const year = await db.academicYear.findFirstOrThrow({ where: { isActive: true } });
    academicYearId = year.id;

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
