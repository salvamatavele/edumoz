import { describe, expect, it } from "vitest";

import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("produz um hash argon2id, nunca a palavra-passe em claro", async () => {
    const result = await hashPassword("propina2026!");

    expect(result).toMatch(/^\$argon2id\$/);
    expect(result).not.toContain("propina2026!");
  });

  it("produz hashes diferentes para a mesma palavra-passe (sal aleatório)", async () => {
    const [a, b] = await Promise.all([
      hashPassword("propina2026!"),
      hashPassword("propina2026!"),
    ]);

    expect(a).not.toBe(b);
  });

  it("rejeita palavras-passe abaixo do comprimento mínimo", async () => {
    await expect(hashPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow();
  });
});

describe("verifyPassword", () => {
  it("aceita a palavra-passe correcta", async () => {
    const stored = await hashPassword("propina2026!");

    await expect(verifyPassword("propina2026!", stored)).resolves.toBe(true);
  });

  it("recusa a palavra-passe errada", async () => {
    const stored = await hashPassword("propina2026!");

    await expect(verifyPassword("propina2025!", stored)).resolves.toBe(false);
  });

  // Um utilizador que só entra por Google não tem passwordHash. Lançar aqui, em vez de
  // devolver false, revelaria quais as contas sem palavra-passe.
  it.each([null, undefined, "", "não-é-um-hash"])(
    "devolve false sem lançar quando o hash é %p",
    async (stored) => {
      await expect(verifyPassword("propina2026!", stored)).resolves.toBe(false);
    },
  );
});
