import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/intl";

import { SchoolSwitcher } from "./school-switcher";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mockListSchoolsForSwitcher = vi.fn();
vi.mock("@/features/identity/actions/list-schools-for-switcher", () => ({
  listSchoolsForSwitcher: () => mockListSchoolsForSwitcher(),
}));

const mockUseSession = vi.mocked(useSession);

const schoolA = { schoolId: "school-a", schoolName: "Escola A", role: "SCHOOL_MANAGER" };
const schoolB = { schoolId: "school-b", schoolName: "Escola B", role: "TEACHER" };

describe("SchoolSwitcher", () => {
  beforeEach(() => {
    refresh.mockClear();
    mockListSchoolsForSwitcher.mockReset().mockResolvedValue([]);
  });

  it("uses fresh server access after revocation even when useSession still contains the old school", async () => {
    const update = vi.fn().mockResolvedValue({});
    mockUseSession.mockReturnValue({ data: { schoolId: schoolA.schoolId, memberships: [schoolA, schoolB], isPlatformAdmin: false }, status: "authenticated", update } as never);
    renderWithIntl(<SchoolSwitcher access={{ schoolId: null, isPlatformAdmin: false, memberships: [schoolB] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Escola" }));
    expect(screen.queryByRole("menuitemradio", { name: schoolA.schoolName })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitemradio", { name: schoolB.schoolName }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ schoolId: schoolB.schoolId }));
  });

  it("não aparece sem sessão", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    renderWithIntl(<SchoolSwitcher />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("não aparece com uma só Membership — um selector com uma opção é ruído", () => {
    mockUseSession.mockReturnValue({
      data: { schoolId: schoolA.schoolId, memberships: [schoolA] },
      status: "authenticated",
      update: vi.fn(),
    } as never);

    renderWithIntl(<SchoolSwitcher />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("allows selecting the remaining school after the active membership is revoked", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      data: { schoolId: null, memberships: [schoolB] },
      status: "authenticated",
      update,
    } as never);

    renderWithIntl(<SchoolSwitcher />);
    await userEvent.click(screen.getByRole("button", { name: "Escola" }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: schoolB.schoolName }));
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ schoolId: schoolB.schoolId });
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("lista as escolas e troca a escola activa ao escolher outra", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      data: { schoolId: schoolA.schoolId, memberships: [schoolA, schoolB] },
      status: "authenticated",
      update,
    } as never);

    renderWithIntl(<SchoolSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Escola" }));
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: schoolB.schoolName }),
    );

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ schoolId: schoolB.schoolId });
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("não chama update ao reescolher a escola já activa", async () => {
    const update = vi.fn();
    mockUseSession.mockReturnValue({
      data: { schoolId: schoolA.schoolId, memberships: [schoolA, schoolB] },
      status: "authenticated",
      update,
    } as never);

    renderWithIntl(<SchoolSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "Escola" }));
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: schoolA.schoolName }),
    );

    expect(update).not.toHaveBeenCalled();
  });

  it("lists each school once when the user has multiple roles there", async () => {
    mockUseSession.mockReturnValue({ data: { schoolId: schoolA.schoolId, memberships: [schoolA, { ...schoolA, role: "TEACHER" }, schoolB] }, status: "authenticated", update: vi.fn() } as never);
    renderWithIntl(<SchoolSwitcher />);
    await userEvent.click(screen.getByRole("button", { name: "Escola" }));
    expect(screen.getAllByRole("menuitemradio", { name: schoolA.schoolName })).toHaveLength(1);
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(2);
  });

  it("hides the selector for two roles in the same active school", () => {
    mockUseSession.mockReturnValue({ data: { schoolId: schoolA.schoolId, memberships: [schoolA, { ...schoolA, role: "TEACHER" }] }, status: "authenticated", update: vi.fn() } as never);
    renderWithIntl(<SchoolSwitcher />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  describe("administrador da plataforma", () => {
    it("mostra todas as escolas activas, mesmo sem nenhuma Membership", async () => {
      mockListSchoolsForSwitcher.mockResolvedValue([
        { id: schoolA.schoolId, name: schoolA.schoolName },
        { id: schoolB.schoolId, name: schoolB.schoolName },
      ]);
      mockUseSession.mockReturnValue({
        data: { schoolId: null, memberships: [], isPlatformAdmin: true },
        status: "authenticated",
        update: vi.fn(),
      } as never);

      renderWithIntl(<SchoolSwitcher />);

      const trigger = await screen.findByRole("button", { name: "Escola" });
      await userEvent.click(trigger);

      expect(await screen.findByRole("menuitemradio", { name: schoolA.schoolName })).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", { name: schoolB.schoolName })).toBeInTheDocument();
    });

    it("não aparece antes da lista de escolas chegar", () => {
      mockListSchoolsForSwitcher.mockReturnValue(new Promise(() => {}));
      mockUseSession.mockReturnValue({
        data: { schoolId: null, memberships: [], isPlatformAdmin: true },
        status: "authenticated",
        update: vi.fn(),
      } as never);

      renderWithIntl(<SchoolSwitcher />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
