import { describe, expect, it } from "vitest";

import type { ScheduleEntryCandidate, TeachingGroupMembership } from "./scheduling";
import {
  conflictsForPlacement,
  detectScheduleConflicts,
  isFree,
} from "./schedule-conflicts";

/**
 * O cenário é o do seed: turmas 10A e 10B, ambas MISTAS, com alunos de Ciências e de
 * Letras. É o caso que torna o conflito de aluno impossível de exprimir como índice.
 */
const enrollments = {
  cienciasA: ["e1", "e2"],
  letrasA: ["e3", "e4"],
  cienciasB: ["e5", "e6"],
  letrasB: ["e7", "e8"],
};

const memberships: TeachingGroupMembership[] = [
  // Tronco Comum: a turma inteira, percursos misturados.
  {
    teachingGroupId: "g-10a-por",
    enrollmentIds: [...enrollments.cienciasA, ...enrollments.letrasA],
  },
  {
    teachingGroupId: "g-10b-por",
    enrollmentIds: [...enrollments.cienciasB, ...enrollments.letrasB],
  },
  // Secção: atravessa as duas turmas.
  {
    teachingGroupId: "g-cie-fis",
    enrollmentIds: [...enrollments.cienciasA, ...enrollments.cienciasB],
  },
  {
    teachingGroupId: "g-let-his",
    enrollmentIds: [...enrollments.letrasA, ...enrollments.letrasB],
  },
];

function entry(
  overrides: Partial<ScheduleEntryCandidate> & { teachingGroupId: string },
): ScheduleEntryCandidate {
  return {
    teacherId: "t1",
    roomId: "r1",
    timeSlotId: "seg-1",
    ...overrides,
  };
}

describe("detectScheduleConflicts", () => {
  it("não vê conflitos num horário vazio nem com uma só aula", () => {
    expect(detectScheduleConflicts({ entries: [], memberships })).toEqual([]);
    expect(
      detectScheduleConflicts({
        entries: [entry({ teachingGroupId: "g-10a-por" })],
        memberships,
      }),
    ).toEqual([]);
  });

  it("não vê conflitos em tempos lectivos diferentes", () => {
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", timeSlotId: "seg-1" }),
        entry({ teachingGroupId: "g-10b-por", timeSlotId: "seg-2" }),
      ],
      memberships,
    });

    expect(conflicts).toEqual([]);
  });

  it("detecta professor em dois sítios ao mesmo tempo", () => {
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-10b-por", teacherId: "t1", roomId: "r2" }),
      ],
      memberships,
    });

    expect(conflicts).toContainEqual({
      kind: "TEACHER_DOUBLE_BOOKED",
      timeSlotId: "seg-1",
      teacherId: "t1",
      teachingGroupIds: ["g-10a-por", "g-10b-por"],
    });
  });

  it("detecta sala ocupada duas vezes", () => {
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-10b-por", teacherId: "t2", roomId: "r1" }),
      ],
      memberships,
    });

    expect(conflicts).toContainEqual({
      kind: "ROOM_DOUBLE_BOOKED",
      timeSlotId: "seg-1",
      roomId: "r1",
      teachingGroupIds: ["g-10a-por", "g-10b-por"],
    });
  });

  it("detecta o mesmo agrupamento marcado duas vezes no mesmo tempo", () => {
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-10a-por", teacherId: "t2", roomId: "r2" }),
      ],
      memberships,
    });

    expect(conflicts).toContainEqual({
      kind: "GROUP_DOUBLE_BOOKED",
      timeSlotId: "seg-1",
      teachingGroupId: "g-10a-por",
    });
  });
});

