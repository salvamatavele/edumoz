import { describe, expect, it } from "vitest";

import {
  computeAttendanceSummary,
  isExcludedByAbsences,
  todaysDayOfWeek,
  type AttendanceRecordInput,
} from "./attendance";

const math = { subjectId: "subject-math", subjectName: "Matemática" };
const portuguese = { subjectId: "subject-por", subjectName: "Português" };

function record(
  subject: { subjectId: string; subjectName: string },
  status: AttendanceRecordInput["status"],
): AttendanceRecordInput {
  return { ...subject, status };
}

describe("computeAttendanceSummary", () => {
  it("conta faltas por disciplina, não por dia", () => {
    const summary = computeAttendanceSummary([
      record(math, "ABSENT"),
      record(portuguese, "ABSENT"),
    ]);

    const mathCount = summary.bySubject.find((s) => s.subjectId === math.subjectId);
    const porCount = summary.bySubject.find((s) => s.subjectId === portuguese.subjectId);

    expect(mathCount?.absent).toBe(1);
    expect(porCount?.absent).toBe(1);
    expect(summary.totalAbsences).toBe(2);
  });

  it("separa presente, falta, atrasado e justificado", () => {
    const summary = computeAttendanceSummary([
      record(math, "PRESENT"),
      record(math, "ABSENT"),
      record(math, "LATE"),
      record(math, "EXCUSED"),
    ]);

    expect(summary.bySubject[0]).toMatchObject({
      present: 1,
      absent: 1,
      late: 1,
      excused: 1,
    });
  });

  it("só conta ABSENT em totalAbsences — atrasado e justificado ficam de fora", () => {
    const summary = computeAttendanceSummary([
      record(math, "LATE"),
      record(math, "EXCUSED"),
    ]);

    expect(summary.totalAbsences).toBe(0);
  });

  it("devolve lista vazia sem registos", () => {
    expect(computeAttendanceSummary([])).toEqual({ bySubject: [], totalAbsences: 0 });
  });
});

describe("isExcludedByAbsences", () => {
  it("exclui quando uma disciplina ultrapassa o limite", () => {
    const summary = computeAttendanceSummary([
      record(math, "ABSENT"),
      record(math, "ABSENT"),
      record(math, "ABSENT"),
    ]);

    expect(isExcludedByAbsences(summary, { maxAbsences: 2 })).toBe(true);
  });

  it("não exclui pela soma de disciplinas diferentes", () => {
    const summary = computeAttendanceSummary([
      record(math, "ABSENT"),
      record(math, "ABSENT"),
      record(portuguese, "ABSENT"),
      record(portuguese, "ABSENT"),
    ]);

    // 2 faltas em cada disciplina, limite 2 — nenhuma ultrapassa sozinha.
    expect(isExcludedByAbsences(summary, { maxAbsences: 2 })).toBe(false);
  });

  it("não exclui dentro do limite", () => {
    const summary = computeAttendanceSummary([record(math, "ABSENT")]);
    expect(isExcludedByAbsences(summary, { maxAbsences: 2 })).toBe(false);
  });
});

describe("todaysDayOfWeek", () => {
  it("mapeia uma segunda-feira", () => {
    // 2026-08-17 é uma segunda-feira.
    expect(todaysDayOfWeek(new Date("2026-08-17T00:00:00.000Z"))).toBe("MONDAY");
  });

  it("mapeia um domingo", () => {
    expect(todaysDayOfWeek(new Date("2026-08-16T00:00:00.000Z"))).toBe("SUNDAY");
  });

  it("usa o dia UTC, não o do fuso do servidor", () => {
    // 23:30 UTC de sexta-feira continua sexta em UTC, mesmo que o fuso local já seja sábado.
    expect(todaysDayOfWeek(new Date("2026-08-14T23:30:00.000Z"))).toBe("FRIDAY");
  });
});
