import { z } from "zod";
import { cursorQuerySchema, moneySchema } from "./common";

export const adminDashboardDtoSchema = z.object({
  products: z.object({
    total: z.number().int(),
    active: z.number().int(),
    draft: z.number().int(),
  }),
  customers: z.object({
    total: z.number().int(),
  }),
  orders: z.object({
    total: z.number().int(),
    pending: z.number().int(),
    completed: z.number().int(),
    cancelled: z.number().int(),
  }),
  sales: z.array(
    z.object({
      currencyCode: z.string(),
      totalMinor: z.string(),
      orderCount: z.number().int(),
    }),
  ),
  shipmentsByStatus: z.array(
    z.object({
      status: z.string(),
      count: z.number().int(),
    }),
  ),
  paymentsByStatus: z.array(
    z.object({
      status: z.string(),
      count: z.number().int(),
    }),
  ),
});

export const adminCustomerListQuerySchema = cursorQuerySchema.extend({
  q: z.string().max(120).optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const adminCustomerUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  locale: z.string().max(16).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  deleted: z.boolean().optional(),
});

export const adminCustomerSummarySchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  locale: z.string().nullable(),
  emailVerified: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  orderCount: z.number().int(),
});

export const adminCustomerDetailSchema = adminCustomerSummarySchema.extend({
  notes: z.string().nullable(),
  defaultCurrencyCode: z.string().nullable(),
  defaultCountryId: z.string().nullable(),
  addresses: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      fullName: z.string(),
      city: z.string(),
      countryId: z.string(),
      isDefault: z.boolean(),
    }),
  ),
  orderSummary: z.object({
    total: z.number().int(),
    lastOrderAt: z.string().nullable(),
  }),
});

export const adminInventoryListQuerySchema = cursorQuerySchema.extend({
  locationId: z.string().optional(),
  variantId: z.string().optional(),
  sku: z.string().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const adminInventoryAdjustSchema = z.object({
  variantId: z.string().min(1),
  locationId: z.string().min(1),
  quantityDelta: z.number().int(),
  reason: z.string().min(1).max(500),
  allowNegative: z.boolean().optional().default(false),
});

export const adminInventoryItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  sku: z.string(),
  productId: z.string(),
  productName: z.string(),
  locationId: z.string(),
  locationCode: z.string(),
  locationName: z.string(),
  onHand: z.number().int(),
  reserved: z.number().int(),
  available: z.number().int(),
  updatedAt: z.string(),
});

export const adminInventoryMovementSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string(),
  type: z.string(),
  quantityDelta: z.number().int(),
  reason: z.string().nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  staffUserId: z.string().nullable(),
  createdAt: z.string(),
});

export const adminAuditLogQuerySchema = cursorQuerySchema.extend({
  actorStaffUserId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const adminAuditLogDtoSchema = z.object({
  id: z.string(),
  staffUserId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const adminPaymentListQuerySchema = cursorQuerySchema.extend({
  status: z.string().optional(),
  orderId: z.string().optional(),
  provider: z.string().optional(),
});

export const adminPaymentIntentDtoSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  checkoutSessionId: z.string().nullable().optional(),
  provider: z.string(),
  status: z.string(),
  amount: moneySchema,
  providerIntentId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const adminVariantUpdateSchema = z.object({
  sku: z.string().min(1).max(64).optional(),
  name: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  barcode: z.string().max(64).optional().nullable(),
  weightGrams: z.number().int().nonnegative().optional().nullable(),
});

export type AdminDashboardDto = z.infer<typeof adminDashboardDtoSchema>;
export type AdminCustomerSummaryDto = z.infer<typeof adminCustomerSummarySchema>;
export type AdminCustomerDetailDto = z.infer<typeof adminCustomerDetailSchema>;
export type AdminInventoryItemDto = z.infer<typeof adminInventoryItemSchema>;
export type AdminAuditLogDto = z.infer<typeof adminAuditLogDtoSchema>;
