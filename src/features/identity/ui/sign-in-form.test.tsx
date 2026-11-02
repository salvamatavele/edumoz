import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn } from "next-auth/react";
import { renderWithIntl } from "@/test/intl";
import { SignInForm } from "./sign-in-form";

const request = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(request.query) }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ locale }: { locale: string }) => locale === "en" ? "/en/students" : "/alunos" }));

describe("sign-in return destination", () => {
  beforeEach(() => { request.query = ""; vi.mocked(signIn).mockReset(); });

  it.each(["https://outside.invalid", "//outside.invalid", "/en/../alunos", "/api/auth/signout"])("does not pass an unsafe destination to Google: %s", async (destination) => {
    request.query = new URLSearchParams({ continuar: destination }).toString();
    renderWithIntl(<SignInForm />);
    await userEvent.click(screen.getByRole("button", { name: /Google/ }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/alunos" });
  });

  it("uses the English fallback and retains an explicit login error", async () => {
    request.query = new URLSearchParams({ continuar: "https://outside.invalid", error: "AccessDenied" }).toString();
    renderWithIntl(<SignInForm />, "en");
    expect(screen.getByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Google/ }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/en/students" });
  });

  it("retains a valid invoice destination for Google", async () => {
    request.query = new URLSearchParams({ continuar: "/en/finance?tab=payments&factura=invoice-1" }).toString();
    renderWithIntl(<SignInForm />, "en");
    await userEvent.click(screen.getByRole("button", { name: /Google/ }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/en/finance?tab=payments&factura=invoice-1" });
  });

  it("does not navigate after a refused credential attempt", async () => {
    request.query = new URLSearchParams({ continuar: "//outside.invalid" }).toString();
    vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin", code: "credentials", status: 401, ok: false, url: null });
    renderWithIntl(<SignInForm />, "en");
    await userEvent.type(screen.getByLabelText(/E-mail|email/i), "synthetic@example.invalid");
    await userEvent.type(screen.getByLabelText(/Password/), "Synthetic-Only!");
    await userEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ redirect: false }));
  });
  it("shows a generic error when the authentication request fails in transit", async () => {
    vi.mocked(signIn).mockRejectedValue(Error("Private network details"));
    renderWithIntl(<SignInForm />, "en");
    await userEvent.click(screen.getByRole("button", { name: /Google/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toBeVisible();
    expect(alert).not.toHaveTextContent("Private network details");
  });

});
