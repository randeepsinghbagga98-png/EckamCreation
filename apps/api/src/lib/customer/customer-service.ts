import type { Prisma, PrismaClient } from "@eckamcreation/database";
import type {
  AddressDto,
  ProfileDto,
  WishlistItemDto,
  CustomerOrderSummaryDto,
} from "@eckamcreation/api-contracts";
import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import { writeAuditLog } from "@eckamcreation/auth";
import { conflict, notFound, validationError } from "../errors";
import { clampLimit, decodeCursor, encodeCursor, publicProductWhere } from "../catalogue/helpers";

type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AddressRow = {
  id: string;
  type: "SHIPPING" | "BILLING" | "BOTH";
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryId: string;
  regionId: string | null;
  isDefault: boolean;
};

type AddressType = AddressRow["type"];

function toAddressDto(row: AddressRow): AddressDto {
  return {
    id: row.id,
    type: row.type,
    fullName: row.fullName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    countryId: row.countryId,
    regionId: row.regionId,
    isDefault: row.isDefault,
  };
}

function defaultClearTypes(type: AddressType): AddressType[] {
  if (type === "SHIPPING") return ["SHIPPING", "BOTH"];
  if (type === "BILLING") return ["BILLING", "BOTH"];
  return ["SHIPPING", "BILLING", "BOTH"];
}

