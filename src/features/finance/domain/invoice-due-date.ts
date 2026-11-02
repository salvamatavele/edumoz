/** A configured day beyond the month length means its final calendar day. */
export function invoiceDueDate(year: number, month: number | null, requestedDay: number): Date {
  const calendarMonth = month ?? 1;
  const finalDay = new Date(Date.UTC(year, calendarMonth, 0)).getUTCDate();
  return new Date(Date.UTC(year, calendarMonth - 1, Math.min(requestedDay, finalDay)));
}
