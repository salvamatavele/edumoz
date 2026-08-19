import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { placeScheduleEntry } from "@/features/academic/actions/place-schedule-entry";
import type { ScheduleBoardData } from "@/features/academic/data/scheduling";
import { renderWithIntl } from "@/test/intl";

import { ScheduleBoard } from "./schedule-board";

vi.mock("@/features/academic/actions/place-schedule-entry", () => ({
  placeScheduleEntry: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockPlaceScheduleEntry = vi.mocked(placeScheduleEntry);

const data: ScheduleBoardData = {
  entries: [
    {
      id: "se-1",
      teachingGroupId: "tg-1",
      teachingGroupName: "Mat-10A",
      subjectName: "Matemática",
      teacherId: "t-1",
      teacherName: "Elsa Chirindza",
      roomId: "r-1",
      roomName: "Sala 1",
      timeSlotId: "ts-1",
      dayOfWeek: "MONDAY",
      startTime: "07:00",
      endTime: "07:45",
      classGroupId: "cg-1",
    },
  ],
  options: {
    teachingGroups: [
      { id: "tg-1", name: "Mat-10A", subjectName: "Matemática", teacherId: "t-1", teacherName: "Elsa Chirindza", classGroupId: "cg-1" },
      { id: "tg-2", name: "Por-10A", subjectName: "Português", teacherId: "t-1", teacherName: "Elsa Chirindza", classGroupId: "cg-1" },
    ],
    rooms: [{ id: "r-1", code: "S1", name: "Sala 1", capacity: 30, kind: "CLASSROOM" }],
    timeSlots: [
      { id: "ts-1", dayOfWeek: "MONDAY", startTime: "07:00", endTime: "07:45", shift: "MORNING", order: 1 },
      { id: "ts-2", dayOfWeek: "MONDAY", startTime: "07:45", endTime: "08:30", shift: "MORNING", order: 2 },
    ],
    teachers: [{ id: "t-1", name: "Elsa Chirindza" }],
    classGroups: [{ id: "cg-1", name: "10A" }],
  },
  candidates: [{ id: "se-1", teachingGroupId: "tg-1", teacherId: "t-1", roomId: "r-1", timeSlotId: "ts-1" }],
  memberships: [],
  academicYear: "2026",
};

describe("ScheduleBoard", () => {
  afterEach(() => {
    mockPlaceScheduleEntry.mockReset();
    refresh.mockClear();
  });

  it("mostra a colocação existente na célula certa", () => {
    renderWithIntl(<ScheduleBoard {...data} />);
    expect(screen.getByText("Matemática")).toBeInTheDocument();
  });

  it("coloca uma aula nova numa célula vazia, sem conflitos", async () => {
    mockPlaceScheduleEntry.mockResolvedValue({ status: "success" });
    renderWithIntl(<ScheduleBoard {...data} />);

    await userEvent.click(screen.getByRole("button", { name: "Colocar aula neste tempo" }));

    await userEvent.click(screen.getByRole("combobox", { name: "Agrupamento lectivo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Por-10A — Português" }));

    await userEvent.click(screen.getByRole("combobox", { name: "Sala" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sala 1" }));

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockPlaceScheduleEntry).toHaveBeenCalledWith({
        id: undefined,
        teachingGroupId: "tg-2",
        roomId: "r-1",
        timeSlotId: "ts-2",
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra o aviso de carga horária devolvido pela Server Action, depois de gravar", async () => {
    mockPlaceScheduleEntry.mockResolvedValue({
      status: "success",
      warning: "Este professor passa a ter 21 horas semanais, acima do máximo de 20.",
    });
    renderWithIntl(<ScheduleBoard {...data} />);

    await userEvent.click(screen.getByRole("button", { name: "Colocar aula neste tempo" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Agrupamento lectivo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Por-10A — Português" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Sala" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sala 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/acima do máximo de 20/);
  });

  it("mostra o conflito de professor no cliente, antes de submeter", async () => {
    renderWithIntl(<ScheduleBoard {...data} />);

    await userEvent.click(screen.getByRole("button", { name: "Colocar aula" }));

    await userEvent.click(screen.getByRole("combobox", { name: "Agrupamento lectivo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Por-10A — Português" }));

    await userEvent.click(screen.getByRole("combobox", { name: "Sala" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sala 1" }));

    await userEvent.click(screen.getByRole("combobox", { name: "Tempo lectivo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Segunda-feira 07:00–07:45" }));

    expect(await screen.findByText(/já tem Mat-10A neste tempo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(mockPlaceScheduleEntry).not.toHaveBeenCalled();
  });
});
