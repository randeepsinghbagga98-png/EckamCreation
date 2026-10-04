import { z } from "zod";
import { moneySchema } from "./common";

export const aiCreateConversationSchema = z.object({
  channel: z.string().default("web"),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(8000).optional(),
});

export const aiMessageCreateSchema = z.object({
  content: z.string().min(1).max(8000),
});

/** Public product refs from catalogue tools. Reuses catalogue money shape. */
export const aiConversationProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  price: moneySchema.nullable().optional(),
  inStock: z.boolean().optional(),
  primaryMediaUrl: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export const aiComparisonVariantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  inStock: z.boolean().optional(),
  price: moneySchema.nullable().optional(),
});

export const aiComparisonProductSchema = aiConversationProductSchema.extend({
  description: z.string().nullable().optional(),
  variants: z.array(aiComparisonVariantSchema).optional(),
});

export const aiCommerceActionSchema = z.object({
  kind: z.enum(["cart_add", "cart_remove", "cart_update", "wishlist_add", "wishlist_remove"]),
  success: z.boolean(),
  message: z.string().optional(),
  product: aiConversationProductSchema.optional(),
  quantity: z.number().int().positive().optional(),
  href: z.string().optional(),
});

export const aiComparisonSchema = z.object({
  products: z.array(aiComparisonProductSchema).min(2).max(4),
});

export const aiOrderItemSchema = z.object({
  productName: z.string(),
  quantity: z.number().int().positive(),
  variantName: z.string().nullable().optional(),
});

export const aiOrderSummarySchema = z.object({
  orderNumber: z.string(),
  status: z.string(),
  createdAt: z.string(),
  total: moneySchema.nullable().optional(),
  currency: z.string().optional(),
  itemCount: z.number().int().optional(),
  items: z.array(aiOrderItemSchema).optional(),
  paymentStatus: z.string().nullable().optional(),
  href: z.string().optional(),
});

export const aiOrderStatusSchema = z.object({
  success: z.boolean(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  message: z.string().optional(),
  href: z.string().optional(),
});

export const aiTrackingEventSchema = z.object({
  status: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  occurredAt: z.string().optional(),
});

export const aiTrackingResultSchema = z.object({
  success: z.boolean(),
  orderNumber: z.string().optional(),
  carrier: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  status: z.string().optional(),
  shippedAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
  events: z.array(aiTrackingEventSchema).optional(),
  message: z.string().optional(),
  href: z.string().optional(),
});

export const aiCancellationResultSchema = z.object({
  success: z.boolean(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  href: z.string().optional(),
});

export const aiMessageDtoSchema = z.object({
  id: z.string(),
  role: z.enum(["USER", "ASSISTANT", "SYSTEM", "TOOL"]),
  content: z.string(),
  createdAt: z.string().datetime(),
  products: z.array(aiConversationProductSchema).optional(),
  commerce: aiCommerceActionSchema.optional(),
  comparison: aiComparisonSchema.optional(),
  orders: z.array(aiOrderSummarySchema).optional(),
  orderStatus: aiOrderStatusSchema.optional(),
  tracking: aiTrackingResultSchema.optional(),
  cancellation: aiCancellationResultSchema.optional(),
});

export const aiToolCallDtoSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  success: z.boolean(),
});

export const aiConversationDtoSchema = z.object({
  id: z.string(),
  channel: z.string(),
  title: z.string().nullable(),
  messages: z.array(aiMessageDtoSchema).optional(),
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
});

export type AiConversationDto = z.infer<typeof aiConversationDtoSchema>;
export type AiMessageDto = z.infer<typeof aiMessageDtoSchema>;
export type AiToolCallDto = z.infer<typeof aiToolCallDtoSchema>;
export type AiConversationProductDto = z.infer<typeof aiConversationProductSchema>;
export type AiCommerceActionDto = z.infer<typeof aiCommerceActionSchema>;
export type AiComparisonDto = z.infer<typeof aiComparisonSchema>;
export type AiComparisonProductDto = z.infer<typeof aiComparisonProductSchema>;
export type AiOrderSummaryDto = z.infer<typeof aiOrderSummarySchema>;
export type AiOrderStatusDto = z.infer<typeof aiOrderStatusSchema>;
export type AiTrackingResultDto = z.infer<typeof aiTrackingResultSchema>;
export type AiCancellationResultDto = z.infer<typeof aiCancellationResultSchema>;
