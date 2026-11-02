import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import { messages, renderWithIntl } from "@/test/intl";
import { editSchoolUserAction, loadSchoolUserEditAction } from "../actions/edit-school-user";
import { EditSchoolUserDialog } from "./edit-school-user-dialog";
vi.mock("../actions/edit-school-user", () => ({ editSchoolUserAction: vi.fn(), loadSchoolUserEditAction: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const user = { userId: "person", name: "Synthetic person", email: "", phone: "", revision: "2026-10-30T08:00:00.000Z" };
const props = { schoolId: "school-a", userId: "person", accountName: "Synthetic person" };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadSchoolUserEditAction).mockResolvedValue({ status: "success", user }); vi.mocked(editSchoolUserAction).mockResolvedValue({ status: "success" }); });
async function open() { const view = renderWithIntl(<EditSchoolUserDialog {...props} />); await userEvent.click(screen.getByRole("button", { name: "Editar conta de Synthetic person" })); await screen.findByLabelText(/^Nome completo/); await waitFor(() => expect(screen.getByLabelText(/^Nome completo/)).toBeEnabled()); return view; }
it("loads on demand, sends the snapshot revision and confirms a successful save", async () => {
  await open();
  expect(loadSchoolUserEditAction).toHaveBeenCalledWith({ userId: "person", expectedSchoolId: "school-a" });
  await userEvent.clear(screen.getByLabelText(/^Nome completo/)); await userEvent.type(screen.getByLabelText(/^Nome completo/), "Corrected person");
  await userEvent.click(screen.getByRole("button", { name: "Guardar alterações" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(editSchoolUserAction).toHaveBeenCalledWith({ ...user, name: "Corrected person", expectedSchoolId: "school-a" });
  expect(screen.getByRole("status")).toHaveTextContent("Dados guardados");
  expect(refresh).toHaveBeenCalledOnce();
});
it("does not expose fields when the account is unavailable", async () => {
  vi.mocked(loadSchoolUserEditAction).mockResolvedValue({ status: "error", message: "Unavailable account" });
  renderWithIntl(<EditSchoolUserDialog {...props} />); await userEvent.click(screen.getByRole("button", { name: "Editar conta de Synthetic person" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable account");
  expect(screen.queryByLabelText(/^Nome completo/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Guardar alterações" })).not.toBeInTheDocument();
});
it("keeps the opening school even when the page changes school", async () => {
  const view = await open();
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><EditSchoolUserDialog {...props} schoolId="school-b" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Guardar alterações" }));
  await waitFor(() => expect(editSchoolUserAction).toHaveBeenCalledWith(expect.objectContaining({ expectedSchoolId: "school-a" })));
});
it("blocks resubmission after transport uncertainty and removes form data on close", async () => {
  vi.mocked(editSchoolUserAction).mockRejectedValue(new Error("network"));
  await open(); await userEvent.click(screen.getByRole("button", { name: "Guardar alterações" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar");
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Guardar alterações" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByLabelText(/^Nome completo/)).not.toBeInTheDocument();
});
it("shows a conflict without silently overwriting and supports English", async () => {
  vi.mocked(editSchoolUserAction).mockResolvedValue({ status: "error", message: "Review the current version" });
  renderWithIntl(<EditSchoolUserDialog {...props} />, "en"); await userEvent.click(screen.getByRole("button", { name: "Edit account for Synthetic person" }));
  await screen.findByLabelText(/^Full name/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  expect(screen.getByText(/unverified and do not change/)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Review the current version");
  expect(screen.getByRole("dialog")).toBeVisible();
});
