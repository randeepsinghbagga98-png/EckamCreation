import type {
  CheckoutItemDto,
  CheckoutPatchInput,
  CheckoutSessionDto,
} from "@eckamcreation/api-contracts";
import { CHECKOUT_TTL_MS, moneyFromBigInt } from "@eckamcreation/api-contracts";
import type { PrismaClient } from "@eckamcreation/database";
import type { CartIdentity } from "../cart/cart-service";
import { resolveCountryId, resolvePrice, type PriceRow } from "../catalogue/pricing";
import { conflict, forbidden, notFound, validationError } from "../errors";
import { DiscountService } from "./discount-service";
import { InventoryValidationService } from "./inventory-validation";
import { ShippingService } from "./shipping-service";
import { TaxService } from "./tax-service";

const TERMINAL = new Set(["COMPLETED", "EXPIRED", "CANCELLED"]);

type LockedLine = {
  variantId: string;
  quantity: number;
  unitPriceMinor: bigint;
  currencyCode: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  weightGrams: number | null;
};

export class CheckoutService {
  private readonly tax: TaxService;
  private readonly shipping: ShippingService;
  private readonly discounts: DiscountService;
  private readonly inventory: InventoryValidationService;

  constructor(private readonly prisma: PrismaClient) {
    this.tax = new TaxService(prisma);
    this.shipping = new ShippingService(prisma);
    this.discounts = new DiscountService(prisma);
    this.inventory = new InventoryValidationService(prisma);
  }

  async start(
    identity: CartIdentity,
    input: { cartId?: string; currencyCode?: string; countryCode?: string },
  ): Promise<CheckoutSessionDto> {
    const cart = await this.resolveOwnedCart(identity, input.cartId);
    if (cart.status !== "ACTIVE") throw validationError("Cart is not active");

    const currencyCode = (input.currencyCode ?? cart.currencyCode).toUpperCase();
    if (input.currencyCode && cart.currencyCode !== currencyCode) {
      // Allow starting checkout in a requested currency only if cart matches or we reprice
      // Prefer cart currency as source of truth unless explicitly matching.
    }
    if (cart.currencyCode !== currencyCode) {
      throw validationError("Currency mismatch between cart and checkout");
    }

    const existing = await this.prisma.checkoutSession.findUnique({
      where: { cartId: cart.id },
    });
    if (existing && !TERMINAL.has(existing.status) && existing.expiresAt > new Date()) {
      return this.toDto(existing.id, { includeShippingOptions: true });
    }

    const locked = await this.lockCartLines(cart.id, currencyCode, input.countryCode);
    if (locked.length === 0) throw validationError("Cart is empty");

    const stock = await this.inventory.checkVariants(
      locked.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    );
    const stockFail = stock.find((s) => !s.ok);
    if (stockFail) {
      throw validationError(
        `Insufficient inventory for variant ${stockFail.variantId} (available ${stockFail.available})`,
      );
    }

    const subtotalMinor = locked.reduce(
      (sum, l) => sum + l.unitPriceMinor * BigInt(l.quantity),
      BigInt(0),
    );

    const sessionId = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.checkoutItem.deleteMany({ where: { checkoutSessionId: existing.id } });
        await tx.checkoutSession.delete({ where: { id: existing.id } });
      }

