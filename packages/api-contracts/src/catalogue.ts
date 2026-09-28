import { z } from "zod";
import { cursorQuerySchema, moneySchema } from "./common";

export const productSortSchema = z.enum(["created_at", "name"]).default("created_at");

export const productListQuerySchema = cursorQuerySchema.extend({
  category: z.string().optional(),
  collection: z.string().optional(),
  brand: z.string().optional(),
  country: z.string().min(2).max(3).optional(),
  currency: z.string().length(3).optional(),
  minPriceMinor: z.string().regex(/^\d+$/).optional(),
  maxPriceMinor: z.string().regex(/^\d+$/).optional(),
  inStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  q: z.string().max(120).optional(),
  sort: productSortSchema.optional(),
});

export const productSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  brandId: z.string().nullable(),
  brand: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
    })
    .nullable(),
  defaultVariantId: z.string().nullable(),
  price: moneySchema.nullable(),
  compareAtPrice: moneySchema.nullable().optional(),
  inStock: z.boolean(),
  primaryMediaUrl: z.string().nullable(),
});

export const mediaDtoSchema = z.object({
  id: z.string(),
  kind: z.string(),
  url: z.string(),
  altText: z.string().nullable(),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
  variantId: z.string().nullable(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

export const variantDtoSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  name: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  attributes: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      value: z.string(),
    }),
  ),
  price: moneySchema.nullable(),
  compareAtPrice: moneySchema.nullable().optional(),
  inStock: z.boolean(),
});

export const productDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  publishedAt: z.string().nullable(),
  brand: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
    })
    .nullable(),
  categories: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  collections: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
    }),
  ),
  tags: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
    }),
  ),
  variants: z.array(variantDtoSchema),
  media: z.array(mediaDtoSchema),
  defaultVariantId: z.string().nullable(),
  price: moneySchema.nullable(),
  compareAtPrice: moneySchema.nullable().optional(),
  inStock: z.boolean(),
});

export const categoryDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  path: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  childrenCount: z.number().int().optional(),
});

export const brandDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  isActive: z.boolean(),
});

export const collectionDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  productCount: z.number().int().optional(),
});

export const resolvePriceQuerySchema = z.object({
  currency: z.string().length(3),
  country: z.string().min(2).max(3).optional(),
});

export const slugOrIdParamSchema = z.object({
  idOrSlug: z.string().min(1),
});

export const adminProductCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(20000).optional(),
  brandId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  primaryCategoryId: z.string().optional(),
});

export const adminProductUpdateSchema = adminProductCreateSchema.partial().extend({
  publishedAt: z.string().datetime().nullable().optional(),
});

export const adminVariantCreateSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  barcode: z.string().max(64).optional().nullable(),
  weightGrams: z.number().int().nonnegative().optional().nullable(),
});

export const adminPriceUpsertSchema = z.object({
  currencyCode: z.string().length(3),
  amountMinor: z.string().regex(/^\d+$/),
  compareAtMinor: z.string().regex(/^\d+$/).optional().nullable(),
  countryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const adminCategoryCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial();

export const adminBrandCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const adminBrandUpdateSchema = adminBrandCreateSchema.partial();

export const adminCollectionCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  productIds: z.array(z.string()).optional(),
});

export const adminCollectionUpdateSchema = adminCollectionCreateSchema.partial();

export const adminCollectionProductsSchema = z.object({
  productIds: z.array(z.string()).min(1),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductSummaryDto = z.infer<typeof productSummarySchema>;
export type ProductDetailDto = z.infer<typeof productDetailSchema>;
export type VariantDto = z.infer<typeof variantDtoSchema>;
export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type BrandDto = z.infer<typeof brandDtoSchema>;
export type CollectionDto = z.infer<typeof collectionDtoSchema>;
