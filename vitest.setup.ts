import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Este setup corre para toda a suite, mas os testes de base de dados usam o ambiente
// `node` (`// @vitest-environment node`), onde não há `window` nem `document`. Tudo o que
// é específico do DOM fica atrás desta guarda.
const isDom = typeof window !== "undefined";

// Node's own `localStorage` global shadows jsdom's unless the runtime is started
// with --localstorage-file, so tests get an in-memory implementation instead.
if (isDom && !window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    } satisfies Storage,
  });
}

/**
 * O jsdom não implementa a Pointer Capture API nem `scrollIntoView`, e os primitivos do
 * Radix (Select, DropdownMenu, Popover) chamam-nos ao abrir. Sem estes preenchimentos, os
 * testes rebentam com `target.hasPointerCapture is not a function` — uma falha do ambiente
 * de teste, não do componente.
 */
if (isDom) {
  const proto = window.Element.prototype as unknown as Record<string, unknown>;

  proto["hasPointerCapture"] ??= () => false;
  proto["setPointerCapture"] ??= () => undefined;
  proto["releasePointerCapture"] ??= () => undefined;
  proto["scrollIntoView"] ??= () => undefined;

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  if (!isDom) return;

  cleanup();
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.clear();
});