describe("detectScheduleConflicts — conflito de aluno", () => {
  it("permite Física de Ciências e História de Letras em simultâneo", () => {
    // Este é o caso que as turmas mistas existem para permitir: dois agrupamentos de
    // Secção no mesmo tempo lectivo, sem nenhum aluno em comum.
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-cie-fis", teacherId: "t3", roomId: "lab" }),
        entry({ teachingGroupId: "g-let-his", teacherId: "t4", roomId: "r1" }),
      ],
      memberships,
    });

    expect(conflicts).toEqual([]);
  });

  it("detecta o aluno apanhado entre Tronco Comum e Secção", () => {
    // Português de 10A inclui TODOS os alunos de 10A; Física de Ciências inclui os de
    // Ciências de 10A e de 10B. Os alunos de Ciências de 10A estão nos dois — e nenhum
    // índice único da base de dados consegue exprimir isto.
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-cie-fis", teacherId: "t3", roomId: "lab" }),
      ],
      memberships,
    });

    const students = conflicts.filter((c) => c.kind === "STUDENT_DOUBLE_BOOKED");

    expect(students).toHaveLength(enrollments.cienciasA.length);
    expect(students.map((c) => c.enrollmentId).sort()).toEqual(enrollments.cienciasA);
    expect(students[0]).toMatchObject({
      timeSlotId: "seg-1",
      teachingGroupIds: ["g-10a-por", "g-cie-fis"],
    });
  });

  it("não reporta conflito de aluno quando o agrupamento não tem membros conhecidos", () => {
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-desconhecido", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-outro", teacherId: "t2", roomId: "r2" }),
      ],
      memberships,
    });

    expect(conflicts.filter((c) => c.kind === "STUDENT_DOUBLE_BOOKED")).toEqual([]);
  });

  it("devolve todos os conflitos de uma vez, não só o primeiro", () => {
    // Mesmo professor, mesma sala e alunos em comum, tudo ao mesmo tempo.
    const conflicts = detectScheduleConflicts({
      entries: [
        entry({ teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
        entry({ teachingGroupId: "g-cie-fis", teacherId: "t1", roomId: "r1" }),
      ],
      memberships,
    });

    const kinds = new Set(conflicts.map((c) => c.kind));

    expect(kinds).toContain("TEACHER_DOUBLE_BOOKED");
    expect(kinds).toContain("ROOM_DOUBLE_BOOKED");
    expect(kinds).toContain("STUDENT_DOUBLE_BOOKED");
  });
});

describe("conflictsForPlacement", () => {
  const existing = [
    entry({ id: "s1", teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
  ];

  it("aceita uma colocação livre", () => {
    const candidate = entry({
      teachingGroupId: "g-10b-por",
      teacherId: "t2",
      roomId: "r2",
    });

    expect(conflictsForPlacement(candidate, existing, memberships)).toEqual([]);
    expect(isFree(candidate, existing, memberships)).toBe(true);
  });

  it("recusa colocar o mesmo professor no mesmo tempo", () => {
    const candidate = entry({
      teachingGroupId: "g-10b-por",
      teacherId: "t1",
      roomId: "r2",
    });

    expect(isFree(candidate, existing, memberships)).toBe(false);
  });

  it("não culpa a nova aula por conflitos que já lá estavam", () => {
    const jaConflituoso = [
      entry({ id: "s1", teachingGroupId: "g-10a-por", teacherId: "t1", roomId: "r1" }),
      entry({ id: "s2", teachingGroupId: "g-10b-por", teacherId: "t1", roomId: "r2" }),
    ];

    const candidate = entry({
      teachingGroupId: "g-let-his",
      teacherId: "t9",
      roomId: "r9",
      timeSlotId: "ter-1",
    });

    expect(conflictsForPlacement(candidate, jaConflituoso, memberships)).toEqual([]);
  });

  it("ao remarcar uma aula, não a conta contra si própria", () => {
    // Mover a mesma aula para outra sala não pode colidir com a sua posição anterior.
    const candidate = entry({
      id: "s1",
      teachingGroupId: "g-10a-por",
      teacherId: "t1",
      roomId: "r5",
    });

    expect(conflictsForPlacement(candidate, existing, memberships)).toEqual([]);
  });
});
