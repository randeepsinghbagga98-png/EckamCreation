import {
  AiToolInvalidArgumentsError,
  type AiTool,
  type AiToolResult,
} from "@eckamcreation/ai";
import type {
  ProductDetailDto,
  ProductListQuery,
  ProductSummaryDto,
} from "@eckamcreation/api-contracts";
import { z } from "zod";
import type { CategoryService } from "../catalogue/category-service";
import type { ProductService } from "../catalogue/product-service";

export const CATALOGUE_SEARCH_PRODUCTS = "catalogue.search_products";
export const CATALOGUE_GET_PRODUCT = "catalogue.get_product";
export const CATALOGUE_GET_CATEGORIES = "catalogue.get_categories";
export const CATALOGUE_GET_PRODUCTS_BY_CATEGORY = "catalogue.get_products_by_category";
export const CATALOGUE_COMPARE_PRODUCTS = "catalogue.compare_products";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

const searchSchema = z
  .object({
    query: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
  })
  .strict();

const getProductSchema = z
  .object({
    slug: z.string().trim().min(1).max(160),
  })
  .strict();

const categoriesSchema = z.object({}).strict();

const byCategorySchema = z
  .object({
    category: z.string().trim().min(1).max(160),
    limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
  })
  .strict();

const compareSchema = z
  .object({
    productIds: z.array(z.string().trim().min(1).max(160)).min(2).max(4),
  })
  .strict();

export type CatalogueToolDeps = {
  products: ProductService;
  categories: CategoryService;
};

export function createCatalogueAiTools(deps: CatalogueToolDeps): AiTool[] {
  return [
    createSearchProductsTool(deps),
    createGetProductTool(deps),
    createGetCategoriesTool(deps),
    createGetProductsByCategoryTool(deps),
    createCompareProductsTool(deps),
  ];
}

function createSearchProductsTool(deps: CatalogueToolDeps): AiTool {
  return {
    name: CATALOGUE_SEARCH_PRODUCTS,
    description: "Search published Eckam catalogue products by name or slug.",
    async execute(args: Record<string, unknown>): Promise<AiToolResult> {
      const input = parseArgs(searchSchema, args);
      try {
        const result = await deps.products.listPublic({
          q: input.query,
          limit: input.limit ?? DEFAULT_LIMIT,
        } as ProductListQuery);
        return {
          ok: true,
          data: {
            products: result.items.map((item) => toSafeSearchProduct(item)),
          },
        };
      } catch {
        return failed();
      }
    },
  };
}

function createGetProductTool(deps: CatalogueToolDeps): AiTool {
  return {
    name: CATALOGUE_GET_PRODUCT,
    description: "Get one published Eckam catalogue product by slug.",
    async execute(args: Record<string, unknown>): Promise<AiToolResult> {
      const input = parseArgs(getProductSchema, args);
      try {
        const product = await deps.products.getPublicBySlugOrId(input.slug);
        return { ok: true, data: { product: toSafeProductDetail(product) } };
      } catch {
        return {
          ok: false,
          error: {
            code: "AI_TOOL_EXECUTION_FAILED",
            message: "Product not found",
          },
        };
      }
    },
  };
}

function createGetCategoriesTool(deps: CatalogueToolDeps): AiTool {
  return {
    name: CATALOGUE_GET_CATEGORIES,
    description: "List published Eckam catalogue categories.",
    async execute(args: Record<string, unknown>): Promise<AiToolResult> {
      parseArgs(categoriesSchema, args);
      try {
        const categories = await deps.categories.listPublic();
        return {
          ok: true,
          data: {
            categories: categories.map((category) => ({
              id: category.id,
              slug: category.slug,
              name: category.name,
            })),
          },
        };
      } catch {
        return failed();
      }
    },
  };
}

