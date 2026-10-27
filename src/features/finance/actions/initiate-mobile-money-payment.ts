"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import { SimulatedGateway } from "@/features/finance/data/gateways/simulated-gateway";
import { recalculateInvoiceBalance } from "@/features/finance/domain/invoice-balance";
import { MobileMoneyGatewayError } from "@/features/finance/domain/ports/mobile-money-gateway";
import {
  initiateMobileMoneyPaymentSchema,
  type InitiateMobileMoneyPaymentInput,
} from "@/features/finance/domain/payment-schema";
import { resolvePaymentTransition } from "@/features/finance/domain/payment-transition";
import {
  isSchoolAdministrator,
  type SessionContext,
} from "@/features/identity/domain/access";
import { toDecimal } from "@/features/shared/domain/numeric";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { getTenantDb } from "@/lib/db/tenant";

/**
 * Inicia um pagamento por dinheiro móvel pela dívida total da factura. Grava o `Payment`
 * em `INITIATED`, com uma `idempotencyKey` própria, ANTES de contactar o operador — se o
 * pedido falhar ou nunca voltar, o registo da tentativa já existe. Ver design.md.
 */
export async function initiateMobileMoneyPayment(
  values: InitiateMobileMoneyPaymentInput,
): Promise<FormActionResult<InitiateMobileMoneyPaymentInput>> {
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

  const parsed = initiateMobileMoneyPaymentSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof InitiateMobileMoneyPaymentInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof InitiateMobileMoneyPaymentInput;
      fieldErrors[field] = t(`finance.payments.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);
  const data = parsed.data;

  const invoice = await db.invoice.findUnique({
    where: { id: data.invoiceId },
    select: {
      id: true,
      reference: true,
      total: true,
      paidAmount: true,
      dueDate: true,
      cancelledAt: true,
      status: true,
    },
  });

  if (!invoice) {
    return { status: "error", message: t("finance.payments.errors.invoiceNotFound") };
  }

  if (invoice.status === "CANCELLED") {
    return { status: "error", message: t("finance.payments.errors.invoiceCancelled") };
  }

  const outstanding = toDecimal(invoice.total).minus(toDecimal(invoice.paidAmount));

  if (outstanding.lessThanOrEqualTo(0)) {
    return { status: "error", message: t("finance.payments.errors.nothingOwed") };
  }

  // Gravado ANTES de contactar o operador — se `gateway.initiate` falhar ou nunca
  // voltar, este registo já existe e a tentativa não fica em limbo.
  const payment = await db.payment.create({
    data: {
      schoolId,
      invoiceId: invoice.id,
      amount: outstanding.toFixed(2),
      method: "MOBILE_MONEY",
      provider: data.provider,
      payerPhone: data.payerPhone,
      status: "INITIATED",
      idempotencyKey: randomUUID(),
      initiatedById: session.user.id,
    },
  });

  const gateway = new SimulatedGateway(data.provider);

  let initiation;

  try {
    initiation = await gateway.initiate({
      idempotencyKey: payment.idempotencyKey,
      amount: outstanding,
      currency: "MZN",
      payerPhone: data.payerPhone,
      reference: invoice.reference,
      description: t("finance.payments.mobileMoneyDescription", { reference: invoice.reference }),
    });
  } catch (error) {
    if (error instanceof MobileMoneyGatewayError) {
      return { status: "error", message: t("finance.payments.errors.gatewayFailure") };
    }

    throw error;
  }

  const now = new Date();
  const transition = resolvePaymentTransition("INITIATED", initiation, now);

  if (transition) {
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { ...transition, rawPayload: JSON.parse(JSON.stringify(transition.rawPayload ?? null)) },
      });

      if (transition.status === "CONFIRMED") {
        const confirmedPayments = await tx.payment.findMany({
          where: { invoiceId: invoice.id, status: "CONFIRMED" },
          select: { amount: true },
        });

        const balance = recalculateInvoiceBalance(
          invoice.total,
          confirmedPayments.map((p) => p.amount),
          invoice.dueDate,
          now,
          invoice.cancelledAt,
        );

        await tx.invoice.update({ where: { id: invoice.id }, data: balance });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "payment.initiateMobileMoney",
          entity: "Payment",
          entityId: payment.id,
          after: JSON.parse(JSON.stringify({ ...payment, ...transition })),
        },
      });
    });
  }

  for (const locale of routing.locales) {
    revalidatePath(getPathname({ locale, href: "/finance" }));
  }

  return { status: "success" };
}
