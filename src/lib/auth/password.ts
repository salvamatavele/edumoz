import { hash, verify } from "@node-rs/argon2";

/**
 * Parâmetros Argon2id.
 *
 * Seguem a recomendação da OWASP Password Storage Cheat Sheet para Argon2id:
 * 19 MiB de memória, 2 iterações, paralelismo 1. O custo dominante é a memória —
 * é isso que torna o ataque por GPU caro, e não o número de iterações.
 */
const ARGON2_OPTIONS = {
  /// Argon2id
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Comprimento mínimo aceite. A validação de política completa vive no schema Zod. */
export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `A palavra-passe deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Devolve `false` — nunca lança — quando o hash é inválido ou está corrompido.
 * Um erro aqui distinguiria "utilizador sem palavra-passe" de "palavra-passe errada",
 * e essa diferença é enumeração de contas.
 */
export async function verifyPassword(
  plain: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) return false;

  try {
    return await verify(passwordHash, plain, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
