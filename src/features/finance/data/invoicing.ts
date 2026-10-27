import { sum, toDecimal } from "@/features/shared/domain/numeric";
import { getTenantDb } from "@/lib/db/tenant";
import type { InvoiceStatus, PaymentStatus } from "@/types";

export interface InvoiceLineRow {
  readonly id: string;
  readonly description: string;
  readonly amount: string;
}

export interface PaymentSummaryRow {
  readonly id: string;
  readonly amount: string;
  readonly method: string;
  readonly status: PaymentStatus;
  readonly createdAt: Date;
}

export interface InvoiceRow {
  readonly id: string;
  readonly reference: string;
  readonly periodYear: number | null;
  readonly periodMonth: number | null;
  readonly dueDate: Date;
  readonly total: string;
  readonly paidAmount: string;
  readonly status: InvoiceStatus;
  readonly lines: readonly InvoiceLineRow[];
  readonly payments: readonly PaymentSummaryRow[];
}

export interface StudentAccount {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly invoices: readonly InvoiceRow[];
  /** Soma de `Invoice.total` menos `Invoice.paidAmount`, de todas as facturas não canceladas. */
  readonly balance: string;
}

function toInvoiceRow(invoice: {
  id: string;
  reference: string;
  periodYear: number | null;
  periodMonth: number | null;
  dueDate: Date;
  total: { toString(): string };
  paidAmount: { toString(): string };
  status: InvoiceStatus;
  lines: Array<{ id: string; description: string; amount: { toString(): string } }>;
  payments: Array<{ id: string; amount: { toString(): string }; method: string; status: PaymentStatus; createdAt: Date }>;
}): InvoiceRow {
  return {
    id: invoice.id,
    reference: invoice.reference,
    periodYear: invoice.periodYear,
    periodMonth: invoice.periodMonth,
    dueDate: invoice.dueDate,
    total: invoice.total.toString(),
    paidAmount: invoice.paidAmount.toString(),
    status: invoice.status,
    lines: invoice.lines.map((line) => ({ id: line.id, description: line.description, amount: line.amount.toString() })),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
    })),
  };
}

/** Conta-corrente de uma matrícula: todas as facturas, com os seus pagamentos, e o saldo. */
export async function getStudentAccount(
  schoolId: string,
  enrollmentId: string,
): Promise<StudentAccount | null> {
  const db = getTenantDb(schoolId);

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { student: { select: { firstName: true, lastName: true } } },
  });

  if (!enrollment) return null;

  const invoices = await db.invoice.findMany({
    where: { enrollmentId },
    select: {
      id: true,
      reference: true,
      periodYear: true,
      periodMonth: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      status: true,
      lines: { select: { id: true, description: true, amount: true } },
      payments: { select: { id: true, amount: true, method: true, status: true, createdAt: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  const outstanding = invoices
    .filter((invoice) => invoice.status !== "CANCELLED")
    .map((invoice) => toDecimal(invoice.total).minus(toDecimal(invoice.paidAmount)));

  return {
    enrollmentId,
    studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    invoices: invoices.map(toInvoiceRow),
    balance: sum(outstanding).toFixed(2),
  };
}

export interface DebtReportRow {
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly invoiceId: string;
  readonly reference: string;
  readonly total: string;
  readonly paidAmount: string;
  readonly status: InvoiceStatus;
  readonly dueDate: Date;
}

/** Mapa de propinas em dívida, por turma e por período. */
export async function getDebtReport(
  schoolId: string,
  classGroupId: string,
  periodYear: number,
  periodMonth: number | null,
): Promise<DebtReportRow[]> {
  const db = getTenantDb(schoolId);

  const invoices = await db.invoice.findMany({
    where: {
      periodYear,
      periodMonth,
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      enrollment: { classGroupId },
    },
    select: {
      id: true,
      reference: true,
      total: true,
      paidAmount: true,
      status: true,
      dueDate: true,
      enrollmentId: true,
      enrollment: { select: { student: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { enrollment: { student: { firstName: "asc" } } },
  });

  return invoices.map((invoice) => ({
    enrollmentId: invoice.enrollmentId,
    studentName: `${invoice.enrollment.student.firstName} ${invoice.enrollment.student.lastName}`,
    invoiceId: invoice.id,
    reference: invoice.reference,
    total: invoice.total.toString(),
    paidAmount: invoice.paidAmount.toString(),
    status: invoice.status,
    dueDate: invoice.dueDate,
  }));
}

export interface DebtReportFilters {
  readonly classGroups: ReadonlyArray<{ readonly id: string; readonly name: string }>;
}

/** Turmas do ano lectivo activo, para o filtro do mapa de dívida. */
export async function listDebtReportFilters(schoolId: string): Promise<DebtReportFilters> {
  const db = getTenantDb(schoolId);

  const academicYear = await db.academicYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (!academicYear) return { classGroups: [] };

  const classGroups = await db.classGroup.findMany({
    where: { academicYearId: academicYear.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { classGroups };
}
