import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { createSchoolUserAction, reissueInitialCredentialAction } from "@/features/identity/actions/create-school-user";
import { CreateSchoolUserDialog } from "./create-school-user-dialog";
vi.mock("@/features/identity/actions/create-school-user", () => ({ createSchoolUserAction: vi.fn(), reissueInitialCredentialAction: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const credential = { userId: "synthetic", name: "New account", schoolName: "School A", loginCode: "EDU-FAKE-TEST-ONLY", password: "Synthetic-secret-not-real", expiresAt: "2026-10-30T08:00:00.000Z" };
beforeEach(() => { vi.mocked(createSchoolUserAction).mockReset(); vi.mocked(reissueInitialCredentialAction).mockReset(); refresh.mockReset(); });
async function open() {
  renderWithIntl(<CreateSchoolUserDialog schoolId="school-a" canManageManagers />);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  await userEvent.type(screen.getByLabelText(/^Nome completo/), "New account");
}
async function submit() { await userEvent.click(await screen.findByRole("button", { name: "Criar e entregar credencial" })); }
it("requires a role and sends no password or global identity from the form", async () => {
  vi.mocked(createSchoolUserAction).mockResolvedValue({ status: "created", credential });
  await open(); await submit();
  expect(createSchoolUserAction).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeVisible();
  await userEvent.click(screen.getByLabelText("Professor", { exact: true }));
  await userEvent.click(screen.getByLabelText("Encarregado de educação", { exact: true }));
  await submit();
  expect(await screen.findByText("EDU-FAKE-TEST-ONLY")).toBeVisible();
  expect(createSchoolUserAction).toHaveBeenCalledWith({ expectedSchoolId: "school-a", requestId: expect.any(String), name: "New account", email: "", phone: "", roles: ["TEACHER", "GUARDIAN"], teacherCode: "" });
  const field = screen.getByLabelText("Palavra-passe temporária");
  expect(field).toHaveAttribute("type", "password");
  expect(field).toHaveAttribute("readonly");
  expect(field).toHaveValue(credential.password);
});
it("discards the delivered secret on close and starts a fresh request on reopening", async () => {
  vi.mocked(createSchoolUserAction).mockResolvedValue({ status: "created", credential });
  await open(); await userEvent.click(screen.getByLabelText("Aluno", { exact: true })); await submit();
  await screen.findByText("EDU-FAKE-TEST-ONLY");
  await waitFor(() => expect(screen.getByRole("button", { name: "Concluir entrega" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Concluir entrega" }));
  expect(screen.queryByLabelText("Palavra-passe temporária")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  expect(screen.getByLabelText(/^Nome completo/)).toHaveValue("");
  expect(screen.queryByText("EDU-FAKE-TEST-ONLY")).not.toBeInTheDocument();
});
it("does not offer manager creation to a delegated creator", async () => {
  renderWithIntl(<CreateSchoolUserDialog schoolId="school-a" canManageManagers={false} />);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  expect(screen.queryByRole("checkbox", { name: "Gestor" })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Professor" })).toBeVisible();
});
it("reuses the request key after a transport failure and never invents a delivered secret", async () => {
  vi.mocked(createSchoolUserAction).mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ status: "alreadyCreated", userId: "synthetic" });
  await open(); await userEvent.click(screen.getByLabelText("Aluno", { exact: true })); await submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível confirmar");
  expect(screen.queryByLabelText("Palavra-passe temporária")).not.toBeInTheDocument();
  await submit();
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Este pedido já foi concluído"));
  const calls = vi.mocked(createSchoolUserAction).mock.calls;
  expect(calls[0][0].requestId).toBe(calls[1][0].requestId);
});
it("renders English delivery wording with optional contact fields", async () => {
  renderWithIntl(<CreateSchoolUserDialog schoolId="school-a" canManageManagers />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByLabelText("Contact email (optional)")).not.toBeRequired();
  expect(screen.getByLabelText("Contact mobile number (optional)")).not.toBeRequired();
  expect(screen.getByText(/24 hours/)).toBeVisible();
});

it("confirms an initial reissue without accepting a password or editing identity", async () => {
  vi.mocked(reissueInitialCredentialAction).mockResolvedValue({ status: "created", credential });
  renderWithIntl(<CreateSchoolUserDialog schoolId="school-a" canManageManagers reissueUserId="synthetic" accountName="New account" />);
  await userEvent.click(screen.getByRole("button", { name: "Reemitir credencial inicial" }));
  expect(screen.queryByLabelText(/^Nome completo/)).not.toBeInTheDocument();
  expect(screen.getByText(/invalida a anterior/)).toBeVisible();
  expect(screen.getByText(/O código de entrada mantém-se/)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Reemitir e entregar credencial" }));
  expect(await screen.findByLabelText("Palavra-passe temporária")).toHaveValue(credential.password);
  expect(reissueInitialCredentialAction).toHaveBeenCalledWith({ userId: "synthetic", requestId: expect.any(String), expectedSchoolId: "school-a" });
  expect(createSchoolUserAction).not.toHaveBeenCalled();
});

it("keeps the school captured at opening even if the page is refreshed into another school", async () => {
  vi.mocked(createSchoolUserAction).mockResolvedValue({ status: "error", message: "School changed" });
  const view = renderWithIntl(<CreateSchoolUserDialog schoolId="school-a" canManageManagers />);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  await userEvent.type(screen.getByLabelText(/^Nome completo/), "Scoped synthetic account");
  await userEvent.click(screen.getByLabelText("Professor", { exact: true }));
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt} timeZone="Africa/Maputo"><CreateSchoolUserDialog schoolId="school-b" canManageManagers /></NextIntlClientProvider>);
  await submit();
  expect(createSchoolUserAction).toHaveBeenCalledWith(expect.objectContaining({ expectedSchoolId: "school-a" }));
});
