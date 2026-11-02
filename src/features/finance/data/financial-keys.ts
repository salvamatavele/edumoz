import { createHash } from "node:crypto";
/** Length-prefixed UTF-8 fields are unambiguous and reproducible with SQL LENGTH. */
export function financialKey(fields: readonly (string | number)[]): string {
  return createHash("sha256").update(fields.map(value => { const text = String(value); return `${Buffer.byteLength(text, "utf8")}:${text}`; }).join("")).digest("hex");
}
export function invoiceGenerationKey(schoolId: string, scheduleId: string, enrollmentId: string, year: number, month: number | null): string {
  return financialKey([schoolId, scheduleId, enrollmentId, year, month ?? 0]);
}
export function paymentIntentKey(schoolId: string, kind: "manual" | "mobile", key: string): string {
  return financialKey([schoolId, kind, key]);
}
