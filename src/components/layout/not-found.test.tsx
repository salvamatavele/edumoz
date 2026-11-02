// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import pt from "../../../messages/pt.json";
import en from "../../../messages/en.json";

let locale: "pt" | "en" = "pt";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: keyof typeof pt.common) => ({ pt, en })[locale].common[key] }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
const NotFound = (await import("@/app/[locale]/not-found")).default;

it.each(["pt", "en"] as const)("renders a localized recovery page in %s", async (language) => {
  locale = language;
  const html = renderToStaticMarkup(await NotFound());
  expect(html).toContain(({ pt, en })[language].common.notFoundTitle);
  expect(html).toContain(({ pt, en })[language].common.notFoundDescription);
  expect(html).toContain(({ pt, en })[language].common.returnHome);
  expect(html).toContain('id="conteudo-principal"');
  expect(html).toContain('href="/"');
});
