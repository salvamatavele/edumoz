"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { SimulatedGateway } from "@/features/finance/data/gateways/simulated-gateway";
import { applyGatewayResult, FinancialMutationError } from "@/features/finance/data/payment-transactions";
import { MobileMoneyGatewayError } from "@/features/finance/domain/ports/mobile-money-gateway";
import {
  confirmPaymentSchema,
  type ConfirmPaymentInput,
} from "@/features/finance/domain/payment-schema";
import {
  hasPermission,
  toSessionContext,
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

  const context = toSessionContext(session);

  if (!hasPermission(context, "finance", "edit")) {
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
  let paymentStatus: PaymentStatus;
  try {
    const statusResult = await gateway.getStatus(payment.providerReference);
    paymentStatus = await applyGatewayResult(schoolId, payment.invoice.id, payment.id, statusResult, session.user.id, "payment.confirm");
  } catch (error) {
    if (error instanceof MobileMoneyGatewayError) return { status: "error", message: t("finance.payments.errors.gatewayFailure") };
    if (error instanceof FinancialMutationError) return { status: "error", message: t(`finance.payments.errors.${error.code}`) };
    throw error;
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success", paymentStatus };
}
