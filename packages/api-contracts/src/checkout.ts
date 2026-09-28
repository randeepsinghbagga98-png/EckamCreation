import { z } from "zod";
import { moneySchema } from "./common";
import { addressCreateSchema } from "./auth";
import { shippingQuoteOptionSchema } from "./payments";

export const CHECKOUT_TTL_MS = 60 * 60 * 1000; // 1 hour

export const checkoutCreateSchema = z.object({
  cartId: z.string().optional(),
  currency: z.string().length(3).optional(),
  country: z.string().min(2).max(3).optional(),
});

export const checkoutGuestAddressSchema = addressCreateSchema;

export const checkoutPatchSchema = z.object({
  shippingAddressId: z.string().min(1).optional(),
  billingAddressId: z.string().min(1).optional().nullable(),
  /** Guest-only: create an address with no user ownership. */
  shippingAddress: checkoutGuestAddressSchema.optional(),
  billingAddress: checkoutGuestAddressSchema.optional().nullable(),
  shippingMethodId: z.string().min(1).optional().nullable(),
  couponCode: z.string().min(1).max(64).optional().nullable(),
});

export const checkoutItemDtoSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productName: z.string(),
  variantName: z.string().nullable(),
  sku: z.string(),
  quantity: z.number().int(),
  unitPrice: moneySchema,
  lineTotal: moneySchema,
});

export const checkoutSessionDtoSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  shippingAddressId: z.string().nullable(),
  billingAddressId: z.string().nullable(),
  shippingMethodId: z.string().nullable(),
  couponCode: z.string().nullable(),
  subtotal: moneySchema,
  discount: moneySchema,
  tax: moneySchema,
  shipping: moneySchema,
  total: moneySchema,
  taxConfigured: z.boolean(),
  paymentReady: z.boolean(),
  paymentStatus: z.string().nullable(),
  expiresAt: z.string().datetime(),
  convertedOrderId: z.string().nullable(),
  items: z.array(checkoutItemDtoSchema),
  shippingOptions: z.array(shippingQuoteOptionSchema).optional(),
  warnings: z.array(z.string()).optional(),
});

export type CheckoutSessionDto = z.infer<typeof checkoutSessionDtoSchema>;
export type CheckoutItemDto = z.infer<typeof checkoutItemDtoSchema>;
export type CheckoutCreateInput = z.infer<typeof checkoutCreateSchema>;
export type CheckoutPatchInput = z.infer<typeof checkoutPatchSchema>;
