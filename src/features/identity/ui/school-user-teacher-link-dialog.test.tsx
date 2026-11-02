import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import { messages, renderWithIntl } from "@/test/intl";
import { changeTeacherLinkAction, loadTeacherLinkAction, previewTeacherLinkAction } from "../actions/school-user-teacher-link";
import { SchoolUserTeacherLinkDialog } from "./school-user-teacher-link-dialog";
vi.mock("@/features/identity/actions/school-user-staff-link", () => ({ loadStaffLinkAction: vi.fn(), previewStaffLinkAction: vi.fn(), changeStaffLinkAction: vi.fn() }));
vi.mock("../actions/school-user-teacher-link", () => ({ changeTeacherLinkAction: vi.fn(), loadTeacherLinkAction: vi.fn(), previewTeacherLinkAction: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const revision = "a".repeat(64);
const link = { userId: "person", revision, teacher: null, canLink: true };
const candidate = { id: "teacher", name: "Verified Teacher", code: "T001", isActive: true, revision: "2026-10-30T08:00:00.000Z" };
const props = { schoolId: "school-a", userId: "person", accountName: "Synthetic person" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadTeacherLinkAction).mockResolvedValue({ status: "success", data: link }); vi.mocked(previewTeacherLinkAction).mockResolvedValue({ status: "success", data: { ...link, candidate } }); vi.mocked(changeTeacherLinkAction).mockResolvedValue({ status: "success", data: null }); });
async function open() { const view = renderWithIntl(<SchoolUserTeacherLinkDialog {...props} />); await userEvent.click(screen.getByRole("button", { name: "Gerir ficha docente de Synthetic person" })); await screen.findByLabelText(/^Código da ficha docente/); await waitFor(() => expect(screen.getByLabelText(/^Código da ficha docente/)).toBeEnabled()); return view; }
async function verify() { await userEvent.type(screen.getByLabelText(/^Código da ficha docente/), "T001"); await userEvent.click(screen.getByRole("button", { name: "Verificar ficha" })); await screen.findByText("Verified Teacher · T001"); await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar ligação" })).toBeEnabled()); }
it("requires a named preview before changing a link", async () => {
  await open(); await verify(); expect(changeTeacherLinkAction).not.toHaveBeenCalled();
  expect(previewTeacherLinkAction).toHaveBeenCalledWith({ userId: "person", expectedSchoolId: "school-a", expectedRevision: revision, expectedTeacherId: null, expectedTeacherRevision: null, teacherCode: "T001" });
  await userEvent.click(screen.getByRole("button", { name: "Confirmar ligação" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(changeTeacherLinkAction).toHaveBeenCalledWith({ userId: "person", expectedSchoolId: "school-a", expectedRevision: revision, expectedTeacherId: null, expectedTeacherRevision: null, teacherId: candidate.id, teacherRevision: candidate.revision });
  expect(screen.getByRole("status")).toHaveTextContent("Ligação actualizada"); expect(refresh).toHaveBeenCalledOnce();
});
it("reports unavailable candidates without a confirm control or mutation", async () => {
  vi.mocked(previewTeacherLinkAction).mockResolvedValue({ status: "error", message: "Unavailable profile" });
  await open(); await userEvent.type(screen.getByLabelText(/^Código da ficha docente/), "T001"); await userEvent.click(screen.getByRole("button", { name: "Verificar ficha" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable profile"); expect(screen.queryByRole("button", { name: "Confirmar ligação" })).not.toBeInTheDocument(); expect(changeTeacherLinkAction).not.toHaveBeenCalled();
});
it("freezes the opening school through preview and confirmation", async () => {
  const view = await open(); view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><SchoolUserTeacherLinkDialog {...props} schoolId="school-b" /></NextIntlClientProvider>);
  await verify(); await userEvent.click(screen.getByRole("button", { name: "Confirmar ligação" })); await waitFor(() => expect(changeTeacherLinkAction).toHaveBeenCalled());
  expect(vi.mocked(changeTeacherLinkAction).mock.calls[0][0].expectedSchoolId).toBe("school-a");
});
it("blocks replay after uncertain transport and clears the preview on closing", async () => {
  vi.mocked(changeTeacherLinkAction).mockRejectedValue(new Error("network")); await open(); await verify(); await userEvent.click(screen.getByRole("button", { name: "Confirmar ligação" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar");
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Confirmar ligação" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" })); expect(screen.queryByText("Verified Teacher · T001")).not.toBeInTheDocument();
});
it("confirms unlinking explicitly in English and preserves the existing snapshot", async () => {
  vi.mocked(loadTeacherLinkAction).mockResolvedValue({ status: "success", data: { ...link, teacher: candidate } });
  vi.mocked(previewTeacherLinkAction).mockResolvedValue({ status: "success", data: { ...link, teacher: candidate, candidate: null } });
  renderWithIntl(<SchoolUserTeacherLinkDialog {...props} />, "en"); await userEvent.click(screen.getByRole("button", { name: "Manage teacher profile for Synthetic person" }));
  await screen.findByLabelText("Operation"); await waitFor(() => expect(screen.getByLabelText("Operation")).toBeEnabled()); await userEvent.selectOptions(screen.getByLabelText("Operation"), "unlink");
  expect(screen.getByText(/lessons, grades and history are preserved/)).toBeVisible(); await userEvent.click(screen.getByRole("button", { name: "Verify profile" })); await screen.findByRole("button", { name: "Confirm unlink" }); await waitFor(() => expect(screen.getByRole("button", { name: "Confirm unlink" })).toBeEnabled());
  expect(changeTeacherLinkAction).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole("button", { name: "Confirm unlink" })); await waitFor(() => expect(changeTeacherLinkAction).toHaveBeenCalledWith(expect.objectContaining({ expectedTeacherId: candidate.id, teacherId: null, teacherRevision: null })));
});
it("shows the role prerequisite and does not silently assign a teacher role", async () => {
  vi.mocked(loadTeacherLinkAction).mockResolvedValue({ status: "success", data: { ...link, canLink: false } });
  renderWithIntl(<SchoolUserTeacherLinkDialog {...props} />); await userEvent.click(screen.getByRole("button", { name: "Gerir ficha docente de Synthetic person" }));
  expect(await screen.findByText(/não atribui papéis/)).toBeVisible(); await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled()); expect(screen.getByRole("button", { name: "Verificar ficha" })).toBeDisabled();
});
