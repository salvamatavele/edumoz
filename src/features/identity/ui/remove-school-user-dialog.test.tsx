import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { messages, renderWithIntl } from "@/test/intl";
import { previewSchoolUserRemovalAction, removeSchoolUserAction } from "../actions/school-user-removal";
import { RemoveSchoolUserDialog } from "./remove-school-user-dialog";
vi.mock("../actions/school-user-removal", () => ({ previewSchoolUserRemovalAction: vi.fn(), removeSchoolUserAction: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const preview = { userId: "target", name: "Synthetic confirmed holder", loginCode: "EDU-SYNTHETIC", revision: "a".repeat(64) };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(previewSchoolUserRemovalAction).mockResolvedValue({ status: "success", user: preview }); vi.mocked(removeSchoolUserAction).mockResolvedValue({ status: "success" }); });
it("shows the server preview and preserves the opening school through confirmation", async () => {
  const view = renderWithIntl(<RemoveSchoolUserDialog schoolId="a" userId="target" accountName="Synthetic" />);
  await userEvent.click(screen.getByRole("button", { name: "Retirar associação de Synthetic" }));
  expect(await screen.findByText(preview.name)).toBeVisible();
  expect(screen.getByText(preview.loginCode)).toBeVisible();
  expect(removeSchoolUserAction).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar retirada" })).toBeEnabled());
  // The real school switch rerenders this client without authorizing a different target.
  view.rerender(<NextIntlClientProvider locale="pt" messages={messages.pt}><RemoveSchoolUserDialog schoolId="b" userId="target" accountName="Synthetic" /></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Confirmar retirada" }));
  await waitFor(() => expect(removeSchoolUserAction).toHaveBeenCalledWith({ userId: "target", revision: preview.revision, expectedSchoolId: "a" }));
});
it("does not allow removal when the preview fails", async () => {
  vi.mocked(previewSchoolUserRemovalAction).mockResolvedValue({ status: "error", message: "No local association" });
  renderWithIntl(<RemoveSchoolUserDialog schoolId="a" userId="target" accountName="Synthetic" />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Remove school association for Synthetic" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No local association");
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm removal" })).toBeDisabled());
});
it("blocks blind replay after an uncertain transport response", async () => {
  vi.mocked(removeSchoolUserAction).mockRejectedValue(new Error("Network"));
  renderWithIntl(<RemoveSchoolUserDialog schoolId="a" userId="target" accountName="Synthetic" />, "en");
  await userEvent.click(screen.getByRole("button", { name: "Remove school association for Synthetic" }));
  await screen.findByText(preview.name);
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm removal" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("response did not arrive");
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm removal" })).toBeDisabled());
});
