import { z } from "zod";
import { moneySchema, cursorQuerySchema } from "./common";

export const orderAddressSnapSchema = z.object({
  fullName: z.string(),
  phone: z.string().nullable().optional(),
  line1: z.string(),
  line2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string().nullable().optional(),
  postalCode: z.string(),
  countryId: z.string(),
  regionId: z.string().nullable().optional(),
});

export const orderItemDtoSchema = z.object({
  id: z.string(),
  variantId: z.string().nullable(),
  productId: z.string().nullable(),
  sku: z.string(),
  productName: z.string(),
  variantName: z.string().nullable(),
  quantity: z.number().int(),
  unitPrice: moneySchema,
  tax: moneySchema,
  discount: moneySchema,
  total: moneySchema,
});

export const orderDtoSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  subtotal: moneySchema,
  discount: moneySchema,
  tax: moneySchema,
  shipping: moneySchema,
  total: moneySchema,
  placedAt: z.string().datetime(),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  shippingAddress: orderAddressSnapSchema.nullable().optional(),
  billingAddress: orderAddressSnapSchema.nullable().optional(),
  items: z.array(orderItemDtoSchema),
  paymentIntentId: z.string().nullable().optional(),
  paymentStatus: z.string().nullable().optional(),
});

export const orderSummaryDtoSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  total: moneySchema,
  placedAt: z.string().datetime(),
  itemCount: z.number().int(),
});

export const orderListQuerySchema = cursorQuerySchema.extend({
  status: z
    .string()
    .max(40)
    .regex(/^[A-Z_]+$/)
    .optional(),
  q: z.string().max(64).optional(),
  userId: z.string().min(1).max(64).optional(),
});

export const orderStatusPatchSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PARTIALLY_SHIPPED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ]),
  note: z.string().max(500).optional(),
});

export const cancellationCreateSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const cancellationDtoSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
});

export const shipmentEventDtoSchema = z.object({
  id: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export const shipmentDtoSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.string(),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  shippedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  events: z.array(shipmentEventDtoSchema).optional(),
});

export const shipmentCreateSchema = z.object({
  carrier: z.string().min(1).max(120).optional(),
  trackingNumber: z.string().min(1).max(120).optional(),
  shippingMethodId: z.string().optional(),
});

export const shipmentStatusPatchSchema = z.object({
  status: z.enum([
    "PENDING",
    "LABEL_CREATED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED",
    "RETURNED",
    "CANCELLED",
  ]),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  trackingNumber: z.string().min(1).max(120).optional(),
  occurredAt: z.string().datetime().optional(),
});

export const returnCreateSchema = z.object({
  reason: z.string().max(500).optional(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      quantity: z.number().int().min(1),
      reason: z.string().optional(),
    }),
  ),
});

/** Internal service input — not a public HTTP body. */
export const createOrderFromPaidCheckoutInputSchema = z.object({
  paymentIntentId: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
});

export type OrderDto = z.infer<typeof orderDtoSchema>;
export type OrderSummaryDto = z.infer<typeof orderSummaryDtoSchema>;
export type ShipmentDto = z.infer<typeof shipmentDtoSchema>;
export type CancellationDto = z.infer<typeof cancellationDtoSchema>;
