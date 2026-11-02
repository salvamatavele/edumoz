import type { TenantDb } from "@/lib/db/tenant";

export class TermMutationError extends Error {
  constructor(readonly code: "not-found" | "closed" | "already-open" | "forbidden" | "invalid-score" | "invalid") {
    super(code);
    this.name = "TermMutationError";
  }
}
/** The atomic revision increment obtains the term row lock until transaction commit. */
export async function requireTermState(db: Pick<TenantDb, "term">, termId: string, status: "OPEN" | "CLOSED"): Promise<void> {
  const claimed = await db.term.updateMany({ where: { id: termId, status }, data: { revision: { increment: 1 } } });
  if (claimed.count === 1) return;
  const term = await db.term.findUnique({ where: { id: termId }, select: { id: true } });
  throw new TermMutationError(!term ? "not-found" : status === "OPEN" ? "closed" : "already-open");
}
