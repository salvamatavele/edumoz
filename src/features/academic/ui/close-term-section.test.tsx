import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { CloseTermSection } from "./close-term-section";
import { closeTerm } from "../actions/close-term";
import { reopenTerm } from "../actions/reopen-term";
vi.mock("../actions/close-term", () => ({ closeTerm: vi.fn() }));
vi.mock("../actions/reopen-term", () => ({ reopenTerm: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));
const terms = [{ id: "open", name: "Primeiro trimestre", status: "OPEN" }, { id: "closed", name: "Segundo trimestre", status: "CLOSED" }] as const;
describe("term closing and reopening", () => {
  beforeEach(() => {
    vi.mocked(closeTerm).mockReset().mockResolvedValue({ status: "success", resultCount: 1 });
    vi.mocked(reopenTerm).mockReset().mockResolvedValue({ status: "success", resultCount: 1 });
    refresh.mockClear();
  });
  it("requires confirmation before closing", async () => {
    renderWithIntl(<CloseTermSection terms={terms} />);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(closeTerm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Fechar trimestre" }));
    await waitFor(() => expect(closeTerm).toHaveBeenCalledWith({ termId: "open" }));
    expect(refresh).toHaveBeenCalled();
  });
  it("requires a reason before reopening and submits it with the term id", async () => {
    renderWithIntl(<CloseTermSection terms={terms} />);
    await userEvent.click(screen.getByRole("button", { name: "Reabrir" }));
    const confirm = screen.getByRole("button", { name: "Reabrir trimestre" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo da reabertura"), "Corrigir nota lançada por engano");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() => expect(reopenTerm).toHaveBeenCalledWith({ termId: "closed", reason: "Corrigir nota lançada por engano" }));
    expect(refresh).toHaveBeenCalled();
  });
  it("retains the reason and announces a server refusal", async () => {
    vi.mocked(reopenTerm).mockResolvedValue({ status: "error", message: "Sem permissão" });
    renderWithIntl(<CloseTermSection terms={terms} />);
    await userEvent.click(screen.getByRole("button", { name: "Reabrir" }));
    await userEvent.type(screen.getByLabelText("Motivo da reabertura"), "Corrigir nota lançada por engano");
    await userEvent.click(screen.getByRole("button", { name: "Reabrir trimestre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão");
    expect(screen.getByLabelText("Motivo da reabertura")).toHaveValue("Corrigir nota lançada por engano");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not offer mutations to read-only managers", () => {
    renderWithIntl(<CloseTermSection terms={terms} canClose={false} />);
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reabrir" })).not.toBeInTheDocument();
  });
});
