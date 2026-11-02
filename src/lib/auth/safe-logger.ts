const knownErrors = new Set(["CredentialsSignin", "JWTSessionError", "CallbackRouteError", "AdapterError", "MissingSecret", "AccessDenied", "OAuthSignInError", "OAuthCallbackError"]);
const knownWarnings = new Set(["debug-enabled", "env-url-basepath-redundant", "env-url-basepath-mismatch"]);

/** Auth.js errors may carry provider/database payloads in cause; never serialize them. */
export const safeAuthLogger = {
  error(error: Error): void { console.error("[auth] operation failed", knownErrors.has(error.name) ? error.name : "AuthError"); },
  warn(code: string): void { console.warn("[auth] warning", knownWarnings.has(code) ? code : "AuthWarning"); },
  debug(): void {},
};
