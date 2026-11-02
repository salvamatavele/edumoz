import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/intl";
import { LocaleSwitcher } from "./locale-switcher";

const route = vi.hoisted(() => ({ pathname: "/finance", params: {} as Record<string, string>, query: "" }));
vi.mock("next/navigation", () => ({ useParams: () => route.params, useSearchParams: () => new URLSearchParams(route.query) }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => route.pathname,
  Link: ({ href, locale, children, ...props }: { href: { pathname: string; params: Record<string, string>; query: Record<string, string[]> }; locale: string; children: ReactNode }) => {
    const query = new URLSearchParams();
    for (const [key, values] of Object.entries(href.query)) for (const value of values) query.append(key, value);
    return <a {...props} data-params={JSON.stringify(href.params)} href={`/${locale}${href.pathname}?${query}`}>{children}</a>;
  },
}));

describe("locale navigation keeps the current working context", () => {
  beforeEach(() => { route.pathname = "/finance"; route.params = {}; route.query = ""; });
  it("preserves the invoice and selected tab in both languages", () => {
    route.query = "tab=payments&factura=invoice-a";
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/finance?tab=payments&factura=invoice-a");
    expect(screen.getByRole("link", { name: "Português" })).toHaveAttribute("href", "/pt/finance?tab=payments&factura=invoice-a");
  });
  it("retains repeated filter values and escaped text", () => {
    route.query = "turma=a&turma=b&q=Nome%20%26%20Apelido";
    renderWithIntl(<LocaleSwitcher />);
    const href = screen.getByRole("link", { name: "English" }).getAttribute("href")!;
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.getAll("turma")).toEqual(["a", "b"]);
    expect(url.searchParams.get("q")).toBe("Nome & Apelido");
  });
  it("retains route parameters on a receipt", () => {
    route.pathname = "/finance/receipt/[id]"; route.params = { id: "payment-a", locale: "pt" };
    renderWithIntl(<LocaleSwitcher />);
    expect(JSON.parse(screen.getByRole("link", { name: "English" }).getAttribute("data-params")!)).toEqual(route.params);
  });
});
