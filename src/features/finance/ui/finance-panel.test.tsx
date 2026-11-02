import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { FeeScheduleOptions } from "@/features/finance/data/fee-schedules";
import { renderWithIntl } from "@/test/intl";

import { FinancePanel } from "./finance-panel";

vi.mock("@/features/finance/actions/create-fee-schedule", () => ({ createFeeSchedule: vi.fn() }));
vi.mock("@/features/finance/actions/create-fee-item", () => ({ createFeeItem: vi.fn() }));
vi.mock("@/features/finance/actions/generate-invoices", () => ({ generateInvoices: vi.fn() }));
vi.mock("@/features/finance/actions/record-manual-payment", () => ({ recordManualPayment: vi.fn() }));
vi.mock("@/features/finance/actions/initiate-mobile-money-payment", () => ({ initiateMobileMoneyPayment: vi.fn() }));
vi.mock("@/features/finance/actions/confirm-payment", () => ({ confirmPayment: vi.fn() }));
vi.mock("@/features/finance/actions/reverse-payment", () => ({ reversePayment: vi.fn() }));

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("tab=invoicing&turma=class-a&periodYear=2026") }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace }),
  Link: ({ children, href, ...props }: { children: ReactNode; href: { pathname: string; query: Record<string, string> } }) => <a href={href.pathname + "?" + new URLSearchParams(href.query)} {...props}>{children}</a>,
}));

const emptyOptions: FeeScheduleOptions = {
  gradeLevels: [],
  studyPaths: [],
  feeSchedules: [],
  hasActiveAcademicYear: true,
};

function Panel({ canCreate = true, initialTab = "feeSchedules", invoice = null, debtReport = null }: { debtReport?: ComponentProps<typeof FinancePanel>["debtReport"]; canCreate?: boolean; initialTab?: ComponentProps<typeof FinancePanel>["initialTab"]; invoice?: ComponentProps<typeof FinancePanel>["invoiceForPayment"] }) {
  return <FinancePanel
      canCreate={canCreate}
      canEdit={canCreate}
      feeSchedules={{ rows: [], academicYear: "2026" }}
      feeItems={{ rows: [], academicYear: "2026" }}
      options={emptyOptions}
      debtReportFilters={{ classGroups: [] }}
      debtReport={debtReport}
      debtReportQuery={{ classGroupId: "class-a", periodYear: "2026", periodMonth: "3" }}
      studentAccount={null}
      invoiceForPayment={invoice}
      initialTab={initialTab}
    />;
}
function renderPanel(canCreate = true) { return renderWithIntl(<Panel canCreate={canCreate} />); }

describe("FinancePanel", () => {
  it("keeps the same debt filters when opening the student account or payments", () => {
    renderWithIntl(<Panel initialTab="invoicing" debtReport={[{
      enrollmentId: "enrollment-a", studentName: "Alice", invoiceId: "invoice-a", reference: "202603-0001", total: "100", paidAmount: "40", status: "PARTIAL", dueDate: new Date("2026-03-10"),
    }]} />);
    for (const name of ["Alice", "Pagamentos"]) {
      const link = screen.getByRole("link", { name });
      const url = new URL(link.getAttribute("href")!, "http://localhost");
      expect(url.searchParams.get("turma")).toBe("class-a");
      expect(url.searchParams.has("classGroupId")).toBe(false);
      expect(url.searchParams.get("periodYear")).toBe("2026");
      expect(url.searchParams.get("periodMonth")).toBe("3");
    }
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute("href", expect.stringContaining("conta=enrollment-a"));
    expect(screen.getByRole("link", { name: "Pagamentos" })).toHaveAttribute("href", expect.stringContaining("factura=invoice-a"));
  });

  it("opens the requested tab when client navigation changes the route props", async () => {
    function Navigation() {
      const [tab, setTab] = useState<ComponentProps<typeof FinancePanel>["initialTab"]>("invoicing");
      return <><button onClick={() => setTab("payments")}>Open invoice payments</button><Panel initialTab={tab} /></>;
    }
    renderWithIntl(<Navigation />);
    expect(screen.getByRole("tab", { name: "Facturação" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("button", { name: "Open invoice payments" }));
    expect(screen.getByRole("tab", { name: "Pagamentos" })).toHaveAttribute("aria-selected", "true");
  });
  it("keeps filters in the URL when changing tabs", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("tab", { name: "Pagamentos" }));
    expect(replace).toHaveBeenCalledWith({ pathname: "/finance", query: { tab: "payments", turma: "class-a", periodYear: "2026" } }, { scroll: false });
  });
  it("clears the payment draft when navigation selects another invoice", async () => {
    function Navigation() {
      const [id, setId] = useState("invoice-a");
      return <><button onClick={() => setId("invoice-b")}>Open second invoice</button><Panel initialTab="payments" invoice={{ id, reference: id, total: "100", paidAmount: "0", currency: "MZN", status: "PENDING", studentName: "Synthetic pupil", payments: [] }} /></>;
    }
    renderWithIntl(<Navigation />);
    await userEvent.type(screen.getByLabelText(/Valor \(MT\)/), "40");
    await userEvent.click(screen.getByRole("button", { name: "Open second invoice" }));
    expect(screen.getByLabelText(/Valor \(MT\)/)).toHaveValue(null);
  });

  it("mantém consultas e esconde a criação para um leitor", async () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: "Adicionar tabela" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Facturação" }));
    expect(screen.queryByRole("button", { name: /Gerar facturas/ })).not.toBeInTheDocument();
  });
  it("mostra os dois separadores", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: "Tabelas de propinas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rubricas" })).toBeInTheDocument();
  });

  it("abre o modal de criação de tabela de propinas", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tabela" }));
    expect(screen.getByRole("dialog", { name: "Nova tabela de propinas" })).toBeInTheDocument();
  });
});
