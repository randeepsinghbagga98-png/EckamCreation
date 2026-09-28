import { randomBytes } from "node:crypto";
import type {
  CartDto,
  CartItemAvailability,
  CartItemDto,
} from "@eckamcreation/api-contracts";
import { CART_MAX_QUANTITY, moneyFromBigInt } from "@eckamcreation/api-contracts";
import type { PrismaClient } from "@eckamcreation/database";
import { notFound, validationError } from "../errors";
import { publicProductWhere } from "../catalogue/helpers";
import { resolveCountryId, resolvePrice, type PriceRow } from "../catalogue/pricing";

const DEFAULT_CURRENCY = "INR";
const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CartContext = {
  currencyCode?: string | null;
  countryCode?: string | null;
};

type CartIdentity =
  | { kind: "customer"; userId: string }
  | { kind: "guest"; guestToken: string };

type CartRow = {
  id: string;
  userId: string | null;
  guestToken: string | null;
  currencyCode: string;
  status: string;
  expiresAt: Date | null;
};

type ItemWithVariant = {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: bigint | null;
  currencyCode: string | null;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    isActive: boolean;
    deletedAt: Date | null;
    productId: string;
    product: {
      id: string;
      slug: string;
      name: string;
      status: string;
      deletedAt: Date | null;
    };
    prices: PriceRow[];
  };
};

function newGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

function clampQty(qty: number): number {
  return Math.min(CART_MAX_QUANTITY, Math.max(0, Math.trunc(qty)));
}

export class CartService {
  constructor(private readonly prisma: PrismaClient) {}

