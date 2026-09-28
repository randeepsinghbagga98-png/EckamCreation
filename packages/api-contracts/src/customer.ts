import { z } from "zod";
import { cursorQuerySchema, moneySchema } from "./common";
import { addressCreateSchema, consentCreateSchema } from "./auth";

export const profileDtoSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string().nullable(),
  defaultCurrencyCode: z.string().nullable(),
  defaultCountryId: z.string().nullable(),
  emailVerified: z.boolean(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional().nullable(),
  phone: z.string().min(3).max(32).optional().nullable(),
  locale: z.string().min(2).max(16).optional().nullable(),
  defaultCurrencyCode: z.string().length(3).optional().nullable(),
  defaultCountryId: z.string().min(1).optional().nullable(),
});

export const addressDtoSchema = z.object({
  id: z.string(),
  type: z.enum(["SHIPPING", "BILLING", "BOTH"]),
  fullName: z.string(),
  phone: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  postalCode: z.string(),
  countryId: z.string(),
  regionId: z.string().nullable(),
  isDefault: z.boolean(),
});

export const addressUpdateSchema = addressCreateSchema.partial();

export const notificationPreferencesDtoSchema = z.object({
  emailTransactional: z.boolean(),
  emailMarketing: z.boolean(),
  whatsappTransactional: z.boolean(),
  whatsappMarketing: z.boolean(),
  pushEnabled: z.boolean(),
});

export const notificationPreferencesUpdateSchema = notificationPreferencesDtoSchema.partial();

export const wishlistItemCreateSchema = z
  .object({
    variantId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.variantId || v.productId), {
    message: "variantId or productId is required",
  });

export const wishlistItemDtoSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  variantName: z.string().nullable(),
  sku: z.string(),
  available: z.boolean(),
  addedAt: z.string(),
});

export const customerOrderListQuerySchema = cursorQuerySchema;

export const customerOrderSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  total: moneySchema,
  placedAt: z.string(),
  itemCount: z.number().int(),
});

export const customerOrderDetailSchema = customerOrderSummarySchema.extend({
  subtotal: moneySchema,
  discount: moneySchema,
  tax: moneySchema,
  shipping: moneySchema,
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      productName: z.string(),
      variantName: z.string().nullable(),
      sku: z.string(),
      quantity: z.number().int(),
      unitPrice: moneySchema,
      total: moneySchema,
    }),
  ),
});

export { addressCreateSchema, consentCreateSchema };

export type ProfileDto = z.infer<typeof profileDtoSchema>;
export type AddressDto = z.infer<typeof addressDtoSchema>;
export type WishlistItemDto = z.infer<typeof wishlistItemDtoSchema>;
export type CustomerOrderSummaryDto = z.infer<typeof customerOrderSummarySchema>;
