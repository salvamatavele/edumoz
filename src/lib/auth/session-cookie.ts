/** Optimistic presence check only; Auth.js validates and reassembles the actual token. */
export function hasSessionTokenCookie(cookieNames: readonly string[]): boolean {
  const names = new Set(cookieNames);
  return ["authjs.session-token", "__Secure-authjs.session-token"].some(
    (name) => names.has(name) || names.has(`${name}.0`),
  );
}
