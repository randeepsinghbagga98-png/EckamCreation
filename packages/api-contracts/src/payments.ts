import { z } from "zod";
import { moneySchema } from "./common";

export const paymentIntentCreateSchema = z.object({
  checkoutSessionId: z.string().min(1),
  /** Optional preferred provider id; ignored amount/currency from client. */
  provider: z.string().min(1).max(64).optional(),
  /** Ignored if present — amount always comes from CheckoutSession. */
  amount: moneySchema.optional(),
});

export const paymentIntentDtoSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  checkoutSessionId: z.string().nullable().optional(),
  provider: z.string(),
  status: z.string(),
  amount: moneySchema,
  providerIntentId: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export const paymentInitiateDtoSchema = z.object({
  paymentIntentId: z.string(),
  status: z.string(),
  provider: z.string(),
  /** Safe client instructions only — never secrets. Null when provider not configured. */
  clientAction: z
    .object({
      type: z.enum(["redirect", "none", "pending"]),
      redirectUrl: z.string().url().optional(),
    })
    .nullable()
    .optional(),
});

export const refundCreateSchema = z.object({
  paymentIntentId: z.string().min(1),
  amountMinor: z.string().regex(/^\d+$/).optional(),
  reason: z.string().max(500).optional(),
});

export const refundDtoSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  paymentIntentId: z.string().nullable(),
  status: z.string(),
  amount: moneySchema,
  reason: z.string().nullable(),
});

export const shippingQuoteBodySchema = z.object({
  countryId: z.string().min(1),
  currencyCode: z.string().length(3),
  cartId: z.string().optional(),
  checkoutSessionId: z.string().optional(),
  subtotalMinor: z.string().regex(/^\d+$/).optional(),
});

export const shippingQuoteOptionSchema = z.object({
  methodId: z.string(),
  code: z.string(),
  name: z.string(),
  amount: moneySchema,
  estimatedDaysMin: z.number().int().nullable(),
  estimatedDaysMax: z.number().int().nullable(),
});

export const webhookAckSchema = z.object({
  received: z.literal(true),
  duplicate: z.boolean().optional(),
  eventId: z.string().optional(),
  processed: z.boolean().optional(),
});

export type PaymentIntentDto = z.infer<typeof paymentIntentDtoSchema>;
export type PaymentInitiateDto = z.infer<typeof paymentInitiateDtoSchema>;
export type RefundDto = z.infer<typeof refundDtoSchema>;
export type ShippingQuoteBody = z.infer<typeof shippingQuoteBodySchema>;
export type ShippingQuoteOption = z.infer<typeof shippingQuoteOptionSchema>;