      const session = await tx.checkoutSession.create({
        data: {
          cartId: cart.id,
          userId: identity.kind === "customer" ? identity.userId : cart.userId,
          status: "OPEN",
          currencyCode,
          subtotalMinor,
          discountMinor: BigInt(0),
          taxMinor: BigInt(0),
          shippingMinor: BigInt(0),
          totalMinor: subtotalMinor,
          expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
          items: {
            create: locked.map((l) => ({
              variantId: l.variantId,
              quantity: l.quantity,
              unitPriceMinor: l.unitPriceMinor,
              currencyCode: l.currencyCode,
            })),
          },
        },
      });
      return session.id;
    });

    return this.toDto(sessionId, { includeShippingOptions: true, countryCode: input.countryCode });
  }

  async get(
    identity: CartIdentity,
    checkoutId: string,
    opts?: { countryCode?: string },
  ): Promise<CheckoutSessionDto> {
    await this.requireOwnedSession(identity, checkoutId);
    return this.toDto(checkoutId, {
      includeShippingOptions: true,
      countryCode: opts?.countryCode,
    });
  }

  async patch(
    identity: CartIdentity,
    checkoutId: string,
    input: CheckoutPatchInput,
  ): Promise<CheckoutSessionDto> {
    const session = await this.requireOwnedSession(identity, checkoutId);
    this.assertMutable(session);

    let shippingAddressId = session.shippingAddressId;
    let billingAddressId = session.billingAddressId;
    let shippingMethodId = session.shippingMethodId;
    let couponCode = session.couponCode;

    if (input.shippingAddressId) {
      await this.assertAddressAccess(identity, input.shippingAddressId, session);
      shippingAddressId = input.shippingAddressId;
    } else if (input.shippingAddress) {
      if (identity.kind !== "guest") {
        throw validationError("Use shippingAddressId for authenticated customers");
      }
      const created = await this.prisma.address.create({
        data: {
          userId: null,
          type: input.shippingAddress.type ?? "SHIPPING",
          fullName: input.shippingAddress.fullName,
          phone: input.shippingAddress.phone,
          line1: input.shippingAddress.line1,
          line2: input.shippingAddress.line2,
          city: input.shippingAddress.city,
          state: input.shippingAddress.state,
          postalCode: input.shippingAddress.postalCode,
          countryId: await this.resolveAddressCountryId(input.shippingAddress.countryId),
          regionId: input.shippingAddress.regionId,
          isDefault: false,
        },
      });
      shippingAddressId = created.id;
    }

    if (input.billingAddressId !== undefined) {
      if (input.billingAddressId === null) {
        billingAddressId = null;
      } else {
        await this.assertAddressAccess(identity, input.billingAddressId, session);
        billingAddressId = input.billingAddressId;
      }
    } else if (input.billingAddress) {
      if (identity.kind !== "guest") {
        throw validationError("Use billingAddressId for authenticated customers");
      }
      const created = await this.prisma.address.create({
        data: {
          userId: null,
          type: input.billingAddress.type ?? "BILLING",
          fullName: input.billingAddress.fullName,
          phone: input.billingAddress.phone,
          line1: input.billingAddress.line1,
          line2: input.billingAddress.line2,
          city: input.billingAddress.city,
          state: input.billingAddress.state,
          postalCode: input.billingAddress.postalCode,
          countryId: await this.resolveAddressCountryId(input.billingAddress.countryId),
          regionId: input.billingAddress.regionId,
          isDefault: false,
        },
      });
      billingAddressId = created.id;
    }

    if (input.shippingMethodId !== undefined) {
      shippingMethodId = input.shippingMethodId;
    }
    if (input.couponCode !== undefined) {
      couponCode = input.couponCode;
    }

    // Validate coupon before persisting so invalid codes never stick on the session
    if (couponCode) {
      const previewSubtotal = session.subtotalMinor;
      let countryId: string | null = null;
      if (shippingAddressId) {
        const addr = await this.prisma.address.findUnique({
          where: { id: shippingAddressId },
          select: { countryId: true },
        });
        countryId = addr?.countryId ?? null;
      }
      await this.discounts.quote({
        couponCode,
        currencyCode: session.currencyCode,
        subtotalMinor: previewSubtotal,
        countryId,
        userId: session.userId,
      });
    }

    let status = session.status;
    if (shippingAddressId && (status === "OPEN" || status === "ADDRESS")) {
      status = "ADDRESS";
    }
    if (shippingAddressId && shippingMethodId) {
      status = "SHIPPING";
    }

    await this.prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: {
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        couponCode,
        status,
      },
    });

    // Recalculate totals after patch
    return this.recalculate(checkoutId, { refreshPrices: false });
  }

  async quote(
    identity: CartIdentity,
    checkoutId: string,
    opts?: { refreshPrices?: boolean },
  ): Promise<CheckoutSessionDto> {
    await this.requireOwnedSession(identity, checkoutId);
    return this.recalculate(checkoutId, {
      refreshPrices: opts?.refreshPrices ?? true,
      includeShippingOptions: true,
    });
  }

  /**
   * Advance to PAYMENT (ready-for-payment boundary).
   * Does NOT create Order or PaymentIntent and does NOT charge.
   */
  async complete(identity: CartIdentity, checkoutId: string): Promise<CheckoutSessionDto> {
    const session = await this.requireOwnedSession(identity, checkoutId);
    if (session.status === "PAYMENT" && session.paymentStatus === "READY_FOR_PAYMENT") {
      return this.toDto(checkoutId, { includeShippingOptions: true });
    }
    this.assertMutable(session);

    await this.recalculate(checkoutId, {
      refreshPrices: false,
      requirePriceMatch: true,
    });

    const current = await this.prisma.checkoutSession.findUnique({ where: { id: checkoutId } });
    if (!current?.shippingAddressId) {
      throw validationError("Shipping address is required");
    }
    if (!current.shippingMethodId) {
      throw validationError("Shipping method is required");
    }

    await this.prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: {
        status: "PAYMENT",
        paymentStatus: "READY_FOR_PAYMENT",
      },
    });

    return this.toDto(checkoutId, { includeShippingOptions: true });
  }

  private async recalculate(
    checkoutId: string,
    opts: {
      refreshPrices?: boolean;
      requirePriceMatch?: boolean;
      includeShippingOptions?: boolean;
      countryCode?: string;
    },
  ): Promise<CheckoutSessionDto> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                prices: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    });
    if (!session) throw notFound("Checkout session not found");
    this.assertMutable(session);

    const warnings: string[] = [];
    const currencyCode = session.currencyCode;
    const countryId =
      session.shippingAddress?.countryId ??
      (await resolveCountryId(this.prisma, opts.countryCode));

    // Price revalidation
    for (const item of session.items) {
      const live = resolvePrice(item.variant.prices as PriceRow[], {
        currencyCode,
        countryId,
      });
      const productOk =
        !item.variant.product.deletedAt &&
        item.variant.product.status === "ACTIVE" &&
        item.variant.isActive &&
        !item.variant.deletedAt;
      if (!productOk) {
        throw validationError(`Variant ${item.variantId} is no longer available`);
      }
      if (!live) {
        throw validationError(`No active price for variant ${item.variantId}`);
      }
      if (live.currencyCode !== currencyCode) {
        throw validationError("Currency mismatch in live price");
      }
      if (live.amountMinor !== item.unitPriceMinor) {
        const msg = `PRICE_CHANGED:${item.variantId}:${item.unitPriceMinor.toString()}→${live.amountMinor.toString()}`;
        warnings.push(msg);
        if (opts.requirePriceMatch) {
          throw conflict("Prices changed since checkout started; re-quote required");
        }
        if (opts.refreshPrices) {
          await this.prisma.checkoutItem.update({
            where: { id: item.id },
            data: { unitPriceMinor: live.amountMinor, currencyCode: live.currencyCode },
          });
          item.unitPriceMinor = live.amountMinor;
        }
      }
    }

    const items = await this.prisma.checkoutItem.findMany({
      where: { checkoutSessionId: checkoutId },
    });
    const subtotalMinor = items.reduce(
      (sum, i) => sum + i.unitPriceMinor * BigInt(i.quantity),
      BigInt(0),
    );

    const discount = await this.discounts.quote({
      couponCode: session.couponCode,
      currencyCode,
      subtotalMinor,
      countryId,
      userId: session.userId,
    });

    const weightGrams = session.items.reduce(
      (sum, i) => sum + (i.variant.weightGrams ?? 0) * i.quantity,
      0,
    );

    let shippingMinor = BigInt(0);
    if (session.shippingMethodId && countryId) {
      const option = await this.shipping.resolveMethodAmount({
        shippingMethodId: session.shippingMethodId,
        countryId,
        currencyCode,
        subtotalMinor,
        weightGrams,
      });
      if (!option) {
        throw validationError("Selected shipping method is not available for this destination");
      }
      shippingMinor = discount.freeShipping ? BigInt(0) : option.amountMinor;
    }

    const taxableMinor =
      subtotalMinor - discount.discountMinor > BigInt(0)
        ? subtotalMinor - discount.discountMinor
        : BigInt(0);

    const tax = await this.tax.quote({
      countryId: countryId ?? null,
      regionId: session.shippingAddress?.regionId ?? null,
      taxableMinor,
      currencyCode,
    });

    const totalMinor =
      taxableMinor + tax.taxMinor + shippingMinor;

    let status = session.status;
    if (session.shippingAddressId && session.shippingMethodId && status !== "PAYMENT") {
      status = "SHIPPING";
    } else if (session.shippingAddressId && status === "OPEN") {
      status = "ADDRESS";
    }

    await this.prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: {
        subtotalMinor,
        discountMinor: discount.discountMinor,
        taxMinor: tax.taxMinor,
        shippingMinor,
        totalMinor,
        promotionId: discount.promotionId,
        couponCode: discount.couponCode ?? session.couponCode,
        status: status === "PAYMENT" ? "PAYMENT" : status,
      },
    });

    return this.toDto(checkoutId, {
      includeShippingOptions: opts.includeShippingOptions,
      warnings,
      taxConfigured: tax.configured,
    });
  }

  private async toDto(
    checkoutId: string,
    opts?: {
      includeShippingOptions?: boolean;
      countryCode?: string;
      warnings?: string[];
      taxConfigured?: boolean;
    },
  ): Promise<CheckoutSessionDto> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        shippingAddress: true,
      },
    });
    if (!session) throw notFound("Checkout session not found");

    if (session.expiresAt.getTime() < Date.now() && !TERMINAL.has(session.status)) {
      await this.prisma.checkoutSession.update({
        where: { id: checkoutId },
        data: { status: "EXPIRED" },
      });
      session.status = "EXPIRED";
    }

    const currencyCode = session.currencyCode;
    const items: CheckoutItemDto[] = session.items.map((item) => {
      const line = item.unitPriceMinor * BigInt(item.quantity);
      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: moneyFromBigInt(item.unitPriceMinor, item.currencyCode),
        lineTotal: moneyFromBigInt(line, item.currencyCode),
      };
    });

    let shippingOptions;
    const countryId =
      session.shippingAddress?.countryId ??
      (await resolveCountryId(this.prisma, opts?.countryCode));
    if (opts?.includeShippingOptions && countryId) {
      const options = await this.shipping.listOptions({
        countryId,
        currencyCode,
        subtotalMinor: session.subtotalMinor,
      });
      shippingOptions = options.map((o) => this.shipping.toDto(o));
    }

    const taxConfigured: boolean =
      opts?.taxConfigured ??
      (
        await this.tax.quote({
          countryId: countryId ?? null,
          regionId: session.shippingAddress?.regionId ?? null,
          taxableMinor: session.subtotalMinor,
          currencyCode,
        })
      ).configured;

    return {
      id: session.id,
      cartId: session.cartId,
      status: session.status,
      currencyCode,
      shippingAddressId: session.shippingAddressId,
      billingAddressId: session.billingAddressId,
      shippingMethodId: session.shippingMethodId,
      couponCode: session.couponCode,
      subtotal: moneyFromBigInt(session.subtotalMinor, currencyCode),
      discount: moneyFromBigInt(session.discountMinor, currencyCode),
      tax: moneyFromBigInt(session.taxMinor, currencyCode),
      shipping: moneyFromBigInt(session.shippingMinor, currencyCode),
      total: moneyFromBigInt(session.totalMinor, currencyCode),
      taxConfigured,
      paymentReady: session.status === "PAYMENT" && session.paymentStatus === "READY_FOR_PAYMENT",
      paymentStatus: session.paymentStatus,
      expiresAt: session.expiresAt.toISOString(),
      convertedOrderId: session.convertedOrderId,
      items,
      shippingOptions,
      warnings: opts?.warnings?.length ? opts.warnings : undefined,
    };
  }

  private async lockCartLines(
    cartId: string,
    currencyCode: string,
    countryCode?: string | null,
  ): Promise<LockedLine[]> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                prices: true,
              },
            },
          },
        },
      },
    });
    if (!cart) throw notFound("Cart not found");
    if (cart.items.length === 0) return [];

    const countryId = await resolveCountryId(this.prisma, countryCode);
    const locked: LockedLine[] = [];

    for (const item of cart.items) {
      const variant = item.variant;
      const productOk =
        !variant.product.deletedAt &&
        variant.product.status === "ACTIVE" &&
        variant.isActive &&
        !variant.deletedAt;
      if (!productOk) {
        throw validationError(`Cart contains unavailable variant ${variant.id}`);
      }

      const price = resolvePrice(variant.prices as PriceRow[], {
        currencyCode,
        countryId,
      });
      if (!price) {
        throw validationError(`No active price for variant ${variant.id} in ${currencyCode}`);
      }
      if (price.currencyCode !== currencyCode) {
        throw validationError("Currency mismatch");
      }

      locked.push({
        variantId: variant.id,
        quantity: item.quantity,
        unitPriceMinor: price.amountMinor,
        currencyCode: price.currencyCode,
        productId: variant.product.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        weightGrams: variant.weightGrams,
      });
    }

    return locked;
  }

  private async resolveOwnedCart(identity: CartIdentity, cartId?: string) {
    if (identity.kind === "customer") {
      const cart = await this.prisma.cart.findFirst({
        where: {
          status: "ACTIVE",
          userId: identity.userId,
          ...(cartId ? { id: cartId } : {}),
        },
        orderBy: { updatedAt: "desc" },
      });
      if (!cart) throw notFound("Cart not found");
      if (cartId && cart.id !== cartId) throw notFound("Cart not found");
      return cart;
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        status: "ACTIVE",
        guestToken: identity.guestToken,
        ...(cartId ? { id: cartId } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!cart) throw notFound("Cart not found");
    return cart;
  }

  private async requireOwnedSession(identity: CartIdentity, checkoutId: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: { cart: true },
    });
    if (!session) throw notFound("Checkout session not found");

    if (identity.kind === "customer") {
      if (session.userId && session.userId !== identity.userId) {
        throw notFound("Checkout session not found");
      }
      if (!session.userId && session.cart.userId !== identity.userId) {
        throw notFound("Checkout session not found");
      }
      return session;
    }

    if (session.cart.guestToken !== identity.guestToken) {
      throw notFound("Checkout session not found");
    }
    return session;
  }

  private async resolveAddressCountryId(countryId: string): Promise<string> {
    const resolved = await resolveCountryId(this.prisma, countryId);
    if (resolved) return resolved;

    const existing = await this.prisma.country.findFirst({
      where: { id: countryId, isActive: true },
      select: { id: true },
    });
    if (existing) return existing.id;

    throw validationError("Invalid country");
  }

  private async assertAddressAccess(
    identity: CartIdentity,
    addressId: string,
    session: { shippingAddressId: string | null; billingAddressId: string | null },
  ) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw notFound("Address not found");

    if (identity.kind === "customer") {
      if (address.userId !== identity.userId) {
        throw notFound("Address not found");
      }
      return address;
    }

    if (address.userId) {
      throw forbidden("Cannot use a customer address for guest checkout");
    }

    const attached =
      session.shippingAddressId === addressId || session.billingAddressId === addressId;
    if (!attached) {
      throw notFound("Address not found");
    }
    return address;
  }

  private assertMutable(session: { status: string; expiresAt: Date }) {
    if (TERMINAL.has(session.status) || session.status === "PAYMENT") {
      throw conflict(`Checkout session is ${session.status.toLowerCase()} and cannot be modified`);
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw conflict("Checkout session has expired");
    }
  }
}
