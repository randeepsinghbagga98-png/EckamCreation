import { z } from "zod";
import { moneySchema } from "./common";

/** Header carrying the opaque guest cart token. */
export const CART_TOKEN_HEADER = "x-cart-token" as const;

/** Max line quantity (also enforced in Zod). */
export const CART_MAX_QUANTITY = 999 as const;

export const cartItemAvailabilitySchema = z.enum([
  "OK",
  "PRODUCT_UNAVAILABLE",
  "VARIANT_UNAVAILABLE",
  "PRICE_UNAVAILABLE",
]);

export const cartItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
});

export const cartItemPatchSchema = z.object({
  /** Quantity 0 removes the line. */
  quantity: z.number().int().min(0).max(CART_MAX_QUANTITY),
});

export const cartItemDtoSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  variantName: z.string().nullable(),
  sku: z.string(),
  quantity: z.number().int(),
  unitPrice: moneySchema.nullable(),
  lineTotal: moneySchema.nullable(),
  available: z.boolean(),
  availability: cartItemAvailabilitySchema,
});

export const cartDtoSchema = z.object({
  id: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  guestToken: z.string().nullable(),
  userId: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  itemCount: z.number().int(),
  /** Sum of available line totals in minor units; null if any priced line is missing a live price. */
  subtotal: moneySchema.nullable(),
  items: z.array(cartItemDtoSchema),
});

export const mergeCartBodySchema = z.object({
  guestToken: z.string().min(1),
});

export const cartContextQuerySchema = z.object({
  currency: z.string().length(3).optional(),
  country: z.string().min(2).max(3).optional(),
});

export type CartDto = z.infer<typeof cartDtoSchema>;
export type CartItemDto = z.infer<typeof cartItemDtoSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CartItemAvailability = z.infer<typeof cartItemAvailabilitySchema>;
