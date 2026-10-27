"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { SimulatedGateway } from "@/features/finance/data/gateways/simulated-gateway";
import { recalculateInvoiceBalance } from "@/features/finance/domain/invoice-balance";
import {
  confirmPaymentSchema,
  type ConfirmPaymentInput,
} from "@/features/finance/domain/payment-schema";
import { resolvePaymentTransition } from "@/features/finance/domain/payment-transition";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";
import type { PaymentStatus } from "@/types";

export interface ConfirmPaymentResult {
  readonly status: "success" | "error";
  readonly message?: string;
  readonly paymentStatus?: PaymentStatus;
}

/**
 * Consulta o operador pelo estado actual de um pagamento de dinheiro móvel `INITIATED`
 * ou `PENDING`, e aplica a transição se houver uma nova. Chamar duas vezes seguidas com o
 * mesmo resultado do operador não faz nada da segunda vez — `resolvePaymentTransition`
 * devolve `null` para "permanecer no mesmo estado" (idempotente). Ver design.md.
 */
export async function confirmPayment(values: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = confirmPaymentSchema.safeParse(values);

  if (!parsed.success) {
    return { status: "error", message: t("finance.payments.errors.invalid") };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  const payment = await db.payment.findUnique({
    where: { id: parsed.data.paymentId },
    select: {
      id: true,
      status: true,
      provider: true,
      providerReference: true,
      invoice: { select: { id: true, total: true, dueDate: true, cancelledAt: true } },
    },
  });

  if (!payment) {
    return { status: "error", message: t("finance.payments.errors.paymentNotFound") };
  }

  if (payment.status === "CONFIRMED" || payment.status === "FAILED" || payment.status === "REVERSED") {
    return { status: "success", paymentStatus: payment.status };
  }

  if (!payment.provider || !payment.providerReference) {
    return { status: "error", message: t("finance.payments.errors.paymentNotFound") };
  }

  const gateway = new SimulatedGateway(payment.provider);
  const statusResult = await gateway.getStatus(payment.providerReference);

  const now = new Date();
  const transition = resolvePaymentTransition(payment.status, statusResult, now);

  if (!transition) {
    return { status: "success", paymentStatus: payment.status };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { ...transition, rawPayload: JSON.parse(JSON.stringify(transition.rawPayload ?? null)) },
    });

    if (transition.status === "CONFIRMED") {
      const confirmedPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoice.id, status: "CONFIRMED" },
        select: { amount: true },
      });

      const balance = recalculateInvoiceBalance(
        payment.invoice.total,
        confirmedPayments.map((p) => p.amount),
        payment.invoice.dueDate,
        now,
        payment.invoice.cancelledAt,
      );

      await tx.invoice.update({ where: { id: payment.invoice.id }, data: balance });
    }

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "payment.confirm",
        entity: "Payment",
        entityId: payment.id,
        after: JSON.parse(JSON.stringify(transition)),
      },
    });
  });

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success", paymentStatus: transition.status };
}
