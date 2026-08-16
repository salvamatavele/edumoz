export const THEME_STORAGE_KEY = "edumoz-theme";

export type Theme = "light" | "dark";

/** Applies the theme to the document and remembers the choice. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing or blocked storage: the theme still applies for this visit.
  }
}

/** Reads the theme currently applied to the document. */
export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
