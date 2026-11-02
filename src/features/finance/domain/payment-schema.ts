import { z } from "zod";

import { PaymentProvider } from "@/types";

/**
 * Regras de registo, início e reversão de pagamentos. Ver
 * openspec/changes/finance/design.md.
 */
export const recordManualPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1),
  idempotencyKey: z.uuid(),
  amount: z.coerce.number().positive().max(9999999999.99).multipleOf(0.01),
  // Nunca MOBILE_MONEY aqui — esse caminho passa sempre por
  // `initiateMobileMoneyPaymentSchema`, que grava INITIATED antes de contactar o operador.
  method: z.enum(["CASH", "BANK_DEPOSIT", "BANK_TRANSFER"]),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

export const initiateMobileMoneyPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1),
  idempotencyKey: z.uuid(),
  provider: z.enum(PaymentProvider),
  payerPhone: z.string().trim().min(9),
});

export type InitiateMobileMoneyPaymentInput = z.infer<typeof initiateMobileMoneyPaymentSchema>;

export const reversePaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export const confirmPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