function createGetProductsByCategoryTool(deps: CatalogueToolDeps): AiTool {
  return {
    name: CATALOGUE_GET_PRODUCTS_BY_CATEGORY,
    description: "List published Eckam catalogue products in a category.",
    async execute(args: Record<string, unknown>): Promise<AiToolResult> {
      const input = parseArgs(byCategorySchema, args);
      try {
        const category = await resolvePublishedCategory(deps, input.category);
        if (!category) {
          return {
            ok: false,
            error: {
              code: "AI_TOOL_EXECUTION_FAILED",
              message: "Category not found",
            },
          };
        }
        const result = await deps.products.listPublic({
          category: category.slug,
          limit: input.limit ?? DEFAULT_LIMIT,
        } as ProductListQuery);
        return {
          ok: true,
          data: {
            category: { id: category.id, slug: category.slug, name: category.name },
            products: result.items.map((item) =>
              toSafeSearchProduct(item, category.name),
            ),
          },
        };
      } catch {
        return failed();
      }
    },
  };
}

function createCompareProductsTool(deps: CatalogueToolDeps): AiTool {
  return {
    name: CATALOGUE_COMPARE_PRODUCTS,
    description: "Compare 2 to 4 published Eckam catalogue products using factual catalogue fields only.",
    async execute(args: Record<string, unknown>): Promise<AiToolResult> {
      const input = parseArgs(compareSchema, args);
      const seen = new Set<string>();
      const products = [];

      for (const idOrSlug of input.productIds) {
        try {
          const product = await deps.products.getPublicBySlugOrId(idOrSlug);
          const safe = toSafeProductDetail(product);
          if (seen.has(safe.slug)) {
            continue;
          }
          seen.add(safe.slug);
          products.push(safe);
        } catch {
          return {
            ok: false,
            error: {
              code: "AI_TOOL_EXECUTION_FAILED",
              message: "One or more products could not be compared.",
            },
          };
        }
      }

      if (products.length < 2) {
        return {
          ok: false,
          error: {
            code: "AI_TOOL_EXECUTION_FAILED",
            message: "Comparison requires at least two different published products.",
          },
        };
      }

      return { ok: true, data: { comparison: true, products } };
    },
  };
}

async function resolvePublishedCategory(deps: CatalogueToolDeps, value: string) {
  const needle = value.trim().toLowerCase();
  const categories = await deps.categories.listPublic();
  return (
    categories.find((category) => category.slug.toLowerCase() === needle) ??
    categories.find((category) => category.name.toLowerCase() === needle) ??
    categories.find(
      (category) =>
        category.slug.toLowerCase().includes(needle) ||
        category.name.toLowerCase().includes(needle),
    ) ??
    null
  );
}

function parseArgs<T>(schema: z.ZodType<T>, args: Record<string, unknown>): T {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new AiToolInvalidArgumentsError();
  }
  return parsed.data;
}

function failed(): AiToolResult {
  return {
    ok: false,
    error: {
      code: "AI_TOOL_EXECUTION_FAILED",
      message: "The catalogue tool failed to complete this request",
    },
  };
}

function toSafeSearchProduct(item: ProductSummaryDto, category?: string) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: null,
    category: category ?? null,
    price: item.price?.amountMinor ?? null,
    currency: item.price?.currencyCode ?? null,
    primaryMediaUrl: item.primaryMediaUrl ?? null,
    defaultVariantId: item.defaultVariantId,
    inStock: item.inStock,
  };
}

function toSafeProductDetail(product: ProductDetailDto) {
  const primary =
    product.categories.find((category) => category.isPrimary) ?? product.categories[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: primary?.name ?? null,
    price: product.price?.amountMinor ?? null,
    currency: product.price?.currencyCode ?? null,
    primaryMediaUrl: product.media.find((item) => item.isPrimary)?.url ?? product.media[0]?.url ?? null,
    defaultVariantId: product.defaultVariantId,
    inStock: product.inStock,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      isDefault: variant.isDefault,
      inStock: variant.inStock,
      price: variant.price?.amountMinor ?? null,
      currency: variant.price?.currencyCode ?? null,
    })),
  };
}
