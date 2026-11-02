import { prisma } from "./client";
import { withTransactionRetry } from "./transaction-retry";
import { suggestInvoiceReference } from "@/features/finance/domain/invoice-reference";
/** Narrow global boundary: allocate only this school's technical counter, never edit it. */
export async function allocateInvoiceReference(schoolId: string, year: number, month: number | null): Promise<string> {
  if (!schoolId) throw Error("Invoice reference allocation requires a school");
  return withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM School WHERE id = ${schoolId} AND isActive = TRUE FOR UPDATE`;
    if (locked.length !== 1) throw Error("Invoice reference allocation requires an active school");
    const school = await tx.school.update({ where: { id: schoolId }, data: { invoiceSequence: { increment: 1 } }, select: { invoiceSequence: true } });
    return suggestInvoiceReference(year, month, school.invoiceSequence - 1);
  }, { isolationLevel: "ReadCommitted" }));
}
