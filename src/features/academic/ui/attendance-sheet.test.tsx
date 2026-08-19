import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { reopenAttendance } from "@/features/academic/actions/reopen-attendance";
import { submitAttendance } from "@/features/academic/actions/submit-attendance";
import { renderWithIntl } from "@/test/intl";

import { AttendanceSheet } from "./attendance-sheet";

vi.mock("@/features/academic/actions/submit-attendance", () => ({
  submitAttendance: vi.fn(),
}));

vi.mock("@/features/academic/actions/reopen-attendance", () => ({
  reopenAttendance: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockSubmitAttendance = vi.mocked(submitAttendance);
const mockReopenAttendance = vi.mocked(reopenAttendance);

const entries = [
  { enrollmentId: "e1", studentName: "Ana Matsinhe", status: "PRESENT" as const },
  { enrollmentId: "e2", studentName: "Bruno Zandamela", status: "PRESENT" as const },
];

function setup(overrides: Partial<React.ComponentProps<typeof AttendanceSheet>> = {}) {
  return renderWithIntl(
    <AttendanceSheet
      scheduleEntryId="schedule-1"
      date="2026-08-17"
      teachingGroupName="10A"
      subjectName="Matemática"
      sessionId={null}
      sessionStatus={null}
      initialEntries={entries}
      {...overrides}
    />,
  );
}

describe("AttendanceSheet", () => {
  it("abre com todos os alunos como Presente", () => {
    setup();

    const rows = screen.getAllByText("Presente");
    expect(rows).toHaveLength(2);
  });

  it("alternar um aluno muda o ecrã sem chamar a acção", async () => {
    setup();

    await userEvent.click(screen.getByRole("button", { name: /Ana Matsinhe/ }));

    expect(screen.getByText("Falta")).toBeInTheDocument();
    expect(mockSubmitAttendance).not.toHaveBeenCalled();
  });

  it("submeter só envia o delta", async () => {
    mockSubmitAttendance.mockResolvedValue({ status: "success" });
    setup();

    // Ana: Presente → Falta. Bruno fica Presente, não entra no delta.
    await userEvent.click(screen.getByRole("button", { name: /Ana Matsinhe/ }));
    await userEvent.click(screen.getByRole("button", { name: "Submeter" }));

    await waitFor(() => {
      expect(mockSubmitAttendance).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleEntryId: "schedule-1",
          changes: [{ enrollmentId: "e1", status: "ABSENT" }],
        }),
      );
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("mostra o erro do servidor sem actualizar a página", async () => {
    mockSubmitAttendance.mockResolvedValue({ status: "error", message: "Falhou" });
    refresh.mockClear();
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Submeter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falhou");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("uma sessão submetida fica bloqueada até reabrir", async () => {
    mockReopenAttendance.mockResolvedValue({ status: "success" });
    setup({ sessionId: "session-1", sessionStatus: "SUBMITTED" });

    expect(screen.queryByRole("button", { name: "Submeter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ana Matsinhe/ })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Reabrir" }));

    await waitFor(() => expect(mockReopenAttendance).toHaveBeenCalledWith("session-1"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
