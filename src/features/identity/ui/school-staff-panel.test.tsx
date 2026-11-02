import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { schoolStaffFieldsSchema } from "../domain/school-staff";
import type { ReactNode } from "react";
import { messages, renderWithIntl } from "@/test/intl";
import { loadSchoolStaffAction, saveSchoolStaffAction } from "../actions/school-staff";
import { SchoolStaffPanel } from "./school-staff-panel";
vi.mock("../actions/school-staff", () => ({ loadSchoolStaffAction: vi.fn(), saveSchoolStaffAction: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }), Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
const props = { schoolId: "school-a", data: { rows: [], count: 0, page: 1, pageCount: 1 }, query: { q: "", status: "" as const, page: 1 }, canCreate: true, canEdit: true };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(saveSchoolStaffAction).mockResolvedValue({ status: "success", data: null }); });
it("creates the full profile with school scope and a stable request identity", async () => {
  renderWithIntl(<SchoolStaffPanel {...props} />); await userEvent.click(screen.getByRole("button", { name: "Adicionar funcionário" }));
  await userEvent.type(screen.getByLabelText(/^Código/), "F001"); await userEvent.type(screen.getByLabelText(/^Nome completo/), "Synthetic employee"); await userEvent.type(screen.getByLabelText(/^Função profissional/), "Secretaria");
  expect(screen.getByLabelText("NUIT")).toBeVisible(); expect(screen.getByLabelText("Data de admissão")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(saveSchoolStaffAction).toHaveBeenCalledWith(expect.objectContaining({ expectedSchoolId: "school-a", requestId: expect.any(String), code: "F001", name: "Synthetic employee", jobTitle: "Secretaria", isActive: true })));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("does not render mutation controls for read-only permissions and supports English", () => {
  renderWithIntl(<SchoolStaffPanel {...props} canCreate={false} canEdit={false} />, "en");
  expect(screen.queryByRole("button", { name: "Add staff member" })).not.toBeInTheDocument(); expect(screen.getByLabelText("Name, code, job or contact")).toBeVisible();
});
it("keeps creation idempotency after transport uncertainty", async () => {
  vi.mocked(saveSchoolStaffAction).mockRejectedValueOnce(new Error("network")).mockResolvedValue({ status: "success", data: null });
  renderWithIntl(<SchoolStaffPanel {...props} />); await userEvent.click(screen.getByRole("button", { name: "Adicionar funcionário" }));
  await userEvent.type(screen.getByLabelText(/^Código/), "F002"); await userEvent.type(screen.getByLabelText(/^Nome completo/), "Synthetic person"); await userEvent.type(screen.getByLabelText(/^Função profissional/), "Guarda");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" })); await screen.findByText(/Não foi possível confirmar a gravação/); await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled()); await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(saveSchoolStaffAction).toHaveBeenCalledTimes(2)); expect(vi.mocked(saveSchoolStaffAction).mock.calls[0][0].requestId).toBe(vi.mocked(saveSchoolStaffAction).mock.calls[1][0].requestId);
});

it("loads an editable snapshot and submits its revision instead of changing the account link", async () => {
  const detail = { ...schoolStaffFieldsSchema.parse({ code: "F003", name: "Existing employee", jobTitle: "Secretary" }), id: "staff-a", revision: "2026-10-30T08:00:00.000Z" };
  vi.mocked(loadSchoolStaffAction).mockResolvedValue({ status: "success", data: detail });
  renderWithIntl(<SchoolStaffPanel {...props} data={{ rows: [{ id: "staff-a", code: "F003", name: "Existing employee", jobTitle: "Secretary", email: null, phone: null, isActive: true, linked: true }], count: 1, page: 1, pageCount: 1 }} />);
  await userEvent.click(screen.getAllByRole("button", { name: "Editar ficha de Existing employee" })[0]);
  await screen.findByLabelText(/^Nome completo/); await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(saveSchoolStaffAction).toHaveBeenCalledWith(expect.objectContaining({ id: "staff-a", revision: detail.revision, expectedSchoolId: "school-a" })));
  expect(vi.mocked(saveSchoolStaffAction).mock.calls[0][0]).not.toHaveProperty("userId");
});
it("keeps the opening school on a creation form when the page changes school", async () => {
  const view = renderWithIntl(<SchoolStaffPanel {...props} />); await userEvent.click(screen.getByRole("button", { name: "Adicionar funcionário" }));
  await userEvent.type(screen.getByLabelText(/^Código/), "F004"); await userEvent.type(screen.getByLabelText(/^Nome completo/), "Synthetic employee"); await userEvent.type(screen.getByLabelText(/^Função profissional/), "Secretary");
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><SchoolStaffPanel {...props} schoolId="school-b" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Guardar" })); await waitFor(() => expect(saveSchoolStaffAction).toHaveBeenCalledWith(expect.objectContaining({ expectedSchoolId: "school-a" })));
});
