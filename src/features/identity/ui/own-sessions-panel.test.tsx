import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { revokeOwnSessionsAction } from "../actions/own-sessions";
import { OwnSessionsPanel } from "./own-sessions-panel";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions/own-sessions", () => ({ revokeOwnSessionsAction: vi.fn() }));
const rows = [{ id: "a".repeat(64), current: true, createdAt: "2026-10-30T10:00:00Z", lastSeenAt: "2026-10-30T10:05:00Z" }, { id: "b".repeat(64), current: false, createdAt: "2026-10-30T09:00:00Z", lastSeenAt: "2026-10-30T09:05:00Z" }];
beforeEach(() => { vi.resetAllMocks(); vi.mocked(revokeOwnSessionsAction).mockResolvedValue({ status: "success" }); });
it("requires confirmation before terminating another session and preserves current", async () => {
  renderWithIntl(<OwnSessionsPanel sessions={rows} />);
  await userEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
  expect(revokeOwnSessionsAction).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(revokeOwnSessionsAction).toHaveBeenCalledWith({ id: rows[1].id }));
  expect(await screen.findByRole("status")).toHaveTextContent("Sessões terminadas");
});
it("reports an uncertain response without declaring success", async () => {
  vi.mocked(revokeOwnSessionsAction).mockRejectedValue(new Error("Network"));
  renderWithIntl(<OwnSessionsPanel sessions={rows} />, "en");
  await userEvent.click(screen.getByRole("button", { name: "End other sessions" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
