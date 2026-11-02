import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/intl";
import { changeOwnPasswordAction } from "@/features/identity/actions/change-own-password";
import { ChangePasswordForm } from "./change-password-form";
vi.mock("@/features/identity/actions/change-own-password", () => ({ changeOwnPasswordAction: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children }: { children: ReactNode }) => <NextLink href="/entrar">{children}</NextLink> }));
beforeEach(() => { vi.mocked(changeOwnPasswordAction).mockReset(); });
async function fill(confirm = "new synthetic phrase") {
  await userEvent.type(screen.getByLabelText(/^Palavra-passe actual/), "old synthetic phrase");
  await userEvent.type(screen.getByLabelText(/^Nova palavra-passe/), "new synthetic phrase");
  await userEvent.type(screen.getByLabelText(/^Confirmar nova/), confirm);
}
it("refuses mismatched confirmation before invoking the action", async () => {
  renderWithIntl(<ChangePasswordForm />);
  await fill("different synthetic phrase");
  await userEvent.click(screen.getByRole("button", { name: "Alterar palavra-passe" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("repita-a exactamente");
  expect(changeOwnPasswordAction).not.toHaveBeenCalled();
});
it("submits only password fields, clears secrets and shows the sign-in outcome", async () => {
  vi.mocked(changeOwnPasswordAction).mockResolvedValue({ status: "success" });
  renderWithIntl(<ChangePasswordForm />);
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Alterar palavra-passe" }));
  expect(await screen.findByRole("status")).toHaveTextContent("sessões anteriores foram revogadas");
  expect(changeOwnPasswordAction).toHaveBeenCalledWith({ currentPassword: "old synthetic phrase", newPassword: "new synthetic phrase", confirmPassword: "new synthetic phrase" });
  expect(screen.queryByLabelText(/^Nova palavra-passe/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Entrar novamente" })).toHaveAttribute("href", "/entrar");
});
it("clears secrets after rejection and preserves the actionable error", async () => {
  vi.mocked(changeOwnPasswordAction).mockResolvedValue({ status: "error", message: "Current password rejected" });
  renderWithIntl(<ChangePasswordForm />);
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Alterar palavra-passe" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Current password rejected");
  expect(screen.getByLabelText(/^Palavra-passe actual/)).toHaveValue("");
  expect(screen.getByLabelText(/^Nova palavra-passe/)).toHaveValue("");
});
it("reports uncertain transport results without retaining password fields", async () => {
  vi.mocked(changeOwnPasswordAction).mockRejectedValue(new Error("network"));
  renderWithIntl(<ChangePasswordForm />);
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Alterar palavra-passe" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível confirmar o resultado"));
  expect(screen.getByLabelText(/^Nova palavra-passe/)).toHaveValue("");
});
it("renders the password flow and session effect in English", () => {
  renderWithIntl(<ChangePasswordForm />, "en");
  expect(screen.getByLabelText(/^Current password/)).toHaveAttribute("autocomplete", "current-password");
  expect(screen.getByLabelText(/^New password/)).toHaveAttribute("autocomplete", "new-password");
  expect(screen.getByRole("button", { name: "Change password" })).toBeEnabled();
  expect(screen.getByText(/ends all your sessions/)).toBeVisible();
});
