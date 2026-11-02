import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { loadStaffLinkAction, previewStaffLinkAction, changeStaffLinkAction } from "../actions/school-user-staff-link";
import { ProfessionalLinkDialog } from "./school-user-teacher-link-dialog";
vi.mock("../actions/school-user-staff-link", () => ({ loadStaffLinkAction: vi.fn(), previewStaffLinkAction: vi.fn(), changeStaffLinkAction: vi.fn() }));
vi.mock("../actions/school-user-teacher-link", () => ({ loadTeacherLinkAction: vi.fn(), previewTeacherLinkAction: vi.fn(), changeTeacherLinkAction: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const revision = "a".repeat(64), props = { schoolId: "a", userId: "dual-person", accountName: "Synthetic dual person", kind: "staff" as const };
const current = { userId: "dual-person", revision, profile: null, canLink: true };
const candidate = { id: "staff-a", code: "F001", name: "Verified secretary", isActive: true, revision: "2026-10-30T08:00:00.000Z" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadStaffLinkAction).mockResolvedValue({ status: "success", data: current }); vi.mocked(previewStaffLinkAction).mockResolvedValue({ status: "success", data: { ...current, candidate } }); vi.mocked(changeStaffLinkAction).mockResolvedValue({ status: "success", data: null }); });
it("previews and confirms the Staff profile using the shared flow and scoped revisions", async () => {
  renderWithIntl(<ProfessionalLinkDialog {...props} />); await userEvent.click(screen.getByRole("button", { name: "Gerir ficha de funcionário de Synthetic dual person" }));
  await screen.findByLabelText(/^Código da ficha de funcionário/); await waitFor(() => expect(screen.getByLabelText(/^Código da ficha de funcionário/)).toBeEnabled());
  await userEvent.type(screen.getByLabelText(/^Código da ficha de funcionário/), "F001"); await userEvent.click(screen.getByRole("button", { name: "Verificar ficha" }));
  await screen.findByText("Verified secretary · F001"); await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar ligação" })).toBeEnabled()); expect(changeStaffLinkAction).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Confirmar ligação" })); await waitFor(() => expect(changeStaffLinkAction).toHaveBeenCalledWith({ userId: "dual-person", expectedSchoolId: "a", expectedRevision: revision, expectedProfileId: null, expectedProfileRevision: null, profileId: "staff-a", profileRevision: candidate.revision }));
});
it("uses employee wording for the internal membership prerequisite in English", async () => {
  vi.mocked(loadStaffLinkAction).mockResolvedValue({ status: "success", data: { ...current, canLink: false } });
  renderWithIntl(<ProfessionalLinkDialog {...props} />, "en"); await userEvent.click(screen.getByRole("button", { name: "Manage staff profile for Synthetic dual person" })); expect(await screen.findByText(/active staff membership/)).toBeVisible();
});
