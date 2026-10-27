/**
 * Sugestão de referência de factura: `{ano}{mês}-{sequência}` (mensal) ou
 * `{ano}-{sequência}` (anual/único), mesma convenção de `suggestEnrollmentNumber`
 * (`academic/domain/enrollment-number.ts`). É só uma sugestão — a unicidade real fica com
 * `@@unique([schoolId, reference])`, não aqui. Pura de propósito: formatar uma string não
 * precisa de base de dados.
 */
export function suggestInvoiceReference(
  periodYear: number,
  periodMonth: number | null,
  sequence: number,
): string {
  const period = periodMonth ? `${periodYear}${String(periodMonth).padStart(2, "0")}` : `${periodYear}`;
  return `${period}-${String(sequence + 1).padStart(4, "0")}`;
}