  async createCart(identity: CartIdentity | null, ctx: CartContext = {}): Promise<CartDto> {
    const currencyCode = await this.resolveCurrency(identity, ctx);

    if (identity?.kind === "customer") {
      const existing = await this.findActiveCustomerCart(identity.userId);
      if (existing) return this.toDto(existing.id, ctx);
      const cart = await this.prisma.cart.create({
        data: {
          userId: identity.userId,
          currencyCode,
          status: "ACTIVE",
        },
      });
      return this.toDto(cart.id, ctx);
    }

    const guestToken = newGuestToken();
    const cart = await this.prisma.cart.create({
      data: {
        guestToken,
        currencyCode,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + GUEST_CART_TTL_MS),
      },
    });
    return this.toDto(cart.id, ctx);
  }

  async getCurrent(identity: CartIdentity | null, ctx: CartContext = {}): Promise<CartDto> {
    const cart = await this.resolveActiveCart(identity, { createIfMissing: false });
    if (!cart) throw notFound("Cart not found");
    return this.toDto(cart.id, ctx);
  }

  async clearCart(identity: CartIdentity | null, ctx: CartContext = {}): Promise<CartDto> {
    const cart = await this.requireActiveCart(identity);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.toDto(cart.id, ctx);
  }

  async addItem(
    identity: CartIdentity | null,
    input: { variantId: string; quantity: number },
    ctx: CartContext = {},
  ): Promise<CartDto> {
    const quantity = clampQty(input.quantity);
    if (quantity < 1) throw validationError("Quantity must be at least 1");

    const cart = await this.resolveActiveCart(identity, { createIfMissing: true });
    if (!cart) throw notFound("Cart not found");

    const currencyCode = (ctx.currencyCode ?? cart.currencyCode).toUpperCase();
    const variant = await this.assertPurchasableVariant(input.variantId);
    const unitPrice = await this.resolveVariantUnitPrice(variant.id, currencyCode, ctx.countryCode);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      });

      if (existing) {
        const nextQty = clampQty(existing.quantity + quantity);
        if (nextQty < 1) {
          await tx.cartItem.delete({ where: { id: existing.id } });
          return;
        }
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: nextQty,
            unitPriceMinor: unitPrice?.amountMinor ?? existing.unitPriceMinor,
            currencyCode: unitPrice?.currencyCode ?? existing.currencyCode ?? currencyCode,
          },
        });
        return;
      }

      try {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: variant.id,
            quantity,
            unitPriceMinor: unitPrice?.amountMinor ?? null,
            currencyCode: unitPrice?.currencyCode ?? currencyCode,
          },
        });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: string }).code === "P2002"
        ) {
          const raced = await tx.cartItem.findUnique({
            where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
          });
          if (!raced) throw error;
          await tx.cartItem.update({
            where: { id: raced.id },
            data: {
              quantity: clampQty(raced.quantity + quantity),
              unitPriceMinor: unitPrice?.amountMinor ?? raced.unitPriceMinor,
              currencyCode: unitPrice?.currencyCode ?? raced.currencyCode ?? currencyCode,
            },
          });
          return;
        }
        throw error;
      }

      if (cart.currencyCode !== currencyCode) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { currencyCode },
        });
      }
    });

    return this.toDto(cart.id, { ...ctx, currencyCode });
  }

  async updateItem(
    identity: CartIdentity | null,
    itemOrVariantId: string,
    quantity: number,
    ctx: CartContext = {},
  ): Promise<CartDto> {
    const cart = await this.requireActiveCart(identity);
    const qty = clampQty(quantity);

    const item = await this.findCartItem(cart.id, itemOrVariantId);
    if (!item) throw notFound("Cart item not found");

    if (qty === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return this.toDto(cart.id, ctx);
    }

    const currencyCode = (ctx.currencyCode ?? cart.currencyCode).toUpperCase();
    const unitPrice = await this.resolveVariantUnitPrice(item.variantId, currencyCode, ctx.countryCode);

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: qty,
        unitPriceMinor: unitPrice?.amountMinor ?? item.unitPriceMinor,
        currencyCode: unitPrice?.currencyCode ?? item.currencyCode ?? currencyCode,
      },
    });

    return this.toDto(cart.id, ctx);
  }

  async removeItem(
    identity: CartIdentity | null,
    itemOrVariantId: string,
    ctx: CartContext = {},
  ): Promise<CartDto> {
    const cart = await this.requireActiveCart(identity);
    const item = await this.findCartItem(cart.id, itemOrVariantId);
    if (!item) throw notFound("Cart item not found");
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.toDto(cart.id, ctx);
  }

  /**
   * Merge guest cart into authenticated customer cart.
   * Duplicate variants: quantities are summed and capped at CART_MAX_QUANTITY.
   * Guest cart is marked MERGED and can no longer be used.
   */
  async mergeGuestIntoCustomer(
    userId: string,
    guestToken: string,
    ctx: CartContext = {},
  ): Promise<CartDto> {
    const token = guestToken.trim();
    if (!token) throw validationError("guestToken is required");

    const customerCartId = await this.prisma.$transaction(async (tx) => {
      const guest = await tx.cart.findFirst({
        where: { guestToken: token, status: "ACTIVE" },
        include: { items: true },
      });
      if (!guest) throw notFound("Guest cart not found");

      let customer = await tx.cart.findFirst({
        where: { userId, status: "ACTIVE" },
        include: { items: true },
      });

      if (!customer) {
        customer = await tx.cart.create({
          data: {
            userId,
            currencyCode: guest.currencyCode,
            status: "ACTIVE",
          },
          include: { items: true },
        });
      }

      if (guest.id === customer.id) {
        return customer.id;
      }

      for (const guestItem of guest.items) {
        const existing = customer.items.find((i) => i.variantId === guestItem.variantId);
        if (existing) {
          const nextQty = clampQty(existing.quantity + guestItem.quantity);
          await tx.cartItem.update({
            where: { id: existing.id },
            data: {
              quantity: nextQty,
              unitPriceMinor: guestItem.unitPriceMinor ?? existing.unitPriceMinor,
              currencyCode: guestItem.currencyCode ?? existing.currencyCode,
            },
          });
        } else {
          try {
            await tx.cartItem.create({
              data: {
                cartId: customer.id,
                variantId: guestItem.variantId,
                quantity: clampQty(guestItem.quantity),
                unitPriceMinor: guestItem.unitPriceMinor,
                currencyCode: guestItem.currencyCode,
              },
            });
          } catch (error) {
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              (error as { code: string }).code === "P2002"
            ) {
              const raced = await tx.cartItem.findUnique({
                where: {
                  cartId_variantId: {
                    cartId: customer.id,
                    variantId: guestItem.variantId,
                  },
                },
              });
              if (raced) {
                await tx.cartItem.update({
                  where: { id: raced.id },
                  data: { quantity: clampQty(raced.quantity + guestItem.quantity) },
                });
              }
            } else {
              throw error;
            }
          }
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: guest.id } });
      await tx.cart.update({
        where: { id: guest.id },
        data: {
          status: "MERGED",
          mergedIntoId: customer.id,
          guestToken: null,
        },
      });

      return customer.id;
    });

    return this.toDto(customerCartId, ctx);
  }

  private async toDto(cartId: string, ctx: CartContext): Promise<CartDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    status: true,
                    deletedAt: true,
                  },
                },
                prices: true,
              },
            },
          },
        },
      },
    });
    if (!cart) throw notFound("Cart not found");

    const currencyCode = (ctx.currencyCode ?? cart.currencyCode).toUpperCase();
    const countryId = await resolveCountryId(this.prisma, ctx.countryCode);

    const items: CartItemDto[] = cart.items.map((item) =>
      this.mapItem(item as ItemWithVariant, currencyCode, countryId),
    );

    let subtotalMinor = BigInt(0);
    let subtotalComplete = true;
    let itemCount = 0;
    for (const item of items) {
      itemCount += item.quantity;
      if (item.lineTotal) {
        subtotalMinor += BigInt(item.lineTotal.amountMinor);
      } else if (item.availability === "PRICE_UNAVAILABLE" || !item.available) {
        // Unavailable / unpriced lines do not block subtotal of priced available lines,
        // but PRICE_UNAVAILABLE on an otherwise OK product marks subtotal incomplete.
        if (item.availability === "PRICE_UNAVAILABLE") subtotalComplete = false;
      }
    }

    return {
      id: cart.id,
      status: cart.status,
      currencyCode,
      guestToken: cart.guestToken,
      userId: cart.userId,
      expiresAt: cart.expiresAt?.toISOString() ?? null,
      itemCount,
      subtotal:
        items.length === 0
          ? moneyFromBigInt(BigInt(0), currencyCode)
          : subtotalComplete
            ? moneyFromBigInt(subtotalMinor, currencyCode)
            : null,
      items,
    };
  }

  private mapItem(
    item: ItemWithVariant,
    currencyCode: string,
    countryId: string | null,
  ): CartItemDto {
    const product = item.variant.product;
    const variantOk =
      item.variant.isActive && !item.variant.deletedAt;
    const productOk =
      !product.deletedAt && product.status === "ACTIVE";

    let availability: CartItemAvailability = "OK";
    if (!productOk) availability = "PRODUCT_UNAVAILABLE";
    else if (!variantOk) availability = "VARIANT_UNAVAILABLE";

    let unitPrice: ReturnType<typeof moneyFromBigInt> | null = null;
    if (availability === "OK") {
      const prices = item.variant.prices as PriceRow[];
      const resolved = resolvePrice(prices, { currencyCode, countryId });
      if (!resolved) {
        availability = "PRICE_UNAVAILABLE";
      } else {
        unitPrice = moneyFromBigInt(resolved.amountMinor, resolved.currencyCode);
      }
    }

    const lineTotal =
      unitPrice != null
        ? moneyFromBigInt(BigInt(unitPrice.amountMinor) * BigInt(item.quantity), unitPrice.currencyCode)
        : null;

    return {
      id: item.id,
      variantId: item.variantId,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: item.variant.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      available: availability === "OK",
      availability,
    };
  }

  private async resolveActiveCart(
    identity: CartIdentity | null,
    opts: { createIfMissing: boolean },
  ): Promise<CartRow | null> {
    if (identity?.kind === "customer") {
      const existing = await this.findActiveCustomerCart(identity.userId);
      if (existing) return existing;
      if (!opts.createIfMissing) return null;
      const currencyCode = await this.resolveCurrency(identity, {});
      return this.prisma.cart.create({
        data: {
          userId: identity.userId,
          currencyCode,
          status: "ACTIVE",
        },
      });
    }

    if (identity?.kind === "guest") {
      const existing = await this.prisma.cart.findFirst({
        where: {
          guestToken: identity.guestToken,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (existing) return existing;
      if (!opts.createIfMissing) return null;
      return this.prisma.cart.create({
        data: {
          guestToken: identity.guestToken,
          currencyCode: DEFAULT_CURRENCY,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + GUEST_CART_TTL_MS),
        },
      });
    }

    if (!opts.createIfMissing) return null;
    const guestToken = newGuestToken();
    return this.prisma.cart.create({
      data: {
        guestToken,
        currencyCode: DEFAULT_CURRENCY,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + GUEST_CART_TTL_MS),
      },
    });
  }

  private async requireActiveCart(identity: CartIdentity | null): Promise<CartRow> {
    const cart = await this.resolveActiveCart(identity, { createIfMissing: false });
    if (!cart) throw notFound("Cart not found");
    return cart;
  }

  private async findActiveCustomerCart(userId: string): Promise<CartRow | null> {
    return this.prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    });
  }

  private async findCartItem(cartId: string, itemOrVariantId: string) {
    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        OR: [{ id: itemOrVariantId }, { variantId: itemOrVariantId }],
      },
    });
  }

  private async assertPurchasableVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        isActive: true,
        product: publicProductWhere(),
      },
      select: { id: true, productId: true },
    });
    if (!variant) throw notFound("Product variant not available");
    return variant;
  }

  private async resolveVariantUnitPrice(
    variantId: string,
    currencyCode: string,
    countryCode?: string | null,
  ) {
    const countryId = await resolveCountryId(this.prisma, countryCode);
    const prices = await this.prisma.price.findMany({
      where: { variantId, currencyCode: currencyCode.toUpperCase(), isActive: true },
    });
    const resolved = resolvePrice(prices, { currencyCode, countryId });
    if (!resolved) return null;
    return {
      amountMinor: resolved.amountMinor,
      currencyCode: resolved.currencyCode,
    };
  }

  private async resolveCurrency(
    identity: CartIdentity | null,
    ctx: CartContext,
  ): Promise<string> {
    if (ctx.currencyCode) {
      const code = ctx.currencyCode.toUpperCase();
      const currency = await this.prisma.currency.findFirst({
        where: { code, isActive: true },
      });
      if (!currency) throw validationError("Invalid currency");
      return code;
    }

    if (identity?.kind === "customer") {
      const profile = await this.prisma.customerProfile.findUnique({
        where: { userId: identity.userId },
        select: { defaultCurrencyCode: true },
      });
      if (profile?.defaultCurrencyCode) return profile.defaultCurrencyCode;
    }

    const fallback = await this.prisma.currency.findFirst({
      where: { code: DEFAULT_CURRENCY, isActive: true },
    });
    if (fallback) return DEFAULT_CURRENCY;

    const any = await this.prisma.currency.findFirst({ where: { isActive: true } });
    if (!any) throw validationError("No active currency configured");
    return any.code;
  }
}

export function readGuestToken(request: Request): string | null {
  const header = request.headers.get("x-cart-token")?.trim();
  return header || null;
}

export type { CartIdentity };
