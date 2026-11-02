/** Browser mutations must carry the exact configured public origin. */
export function isTrustedMutationOrigin(origin: string | null, publicUrl: string): boolean {
  if (!origin) return false;
  try {
    const expected = new URL(publicUrl);
    const actual = new URL(origin);
    return ["https:", "http:"].includes(expected.protocol)
      && ["https:", "http:"].includes(actual.protocol)
      && origin === actual.origin
      && actual.origin === expected.origin;
  } catch { return false; }
}
