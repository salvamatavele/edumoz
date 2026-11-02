const RETRYABLE_CODES = new Set(["P2034", "1020", "1205", "1213"]);
export function isRetryableTransactionError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) return false;
  const value = error as Record<string, unknown>;
  if (RETRYABLE_CODES.has(String(value.code)) || RETRYABLE_CODES.has(String(value.originalCode)) || value.kind === "TransactionWriteConflict") return true;
  return ["meta", "cause", "driverAdapterError"].some(field => isRetryableTransactionError(value[field], depth + 1));
}
/** Retry only a fully rolled-back database transaction, never an external side effect. */
export async function withTransactionRetry<T>(transaction: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await transaction(); }
    catch (error) { if (attempt >= attempts || !isRetryableTransactionError(error)) throw error; }
  }
}
