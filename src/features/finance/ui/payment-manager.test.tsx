import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { recordManualPayment } from "../actions/record-manual-payment";
import { initiateMobileMoneyPayment } from "../actions/initiate-mobile-money-payment";
import { confirmPayment } from "../actions/confirm-payment";
import { PaymentManager } from "./payment-manager";
import type { InvoiceForPayment } from "../data/payments";
vi.mock("../actions/record-manual-payment", () => ({ recordManualPayment: vi.fn() }));
vi.mock("../actions/initiate-mobile-money-payment", () => ({ initiateMobileMoneyPayment: vi.fn() }));
vi.mock("../actions/confirm-payment", () => ({ confirmPayment: vi.fn() }));
vi.mock("../actions/reverse-payment", () => ({ reversePayment: vi.fn() }));
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }));
const invoice: InvoiceForPayment = { id: "invoice-a", reference: "202609-0001", total: "100", paidAmount: "0", currency: "MZN", status: "PENDING", studentName: "Synthetic pupil", payments: [] };
describe("stable payment intentions in the interface", () => {
  beforeEach(() => { vi.mocked(recordManualPayment).mockReset(); vi.mocked(initiateMobileMoneyPayment).mockReset(); vi.mocked(confirmPayment).mockReset(); refresh.mockClear(); });
  it("retains a manual intent on a lost response and creates a fresh one after success", async () => {
    vi.mocked(recordManualPayment).mockRejectedValueOnce(Error("Synthetic lost response")).mockResolvedValue({ status: "success" });
    renderWithIntl(<PaymentManager invoice={invoice} />);
    await userEvent.type(screen.getByLabelText(/Valor \(MT\)/), "40");
    await userEvent.click(await screen.findByRole("button", { name: "Registar pagamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Tente novamente sem alterar/);
    await userEvent.click(await screen.findByRole("button", { name: "Registar pagamento" }));
    await waitFor(() => expect(recordManualPayment).toHaveBeenCalledTimes(2));
    const first = vi.mocked(recordManualPayment).mock.calls[0][0];
    const retry = vi.mocked(recordManualPayment).mock.calls[1][0];
    expect(first.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry).toEqual(first);
    await waitFor(() => expect(screen.getByLabelText(/Valor \(MT\)/)).toHaveValue(null));
    await waitFor(() => expect(screen.getByLabelText(/Valor \(MT\)/)).toBeEnabled());
    await userEvent.type(screen.getByLabelText(/Valor \(MT\)/), "20");
    await userEvent.click(await screen.findByRole("button", { name: "Registar pagamento" }));
    await waitFor(() => expect(recordManualPayment).toHaveBeenCalledTimes(3));
    expect(vi.mocked(recordManualPayment).mock.calls[2][0].idempotencyKey).not.toBe(first.idempotencyKey);
  });
  it("retains the mobile intent after an explicit gateway refusal", async () => {
    vi.mocked(initiateMobileMoneyPayment).mockResolvedValueOnce({ status: "error", message: "Operador indisponível" }).mockResolvedValue({ status: "success" });
    renderWithIntl(<PaymentManager invoice={invoice} />);
    await userEvent.type(screen.getByLabelText(/Número do pagador/), "+258849876543");
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar pagamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Operador indisponível");
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar pagamento" }));
    await waitFor(() => expect(initiateMobileMoneyPayment).toHaveBeenCalledTimes(2));
    expect(vi.mocked(initiateMobileMoneyPayment).mock.calls[1][0]).toEqual(vi.mocked(initiateMobileMoneyPayment).mock.calls[0][0]);
  });
  it("shows a confirmation failure instead of silently refreshing", async () => {
    vi.mocked(confirmPayment).mockResolvedValue({ status: "error", message: "Referência desconhecida" });
    renderWithIntl(<PaymentManager invoice={{ ...invoice, payments: [{ id: "pending", amount: "100", method: "MOBILE_MONEY", provider: "MPESA", status: "PENDING", createdAt: new Date("2026-03-01"), confirmedAt: null, reversedAt: null }] }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Referência desconhecida");
  });
  it("shows the stored invoice currency rather than labelling every payment as meticais", () => {
    renderWithIntl(<PaymentManager invoice={{ ...invoice, currency: "USD" }} />);
    expect(screen.getByLabelText(/Valor \(USD\)/)).toBeVisible();
    expect(screen.getByText(/100 USD/)).toBeVisible();
    expect(screen.queryByLabelText(/Valor \(MT\)/)).not.toBeInTheDocument();
  });

});
