import type {
  ProductDetailDto,
  ProductListQuery,
  ProductSummaryDto,
  VariantDto,
} from "@eckamcreation/api-contracts";
import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import { writeAuditLog } from "@eckamcreation/auth";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import { ApiError, conflict, notFound, validationError } from "../errors";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  publicProductWhere,
} from "./helpers";
import {
  availableUnits,
  moneyFromMinor,
  resolveCountryId,
  resolvePrice,
  type PriceRow,
} from "./pricing";

const productListInclude = {
  brand: { select: { id: true, slug: true, name: true, isActive: true, deletedAt: true } },
  variants: {
    where: { deletedAt: null },
    orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }],
    include: {
      prices: true,
      inventoryItems: { select: { onHand: true, reserved: true } },
      media: {
        orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
        take: 1,
      },
    },
  },
  media: {
    where: { variantId: null },
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  categories: {
    include: { category: { select: { id: true, slug: true, name: true, deletedAt: true, isActive: true } } },
  },
  collections: {
    include: { collection: { select: { id: true, slug: true, name: true, deletedAt: true, isActive: true } } },
  },
} satisfies Prisma.ProductInclude;

const productDetailInclude = {
  brand: true,
  categories: { include: { category: true } },
  collections: { include: { collection: true } },
  tags: { include: { tag: true } },
  media: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }] },
  variants: {
    where: { deletedAt: null },
    orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }],
    include: {
      prices: true,
      inventoryItems: { select: { onHand: true, reserved: true } },
      attributeValues: {
        include: {
          attributeValue: {
            include: { attribute: true },
          },
        },
      },
      media: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }] },
    },
  },
} satisfies Prisma.ProductInclude;

type ListedProduct = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;
type DetailedProduct = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

function variantInStock(variant: {
  isActive: boolean;
  inventoryItems: Array<{ onHand: number; reserved: number }>;
}): boolean {
  if (!variant.isActive) return false;
  return variant.inventoryItems.some((i) => availableUnits(i.onHand, i.reserved) > 0);
}

function mapVariant(
  variant: DetailedProduct["variants"][number] | ListedProduct["variants"][number],
  priceCtx: { currencyCode: string; countryId: string | null },
): VariantDto {
  const prices = variant.prices as PriceRow[];
  const resolved = resolvePrice(prices, priceCtx);
  const attrs =
    "attributeValues" in variant
      ? variant.attributeValues.map((row) => ({
          code: row.attributeValue.attribute.code,
          name: row.attributeValue.attribute.name,
          value: row.attributeValue.value,
        }))
      : [];

  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    isDefault: variant.isDefault,
    isActive: variant.isActive,
    attributes: attrs,
    price: resolved ? moneyFromMinor(resolved.amountMinor, resolved.currencyCode) : null,
    compareAtPrice: resolved?.compareAtMinor
      ? moneyFromMinor(resolved.compareAtMinor, resolved.currencyCode)
      : null,
    inStock: variantInStock(variant),
  };
}

