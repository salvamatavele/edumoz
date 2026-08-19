import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ScheduleViewEntry } from "@/features/academic/data/scheduling";
import { renderWithIntl } from "@/test/intl";

import { ScheduleView } from "./schedule-view";

const entries: ScheduleViewEntry[] = [
  {
    id: "se-1",
    dayOfWeek: "MONDAY",
    startTime: "07:00",
    endTime: "07:45",
    subjectName: "Matemática",
    teachingGroupName: "Mat-10A",
    teacherName: "Elsa Chirindza",
    roomName: "Sala 1",
  },
  {
    id: "se-2",
    dayOfWeek: "TUESDAY",
    startTime: "07:00",
    endTime: "08:00",
    subjectName: "Português",
    teachingGroupName: "Por-10A",
    teacherName: "João Muianga",
    roomName: "Sala 2",
  },
];

describe("ScheduleView", () => {
  it("mostra o estado vazio quando não há colocações", () => {
    renderWithIntl(<ScheduleView entries={[]} />);
    expect(screen.getByText("Ainda não há aulas no seu horário.")).toBeInTheDocument();
  });

  it("mostra o nome do professor por omissão", () => {
    renderWithIntl(<ScheduleView entries={entries} />);
    expect(screen.getAllByText(/Elsa Chirindza/).length).toBeGreaterThan(0);
  });

  it("esconde o nome do professor e mostra o agrupamento quando showTeacher é falso", () => {
    renderWithIntl(<ScheduleView entries={entries} showTeacher={false} />);
    expect(screen.queryByText("Elsa Chirindza")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Mat-10A/).length).toBeGreaterThan(0);
  });

  it("mostra as duas disciplinas", () => {
    renderWithIntl(<ScheduleView entries={entries} />);
    expect(screen.getAllByText("Matemática").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Português").length).toBeGreaterThan(0);
  });

  it("mostra as duas aulas de uma turma mista no mesmo dia e tempo, sem colapsar uma na outra", () => {
    const simultaneous: ScheduleViewEntry[] = [
      {
        id: "se-a",
        dayOfWeek: "MONDAY",
        startTime: "07:00",
        endTime: "07:45",
        subjectName: "Física",
        teachingGroupName: "Fisica-Ciencias",
        teacherName: "Fátima Física",
        roomName: "Sala 1",
      },
      {
        id: "se-b",
        dayOfWeek: "MONDAY",
        startTime: "07:00",
        endTime: "07:45",
        subjectName: "História",
        teachingGroupName: "Historia-Letras",
        teacherName: "Horácio História",
        roomName: "Sala 2",
      },
    ];

    renderWithIntl(<ScheduleView entries={simultaneous} />);

    expect(screen.getAllByText("Física").length).toBeGreaterThan(0);
    expect(screen.getAllByText("História").length).toBeGreaterThan(0);
  });
});
