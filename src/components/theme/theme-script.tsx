import { THEME_STORAGE_KEY } from "@/lib/theme";

// Runs before paint so the stored theme never flashes the wrong colours.
const script = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=s==="dark"||s==="light"?s:(d?"dark":"light");}catch(e){document.documentElement.dataset.theme="light";}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