export class CustomerService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreateProfile(userId: string): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.deletedAt) throw notFound("User not found");

    let profile = user.profile;
    if (!profile) {
      profile = await this.prisma.customerProfile.create({
        data: { userId },
      });
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: profile.phone,
      locale: profile.locale,
      defaultCurrencyCode: profile.defaultCurrencyCode,
      defaultCountryId: profile.defaultCountryId,
      emailVerified: Boolean(user.emailVerified),
    };
  }

  async updateProfile(
    userId: string,
    input: {
      name?: string | null;
      phone?: string | null;
      locale?: string | null;
      defaultCurrencyCode?: string | null;
      defaultCountryId?: string | null;
    },
    audit?: AuditMeta,
  ): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw notFound("User not found");

    if (input.defaultCurrencyCode) {
      const currency = await this.prisma.currency.findFirst({
        where: { code: input.defaultCurrencyCode, isActive: true },
      });
      if (!currency) throw validationError("Invalid currency code");
    }
    if (input.defaultCountryId) {
      const country = await this.prisma.country.findFirst({
        where: { id: input.defaultCountryId, isActive: true },
      });
      if (!country) throw validationError("Invalid country");
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.name !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name: input.name },
        });
      }
      await tx.customerProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: input.phone ?? undefined,
          locale: input.locale ?? undefined,
          defaultCurrencyCode: input.defaultCurrencyCode ?? undefined,
          defaultCountryId: input.defaultCountryId ?? undefined,
        },
        update: {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.locale !== undefined ? { locale: input.locale } : {}),
          ...(input.defaultCurrencyCode !== undefined
            ? { defaultCurrencyCode: input.defaultCurrencyCode }
            : {}),
          ...(input.defaultCountryId !== undefined
            ? { defaultCountryId: input.defaultCountryId }
            : {}),
        },
      });
    });

    await writeAuditLog(this.prisma, {
      action: "customer.profile.update",
      entityType: "CustomerProfile",
      entityId: userId,
      actorUserId: userId,
      metadata: {
        fields: Object.keys(input).filter(
          (k) => input[k as keyof typeof input] !== undefined,
        ),
      },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return this.getOrCreateProfile(userId);
  }

  async listAddresses(userId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toAddressDto);
  }

  async createAddress(
    userId: string,
    input: {
      type?: AddressType;
      fullName: string;
      phone?: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      countryId: string;
      regionId?: string;
      isDefault?: boolean;
    },
    audit?: AuditMeta,
  ): Promise<AddressDto> {
    await this.assertCountryRegion(input.countryId, input.regionId);

    const type = input.type ?? "SHIPPING";
    const isDefault = input.isDefault ?? false;

    const row = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, type: { in: defaultClearTypes(type) }, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId,
          type,
          fullName: input.fullName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          countryId: input.countryId,
          regionId: input.regionId,
          isDefault,
        },
      });
    });

    await writeAuditLog(this.prisma, {
      action: "customer.address.create",
      entityType: "Address",
      entityId: row.id,
      actorUserId: userId,
      metadata: { type: row.type, isDefault: row.isDefault },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return toAddressDto(row);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: {
      type?: AddressType;
      fullName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryId?: string;
      regionId?: string;
      isDefault?: boolean;
    },
    audit?: AuditMeta,
  ): Promise<AddressDto> {
    const existing = await this.ownedAddress(userId, addressId);
    const countryId = input.countryId ?? existing.countryId;
    const regionId = input.regionId !== undefined ? input.regionId : existing.regionId;
    await this.assertCountryRegion(countryId, regionId ?? undefined);

    const type = input.type ?? existing.type;
    const isDefault = input.isDefault ?? existing.isDefault;

    const row = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: {
            userId,
            id: { not: addressId },
            type: { in: defaultClearTypes(type) },
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
          ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
          ...(input.countryId !== undefined ? { countryId: input.countryId } : {}),
          ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      });
    });

    await writeAuditLog(this.prisma, {
      action: "customer.address.update",
      entityType: "Address",
      entityId: row.id,
      actorUserId: userId,
      metadata: { type: row.type, isDefault: row.isDefault },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return toAddressDto(row);
  }

  async deleteAddress(userId: string, addressId: string, audit?: AuditMeta): Promise<void> {
    await this.ownedAddress(userId, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });
    await writeAuditLog(this.prisma, {
      action: "customer.address.delete",
      entityType: "Address",
      entityId: addressId,
      actorUserId: userId,
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });
  }

  async getNotificationPreferences(userId: string) {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      emailTransactional: row.emailTransactional,
      emailMarketing: row.emailMarketing,
      whatsappTransactional: row.whatsappTransactional,
      whatsappMarketing: row.whatsappMarketing,
      pushEnabled: row.pushEnabled,
    };
  }

  async updateNotificationPreferences(
    userId: string,
    input: {
      emailTransactional?: boolean;
      emailMarketing?: boolean;
      whatsappTransactional?: boolean;
      whatsappMarketing?: boolean;
      pushEnabled?: boolean;
    },
    audit?: AuditMeta,
  ) {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailTransactional: input.emailTransactional ?? true,
        emailMarketing: input.emailMarketing ?? false,
        whatsappTransactional: input.whatsappTransactional ?? false,
        whatsappMarketing: input.whatsappMarketing ?? false,
        pushEnabled: input.pushEnabled ?? false,
      },
      update: {
        ...(input.emailTransactional !== undefined
          ? { emailTransactional: input.emailTransactional }
          : {}),
        ...(input.emailMarketing !== undefined ? { emailMarketing: input.emailMarketing } : {}),
        ...(input.whatsappTransactional !== undefined
          ? { whatsappTransactional: input.whatsappTransactional }
          : {}),
        ...(input.whatsappMarketing !== undefined
          ? { whatsappMarketing: input.whatsappMarketing }
          : {}),
        ...(input.pushEnabled !== undefined ? { pushEnabled: input.pushEnabled } : {}),
      },
    });

    await writeAuditLog(this.prisma, {
      action: "customer.preferences.update",
      entityType: "NotificationPreference",
      entityId: row.id,
      actorUserId: userId,
      metadata: {
        fields: Object.keys(input).filter(
          (k) => input[k as keyof typeof input] !== undefined,
        ),
      },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return {
      emailTransactional: row.emailTransactional,
      emailMarketing: row.emailMarketing,
      whatsappTransactional: row.whatsappTransactional,
      whatsappMarketing: row.whatsappMarketing,
      pushEnabled: row.pushEnabled,
    };
  }

  async listConsents(userId: string) {
    const rows = await this.prisma.customerConsent.findMany({
      where: { userId },
      orderBy: { capturedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      source: r.source,
      capturedAt: r.capturedAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
    }));
  }

  async createConsent(
    userId: string,
    input: {
      type:
        | "EMAIL_MARKETING"
        | "EMAIL_TRANSACTIONAL"
        | "WHATSAPP_MARKETING"
        | "WHATSAPP_TRANSACTIONAL"
        | "SMS"
        | "ANALYTICS";
      status: "GRANTED" | "REVOKED" | "PENDING";
      source: string;
    },
    audit?: AuditMeta,
  ) {
    const row = await this.prisma.customerConsent.create({
      data: {
        userId,
        type: input.type,
        status: input.status,
        source: input.source,
        revokedAt: input.status === "REVOKED" ? new Date() : null,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "customer.consent.create",
      entityType: "CustomerConsent",
      entityId: row.id,
      actorUserId: userId,
      metadata: { type: row.type, status: row.status },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      source: row.source,
      capturedAt: row.capturedAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    };
  }

  async getWishlist(userId: string): Promise<{ id: string; name: string; items: WishlistItemDto[] }> {
    const wishlist = await this.ensureDefaultWishlist(userId);
    const items = await this.prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id },
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          include: {
            product: { select: { id: true, slug: true, name: true, status: true, deletedAt: true } },
          },
        },
      },
    });

    const visible: WishlistItemDto[] = [];
    for (const item of items) {
      const product = item.variant.product;
      const available =
        !product.deletedAt &&
        product.status === "ACTIVE" &&
        item.variant.isActive &&
        !item.variant.deletedAt;

      // Hide deleted/unpublished products from the customer-facing list
      if (!available) continue;

      visible.push({
        id: item.id,
        variantId: item.variantId,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        variantName: item.variant.name,
        sku: item.variant.sku,
        available: true,
        addedAt: item.createdAt.toISOString(),
      });
    }

    return { id: wishlist.id, name: wishlist.name, items: visible };
  }

  async addWishlistItem(
    userId: string,
    input: { variantId?: string; productId?: string },
    audit?: AuditMeta,
  ): Promise<WishlistItemDto> {
    const variant = await this.resolveActiveVariant(input);
    const wishlist = await this.ensureDefaultWishlist(userId);

    try {
      const item = await this.prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, variantId: variant.id },
        include: {
          variant: {
            include: {
              product: { select: { id: true, slug: true, name: true } },
            },
          },
        },
      });

      await writeAuditLog(this.prisma, {
        action: "customer.wishlist.add",
        entityType: "WishlistItem",
        entityId: item.id,
        actorUserId: userId,
        metadata: { variantId: variant.id, productId: variant.productId },
        ipAddress: audit?.ipAddress,
        userAgent: audit?.userAgent,
      });

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.product.id,
        productSlug: item.variant.product.slug,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        sku: item.variant.sku,
        available: true,
        addedAt: item.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw conflict("Product already in wishlist");
      }
      throw error;
    }
  }

  async removeWishlistItem(
    userId: string,
    variantOrProductId: string,
    audit?: AuditMeta,
  ): Promise<void> {
    const wishlist = await this.ensureDefaultWishlist(userId);

    const byVariant = await this.prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, variantId: variantOrProductId },
    });
    if (byVariant) {
      await this.prisma.wishlistItem.delete({ where: { id: byVariant.id } });
      await writeAuditLog(this.prisma, {
        action: "customer.wishlist.remove",
        entityType: "WishlistItem",
        entityId: byVariant.id,
        actorUserId: userId,
        metadata: { variantId: variantOrProductId },
        ipAddress: audit?.ipAddress,
        userAgent: audit?.userAgent,
      });
      return;
    }

    // Fallback: treat path param as productId (contract convenience)
    const deleted = await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        variant: { productId: variantOrProductId },
      },
    });
    if (deleted.count === 0) throw notFound("Wishlist item not found");

    await writeAuditLog(this.prisma, {
      action: "customer.wishlist.remove",
      entityType: "WishlistItem",
      entityId: variantOrProductId,
      actorUserId: userId,
      metadata: { productId: variantOrProductId },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });
  }

  async listOrders(
    userId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{
    items: CustomerOrderSummaryDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(cursor
        ? {
            OR: [
              { placedAt: { lt: cursor.createdAt } },
              { placedAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { _count: { select: { items: true } } },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        currencyCode: o.currencyCode,
        total: moneyFromBigInt(o.totalMinor, o.currencyCode),
        placedAt: o.placedAt.toISOString(),
        itemCount: o._count.items,
      })),
      pagination: {
        nextCursor: hasMore && last ? encodeCursor({ id: last.id, createdAt: last.placedAt.toISOString() }) : null,
        hasMore,
      },
    };
  }

  async getOrder(userId: string, idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        OR: [{ id: idOrNumber }, { number: idOrNumber }],
      },
      include: {
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw notFound("Order not found");

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      currencyCode: order.currencyCode,
      total: moneyFromBigInt(order.totalMinor, order.currencyCode),
      subtotal: moneyFromBigInt(order.subtotalMinor, order.currencyCode),
      discount: moneyFromBigInt(order.discountMinor, order.currencyCode),
      tax: moneyFromBigInt(order.taxMinor, order.currencyCode),
      shipping: moneyFromBigInt(order.shippingMinor, order.currencyCode),
      placedAt: order.placedAt.toISOString(),
      itemCount: order.items.length,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productNameSnap,
        variantName: item.variantNameSnap,
        sku: item.skuSnap,
        quantity: item.quantity,
        unitPrice: moneyFromBigInt(item.unitPriceMinor, item.currencyCode),
        total: moneyFromBigInt(item.totalMinor, item.currencyCode),
      })),
    };
  }

  private async ownedAddress(userId: string, addressId: string): Promise<AddressRow> {
    const row = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!row) throw notFound("Address not found");
    return row;
  }

  private async assertCountryRegion(countryId: string, regionId?: string | null) {
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, isActive: true },
    });
    if (!country) throw validationError("Invalid country");
    if (regionId) {
      const region = await this.prisma.region.findFirst({
        where: { id: regionId, countryId, isActive: true },
      });
      if (!region) throw validationError("Invalid region for country");
    }
  }

  private async ensureDefaultWishlist(userId: string) {
    return this.prisma.wishlist.upsert({
      where: { userId_name: { userId, name: "Default" } },
      create: { userId, name: "Default" },
      update: {},
    });
  }

  private async resolveActiveVariant(input: { variantId?: string; productId?: string }) {
    if (input.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          id: input.variantId,
          deletedAt: null,
          isActive: true,
          product: publicProductWhere(),
        },
      });
      if (!variant) throw notFound("Product variant not available");
      return variant;
    }

    if (input.productId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          productId: input.productId,
          deletedAt: null,
          isActive: true,
          product: publicProductWhere(),
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (!variant) throw notFound("Product not available");
      return variant;
    }

    throw validationError("variantId or productId is required");
  }
}
