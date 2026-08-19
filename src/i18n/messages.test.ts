import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { routing } from "./routing";

/**
 * Paridade entre catálogos.
 *
 * O erro típico da tradução não é traduzir mal — é acrescentar uma chave numa língua e
 * esquecer a outra. Isso não rebenta nada: a interface inglesa passa simplesmente a
 * mostrar o caminho da chave a um utilizador. Estes testes tornam-no numa falha de build.
 */

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flatten(value, path);
  });
}

/** Marcadores ICU: `{year}`, `{page}`. Têm de existir nas duas línguas. */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)[^}]*\}/g)].map((match) => match[1]).sort();
}

function valueAt(tree: Tree, path: string): string {
  const value = path.split(".").reduce<string | Tree>((node, key) => {
    if (typeof node === "string") return node;
    return node[key];
  }, tree);

  return typeof value === "string" ? value : "";
}

const catalogues: Record<string, Tree> = { pt: pt as Tree, en: en as Tree };

describe("catálogos de mensagens", () => {
  it("existe um ficheiro por língua configurada", () => {
    expect(Object.keys(catalogues).sort()).toEqual([...routing.locales].sort());
  });

  it("têm exactamente as mesmas chaves", () => {
    const ptKeys = flatten(pt as Tree).sort();
    const enKeys = flatten(en as Tree).sort();

    expect(enKeys).toEqual(ptKeys);
  });

  it("não têm mensagens vazias", () => {
    for (const [locale, tree] of Object.entries(catalogues)) {
      for (const key of flatten(tree)) {
        expect(valueAt(tree, key).trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("usam os mesmos marcadores ICU nas duas línguas", () => {
    for (const key of flatten(pt as Tree)) {
      expect(placeholders(valueAt(en as Tree, key)), key).toEqual(
        placeholders(valueAt(pt as Tree, key)),
      );
    }
  });

  it("não deixam texto por traduzir no catálogo inglês", () => {
    // Uma chave copiada de pt para en sem traduzir fica idêntica. Algumas coincidências
    // são legítimas — nomes próprios e siglas — e estão listadas aqui de propósito.
    const legitimatelyIdentical = new Set([
      "app.name",
      "app.titleTemplate",
      "common.language",
      "nav.portal",
      "teachingStaff.teachers.columns.email",
      "teachingStaff.teachers.create.fields.email",
      "assessmentSchemes.columns.regime",
      "assessmentSchemes.componentType.ORAL",
      "assessmentSchemes.create.fields.regime",
    ]);

    const untranslated = flatten(pt as Tree).filter((key) => {
      if (legitimatelyIdentical.has(key)) return false;
      return valueAt(pt as Tree, key) === valueAt(en as Tree, key);
    });

    expect(untranslated).toEqual([]);
  });
});