export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async listAdmin(query: ProductListQuery): Promise<{
    items: ProductSummaryDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const limit = clampLimit(query.limit);
    const currency = (query.currency ?? "INR").toUpperCase();
    const countryId = await resolveCountryId(this.prisma, query.country);
    const cursor = decodeCursor(query.cursor);

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.brand ? { brand: { slug: query.brand, deletedAt: null } } : {}),
      ...(query.category
        ? { categories: { some: { category: { slug: query.category, deletedAt: null } } } }
        : {}),
      ...(query.collection
        ? { collections: { some: { collection: { slug: query.collection, deletedAt: null } } } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.product.findMany({
      where,
      include: productListInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const priceCtx = { currencyCode: currency, countryId };
    const mapped = rows.slice(0, limit).map((p) => this.toSummary(p, priceCtx));
    const last = rows[limit - 1];
    const hasMore = rows.length > limit;
    return {
      items: mapped,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() })
            : null,
      },
    };
  }

  async listPublic(query: ProductListQuery): Promise<{
    items: ProductSummaryDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const limit = clampLimit(query.limit);
    const currency = (query.currency ?? "INR").toUpperCase();
    const countryId = await resolveCountryId(this.prisma, query.country);
    const cursor = decodeCursor(query.cursor);

    const where: Prisma.ProductWhereInput = {
      ...publicProductWhere(),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.brand
        ? { brand: { slug: query.brand, deletedAt: null, isActive: true } }
        : {}),
      ...(query.category
        ? {
            categories: {
              some: { category: { slug: query.category, deletedAt: null, isActive: true } },
            },
          }
        : {}),
      ...(query.collection
        ? {
            collections: {
              some: {
                collection: {
                  slug: query.collection,
                  deletedAt: null,
                  isActive: true,
                },
              },
            },
          }
        : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const sort = query.sort ?? "created_at";
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === "name"
        ? [{ name: "asc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

    const rows = await this.prisma.product.findMany({
      where,
      include: productListInclude,
      orderBy,
      take: limit + 1,
    });

    const priceCtx = { currencyCode: currency, countryId };
    let mapped = rows.map((p) => this.toSummary(p, priceCtx));

    if (query.minPriceMinor || query.maxPriceMinor) {
      const min = query.minPriceMinor ? BigInt(query.minPriceMinor) : null;
      const max = query.maxPriceMinor ? BigInt(query.maxPriceMinor) : null;
      mapped = mapped.filter((item) => {
        if (!item.price) return false;
        const amount = BigInt(item.price.amountMinor);
        if (min !== null && amount < min) return false;
        if (max !== null && amount > max) return false;
        return true;
      });
    }

    if (query.inStock !== undefined) {
      mapped = mapped.filter((item) => item.inStock === query.inStock);
    }

    const page = mapped.slice(0, limit);
    const sourceForCursor = rows.slice(0, limit);
    const last = sourceForCursor[sourceForCursor.length - 1];
    const hasMore = rows.length > limit;
    return {
      items: page,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() })
            : null,
      },
    };
  }

  async getPublicBySlugOrId(
    idOrSlug: string,
    opts: { currency?: string; country?: string } = {},
  ): Promise<ProductDetailDto> {
    const currency = (opts.currency ?? "INR").toUpperCase();
    const countryId = await resolveCountryId(this.prisma, opts.country);
    const product = await this.prisma.product.findFirst({
      where: {
        ...publicProductWhere(),
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: productDetailInclude,
    });
    if (!product) throw notFound("Product not found");
    return this.toDetail(product, { currencyCode: currency, countryId });
  }

  async getAdminById(id: string): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: productDetailInclude,
    });
    if (!product) throw notFound("Product not found");
    return this.toDetail(product, { currencyCode: "INR", countryId: null });
  }

  async create(
    input: {
      slug: string;
      name: string;
      description?: string;
      brandId?: string | null;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      categoryIds?: string[];
      primaryCategoryId?: string;
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.product.findUnique({ where: { slug: input.slug } });
    if (existing && !existing.deletedAt) throw conflict("Product slug already exists");

    if (input.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: input.brandId, deletedAt: null },
      });
      if (!brand) throw validationError("Invalid brandId");
    }

    const status = input.status ?? "DRAFT";
    const product = await this.prisma.product.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        brandId: input.brandId ?? null,
        status,
        publishedAt: status === "ACTIVE" ? new Date() : null,
        categories: input.categoryIds?.length
          ? {
              create: input.categoryIds.map((categoryId) => ({
                categoryId,
                isPrimary: categoryId === input.primaryCategoryId,
              })),
            }
          : undefined,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "product.created",
      entityType: "Product",
      entityId: product.id,
      staffUserId,
      metadata: { slug: product.slug, status: product.status },
    });

    return this.getAdminById(product.id);
  }

  async update(
    id: string,
    input: {
      slug?: string;
      name?: string;
      description?: string;
      brandId?: string | null;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      categoryIds?: string[];
      primaryCategoryId?: string;
      publishedAt?: string | null;
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Product not found");

    if (input.slug && input.slug !== existing.slug) {
      const clash = await this.prisma.product.findUnique({ where: { slug: input.slug } });
      if (clash && clash.id !== id && !clash.deletedAt) throw conflict("Product slug already exists");
    }

    const nextStatus = input.status ?? existing.status;
    let publishedAt = existing.publishedAt;
    if (input.publishedAt !== undefined) {
      publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    } else if (input.status === "ACTIVE" && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (input.status && input.status !== "ACTIVE") {
      // keep publishedAt history unless explicitly cleared
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          slug: input.slug,
          name: input.name,
          description: input.description,
          brandId: input.brandId === undefined ? undefined : input.brandId,
          status: nextStatus,
          publishedAt,
        },
      });

      if (input.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (input.categoryIds.length) {
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
              isPrimary: categoryId === input.primaryCategoryId,
            })),
          });
        }
      }
    });

    await writeAuditLog(this.prisma, {
      action: existing.status !== nextStatus ? "product.status_changed" : "product.updated",
      entityType: "Product",
      entityId: id,
      staffUserId,
      metadata: { fromStatus: existing.status, toStatus: nextStatus, slug: input.slug ?? existing.slug },
    });

    return this.getAdminById(id);
  }

  async publish(id: string, staffUserId: string) {
    return this.update(id, { status: "ACTIVE" }, staffUserId);
  }

  async unpublish(id: string, staffUserId: string) {
    return this.update(id, { status: "DRAFT" }, staffUserId);
  }

  async createVariant(
    productId: string,
    input: {
      sku: string;
      name?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
      barcode?: string | null;
      weightGrams?: number | null;
    },
    staffUserId: string,
  ) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw notFound("Product not found");
    const skuClash = await this.prisma.productVariant.findUnique({ where: { sku: input.sku } });
    if (skuClash && !skuClash.deletedAt) throw conflict("SKU already exists");

    if (input.isDefault) {
      await this.prisma.productVariant.updateMany({
        where: { productId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        name: input.name ?? null,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        barcode: input.barcode ?? null,
        weightGrams: input.weightGrams ?? null,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "product_variant.created",
      entityType: "ProductVariant",
      entityId: variant.id,
      staffUserId,
      metadata: { productId, sku: variant.sku },
    });

    return variant;
  }

  async upsertVariantPrice(
    variantId: string,
    input: {
      currencyCode: string;
      amountMinor: string;
      compareAtMinor?: string | null;
      countryId?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
    },
    staffUserId: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
    });
    if (!variant) throw notFound("Variant not found");

    const currencyCode = input.currencyCode.toUpperCase();
    const currency = await this.prisma.currency.findUnique({ where: { code: currencyCode } });
    if (!currency) throw validationError("Unknown currencyCode");

    if (input.countryId) {
      const country = await this.prisma.country.findUnique({ where: { id: input.countryId } });
      if (!country) throw validationError("Invalid countryId");
    }

    const amountMinor = BigInt(input.amountMinor);
    const compareAtMinor =
      input.compareAtMinor === undefined || input.compareAtMinor === null
        ? null
        : BigInt(input.compareAtMinor);

    const existing = await this.prisma.price.findFirst({
      where: {
        variantId,
        currencyCode,
        countryId: input.countryId ?? null,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const price = existing
      ? await this.prisma.price.update({
          where: { id: existing.id },
          data: {
            amountMinor,
            compareAtMinor,
            isActive: input.isActive ?? true,
            startsAt: input.startsAt === undefined ? undefined : input.startsAt ? new Date(input.startsAt) : null,
            endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
          },
        })
      : await this.prisma.price.create({
          data: {
            variantId,
            currencyCode,
            countryId: input.countryId ?? null,
            amountMinor,
            compareAtMinor,
            isActive: input.isActive ?? true,
            startsAt: input.startsAt ? new Date(input.startsAt) : null,
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
          },
        });

    await writeAuditLog(this.prisma, {
      action: existing ? "price.updated" : "price.created",
      entityType: "Price",
      entityId: price.id,
      staffUserId,
      metadata: {
        variantId,
        currencyCode,
        amountMinor: amountMinor.toString(),
      },
    });

    return {
      id: price.id,
      price: moneyFromBigInt(price.amountMinor, price.currencyCode),
      compareAtPrice: price.compareAtMinor
        ? moneyFromBigInt(price.compareAtMinor, price.currencyCode)
        : null,
    };
  }

  private toSummary(
    product: ListedProduct,
    priceCtx: { currencyCode: string; countryId: string | null },
  ): ProductSummaryDto {
    const activeVariants = product.variants.filter((v) => v.isActive);
    const defaultVariant =
      activeVariants.find((v) => v.isDefault) ?? activeVariants[0] ?? null;
    const price = defaultVariant
      ? resolvePrice(defaultVariant.prices as PriceRow[], priceCtx)
      : null;
    const primaryMedia =
      product.media[0]?.url ??
      defaultVariant?.media?.[0]?.url ??
      null;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      status: product.status,
      brandId: product.brandId,
      brand:
        product.brand && !product.brand.deletedAt && product.brand.isActive
          ? { id: product.brand.id, slug: product.brand.slug, name: product.brand.name }
          : null,
      defaultVariantId: defaultVariant?.id ?? null,
      price: price ? moneyFromMinor(price.amountMinor, price.currencyCode) : null,
      compareAtPrice: price?.compareAtMinor
        ? moneyFromMinor(price.compareAtMinor, price.currencyCode)
        : null,
      inStock: activeVariants.some((v) => variantInStock(v)),
      primaryMediaUrl: primaryMedia,
    };
  }

  private toDetail(
    product: DetailedProduct,
    priceCtx: { currencyCode: string; countryId: string | null },
  ): ProductDetailDto {
    const variants = product.variants
      .filter((v) => v.isActive || product.status !== "ACTIVE")
      .map((v) => mapVariant(v, priceCtx));
    // Public detail only includes active variants; admin gets all non-deleted via same mapper when status not ACTIVE-only filter already applied at query for public
    const publicVariants =
      product.status === "ACTIVE"
        ? variants.filter((v) => v.isActive)
        : variants;

    const defaultVariant =
      publicVariants.find((v) => v.isDefault) ?? publicVariants[0] ?? null;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      status: product.status,
      publishedAt: product.publishedAt?.toISOString() ?? null,
      brand:
        product.brand && !product.brand.deletedAt
          ? { id: product.brand.id, slug: product.brand.slug, name: product.brand.name }
          : null,
      categories: product.categories
        .filter((c) => !c.category.deletedAt)
        .map((c) => ({
          id: c.category.id,
          slug: c.category.slug,
          name: c.category.name,
          isPrimary: c.isPrimary,
        })),
      collections: product.collections
        .filter((c) => !c.collection.deletedAt)
        .map((c) => ({
          id: c.collection.id,
          slug: c.collection.slug,
          name: c.collection.name,
        })),
      tags: product.tags.map((t) => ({
        id: t.tag.id,
        slug: t.tag.slug,
        name: t.tag.name,
      })),
      variants: publicVariants,
      media: product.media.map((m) => ({
        id: m.id,
        kind: m.kind,
        url: m.url,
        altText: m.altText,
        sortOrder: m.sortOrder,
        isPrimary: m.isPrimary,
        variantId: m.variantId,
        width: m.width,
        height: m.height,
        mimeType: m.mimeType,
      })),
      defaultVariantId: defaultVariant?.id ?? null,
      price: defaultVariant?.price ?? null,
      compareAtPrice: defaultVariant?.compareAtPrice ?? null,
      inStock: publicVariants.some((v) => v.inStock),
    };
  }
}

export function assertNoInternalFields(payload: unknown): void {
  const text = JSON.stringify(payload);
  if (/passwordHash|storageKey|cost|supplier|onHand|reserved/i.test(text)) {
    throw new ApiError("INTERNAL_ERROR", "Response leaked internal fields", { expose: false });
  }
}
