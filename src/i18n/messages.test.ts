import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
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

/** Compare argument names throughout the ICU tree, excluding translated branch text. */
function placeholders(message: string): string[] {
  const names = new Set<string>();
  function visit(elements: readonly MessageFormatElement[]) {
    for (const element of elements) {
      if (element.type === TYPE.literal || element.type === TYPE.pound) continue;
      names.add(element.value);
      if (element.type === TYPE.plural || element.type === TYPE.select) {
        for (const option of Object.values(element.options)) visit(option.value);
      } else if (element.type === TYPE.tag) visit(element.children);
    }
  }
  visit(parse(message));
  return [...names].sort();
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
      "finance.invoicing.debtReport.total",
      "finance.payments.providers.MPESA",
      "finance.payments.providers.EMOLA",
      "finance.payments.providers.MKESH",
    ]);

    const untranslated = flatten(pt as Tree).filter((key) => {
      if (legitimatelyIdentical.has(key)) return false;
      return valueAt(pt as Tree, key) === valueAt(en as Tree, key);
    });

    expect(untranslated).toEqual([]);
  });
});

describe("ICU argument comparison", () => {
  it("ignores translated plural branches and follows nested arguments", () => {
    expect(placeholders("{count, plural, =0 {This role} one {One {name}} other {Many {name} {total, number}}}"))
      .toEqual(["count", "name", "total"]);
    expect(placeholders("{count, plural, one {Sim} other {Não}}")) .toEqual(["count"]);
  });
  it("handles nested selects, rich tags and quoted literal braces", () => {
    expect(placeholders("'{literal}' {kind, select, first {<strong>{name}</strong>} other {{date, date}}}"))
      .toEqual(["date", "kind", "name", "strong"]);
  });
  it("rejects malformed ICU instead of accepting an incomplete marker list", () => {
    expect(() => placeholders("{count, plural, one {One}}")) .toThrow();
  });
});
