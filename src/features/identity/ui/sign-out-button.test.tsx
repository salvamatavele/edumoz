import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { signOut } from "next-auth/react";
import { revokeOwnSessionsAction } from "../actions/own-sessions";
import { SignOutButton } from "./sign-out-button";
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("../actions/own-sessions", () => ({ revokeOwnSessionsAction: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("commits revocation before clearing the Auth.js cookie", async () => {
  vi.mocked(revokeOwnSessionsAction).mockResolvedValue({ status: "success" });
  renderWithIntl(<SignOutButton />);
  await userEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" }));
  expect(revokeOwnSessionsAction).toHaveBeenCalledWith("current");
  expect(vi.mocked(revokeOwnSessionsAction).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(signOut).mock.invocationCallOrder[0]);
});
it("retains the session and reports an unconfirmed revocation failure", async () => {
  vi.mocked(revokeOwnSessionsAction).mockResolvedValue({ status: "error", message: "Unavailable" });
  renderWithIntl(<SignOutButton />, "en");
  await userEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
  expect(signOut).not.toHaveBeenCalled();
});
