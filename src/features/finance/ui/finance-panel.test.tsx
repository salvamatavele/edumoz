import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}));

const emptyOptions: FeeScheduleOptions = {
  gradeLevels: [],
  studyPaths: [],
  feeSchedules: [],
  hasActiveAcademicYear: true,
};

function renderPanel() {
  renderWithIntl(
    <FinancePanel
      feeSchedules={{ rows: [], academicYear: "2026" }}
      feeItems={{ rows: [], academicYear: "2026" }}
      options={emptyOptions}
      debtReportFilters={{ classGroups: [] }}
      debtReport={null}
      debtReportQuery={{ classGroupId: "", periodYear: "2026", periodMonth: "" }}
      studentAccount={null}
      invoiceForPayment={null}
      initialTab="feeSchedules"
    />,
  );
}

describe("FinancePanel", () => {
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
