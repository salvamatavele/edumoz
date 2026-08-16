import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { renderWithIntl } from "@/test/intl";

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("switches the document theme and remembers the choice", async () => {
    document.documentElement.dataset.theme = "light";
    renderWithIntl(<ThemeToggle />);

    await userEvent.click(
      screen.getByRole("button", { name: "Activar tema escuro" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Activar tema claro" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches back to the light theme", async () => {
    document.documentElement.dataset.theme = "dark";
    renderWithIntl(<ThemeToggle />);

    await userEvent.click(
      screen.getByRole("button", { name: "Activar tema claro" }),
    );

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
  it("traduz as etiquetas de acessibilidade para inglês", async () => {
    document.documentElement.dataset.theme = "light";
    renderWithIntl(<ThemeToggle />, "en");

    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
