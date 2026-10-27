import { getTenantDb } from "@/lib/db/tenant";
import type { InvoiceStatus, PaymentMethod, PaymentProvider, PaymentStatus } from "@/types";

export interface PaymentRow {
  readonly id: string;
  readonly amount: string;
  readonly method: PaymentMethod;
  readonly provider: PaymentProvider | null;
  readonly status: PaymentStatus;
  readonly createdAt: Date;
  readonly confirmedAt: Date | null;
  readonly reversedAt: Date | null;
}

export interface InvoiceForPayment {
  readonly id: string;
  readonly reference: string;
  readonly total: string;
  readonly paidAmount: string;
  readonly status: InvoiceStatus;
  readonly studentName: string;
  readonly payments: readonly PaymentRow[];
}

function toPaymentRow(payment: {
  id: string;
  amount: { toString(): string };
  method: PaymentMethod;
  provider: PaymentProvider | null;
  status: PaymentStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  reversedAt: Date | null;
}): PaymentRow {
  return {
    id: payment.id,
    amount: payment.amount.toString(),
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    createdAt: payment.createdAt,
    confirmedAt: payment.confirmedAt,
    reversedAt: payment.reversedAt,
  };
}

/** Factura com os seus pagamentos, para a UI de registo/reversão em `/financas`. */
export async function getInvoiceForPayment(
  schoolId: string,
  invoiceId: string,
): Promise<InvoiceForPayment | null> {
  const db = getTenantDb(schoolId);

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      reference: true,
      total: true,
      paidAmount: true,
      status: true,
      enrollment: { select: { student: { select: { firstName: true, lastName: true } } } },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          provider: true,
          status: true,
          createdAt: true,
          confirmedAt: true,
          reversedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) return null;

  return {
    id: invoice.id,
    reference: invoice.reference,
    total: invoice.total.toString(),
    paidAmount: invoice.paidAmount.toString(),
    status: invoice.status,
    studentName: `${invoice.enrollment.student.firstName} ${invoice.enrollment.student.lastName}`,
    payments: invoice.payments.map(toPaymentRow),
  };
}

export interface Receipt {
  readonly paymentId: string;
  readonly amount: string;
  readonly method: PaymentMethod;
  readonly provider: PaymentProvider | null;
  readonly status: PaymentStatus;
  readonly confirmedAt: Date | null;
  readonly reversedAt: Date | null;
  readonly invoiceReference: string;
  readonly studentName: string;
  readonly schoolName: string;
  /** Código de verificação — os últimos 8 caracteres do próprio id, estável e sem novo campo no schema. */
  readonly verificationCode: string;
}

/** Recibo imprimível de um pagamento, `CONFIRMED` ou `REVERSED` (assinalado como tal). */
export async function getReceipt(schoolId: string, paymentId: string): Promise<Receipt | null> {
  const db = getTenantDb(schoolId);

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      method: true,
      provider: true,
      status: true,
      confirmedAt: true,
      reversedAt: true,
      school: { select: { name: true } },
      invoice: {
        select: {
          reference: true,
          enrollment: { select: { student: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  if (!payment || (payment.status !== "CONFIRMED" && payment.status !== "REVERSED")) return null;

  return {
    paymentId: payment.id,
    amount: payment.amount.toString(),
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    confirmedAt: payment.confirmedAt,
    reversedAt: payment.reversedAt,
    invoiceReference: payment.invoice.reference,
    studentName: `${payment.invoice.enrollment.student.firstName} ${payment.invoice.enrollment.student.lastName}`,
    schoolName: payment.school.name,
    verificationCode: payment.id.slice(-8).toUpperCase(),
  };
}
