import { randomBytes } from "node:crypto";
import type {
  OrderDto,
  OrderSummaryDto,
  ShipmentDto,
  CancellationDto,
} from "@eckamcreation/api-contracts";
import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import { writeAuditLog } from "@eckamcreation/auth";
import {
  beginIdempotency,
  completeIdempotency,
} from "../idempotency";
import { conflict, notFound, validationError } from "../errors";
import { OrderInventoryService } from "./inventory-boundary";
import { OrderStateService } from "./order-state";
import { ShipmentStateService } from "./shipment-state";

type AddressSnap = {
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryId: string;
  regionId: string | null;
};

type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  staffUserId?: string | null;
};

function snapAddress(addr: {
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryId: string;
  regionId: string | null;
}): AddressSnap {
  return {
    fullName: addr.fullName,
    phone: addr.phone,
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    countryId: addr.countryId,
    regionId: addr.regionId,
  };
}

function parseSnap(value: unknown): AddressSnap | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.fullName !== "string" || typeof v.line1 !== "string") return null;
  return {
    fullName: v.fullName,
    phone: typeof v.phone === "string" ? v.phone : null,
    line1: v.line1,
    line2: typeof v.line2 === "string" ? v.line2 : null,
    city: typeof v.city === "string" ? v.city : "",
    state: typeof v.state === "string" ? v.state : null,
    postalCode: typeof v.postalCode === "string" ? v.postalCode : "",
    countryId: typeof v.countryId === "string" ? v.countryId : "",
    regionId: typeof v.regionId === "string" ? v.regionId : null,
  };
}

function newOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${ts}-${rand}`;
}

/**
 * Provider-neutral payment intent for a READY_FOR_PAYMENT checkout.
 * Does not call gateways and does not mark payment successful.
 */
export class CheckoutPaymentIntentService {
  constructor(private readonly prisma: PrismaClient) {}

  async createForCheckout(checkoutSessionId: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
    });
    if (!session) throw notFound("Checkout session not found");
    if (session.status !== "PAYMENT" || session.paymentStatus !== "READY_FOR_PAYMENT") {
      throw validationError("Checkout is not ready for payment");
    }
    if (session.convertedOrderId) {
      throw conflict("Checkout already converted to an order");
    }

    const existing = await this.prisma.paymentIntent.findUnique({
      where: { idempotencyKey: `checkout:${checkoutSessionId}` },
    });
    if (existing) return existing;

    return this.prisma.paymentIntent.create({
      data: {
        provider: "pending",
        amountMinor: session.totalMinor,
        currencyCode: session.currencyCode,
        status: "REQUIRES_PAYMENT",
        idempotencyKey: `checkout:${checkoutSessionId}`,
        metadata: {
          checkoutSessionId,
          purpose: "checkout",
        },
      },
    });
  }
}

export class OrderService {
  private readonly state = new OrderStateService();
  private readonly shipmentState = new ShipmentStateService();
  private readonly inventory = new OrderInventoryService();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create an order only after a verified SUCCEEDED PaymentIntent.
   * Idempotent on paymentIntentId / Idempotency-Key.
   */
  async createFromPaidCheckout(input: {
    paymentIntentId: string;
    idempotencyKey?: string;
  }): Promise<OrderDto> {
    let idemRecordId: string | null = null;
    if (input.idempotencyKey) {
      const begun = await beginIdempotency(this.prisma, {
        scope: "order.createFromPaidCheckout",
        key: input.idempotencyKey,
        requestHash: input.paymentIntentId,
      });
      if (begun.replay) {
        const intent = await this.prisma.paymentIntent.findUnique({
          where: { id: input.paymentIntentId },
        });
        if (intent?.orderId) return this.toDto(intent.orderId);
        throw conflict("Idempotent order create already processed without order link");
      }
      idemRecordId = begun.recordId;
    }

    try {
      const orderId = await this.prisma.$transaction(async (tx) => {
        const intent = await tx.paymentIntent.findUnique({
          where: { id: input.paymentIntentId },
        });
        if (!intent) throw notFound("Payment intent not found");

        if (intent.orderId) {
          return intent.orderId;
        }

        if (intent.status !== "SUCCEEDED") {
          throw validationError(
            "Payment intent is not SUCCEEDED; order creation requires verified payment success",
          );
        }

        const meta = (intent.metadata ?? {}) as Record<string, unknown>;
        const checkoutSessionId =
          typeof meta.checkoutSessionId === "string" ? meta.checkoutSessionId : null;
        if (!checkoutSessionId) {
          throw validationError("Payment intent is not linked to a checkout session");
        }

        const session = await tx.checkoutSession.findUnique({
          where: { id: checkoutSessionId },
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
            shippingAddress: true,
            billingAddress: true,
            cart: true,
          },
        });
        if (!session) throw notFound("Checkout session not found");
        if (session.convertedOrderId) {
          await tx.paymentIntent.update({
            where: { id: intent.id },
            data: { orderId: session.convertedOrderId },
          });
          return session.convertedOrderId;
        }
        if (session.status !== "PAYMENT") {
          throw validationError("Checkout session is not in PAYMENT state");
        }
        if (session.currencyCode !== intent.currencyCode) {
          throw validationError("Payment currency mismatch");
        }
        if (session.totalMinor !== intent.amountMinor) {
          throw validationError("Payment amount mismatch");
        }
        if (session.items.length === 0) {
          throw validationError("Checkout has no items");
        }

        const shippingSnap = session.shippingAddress
          ? snapAddress(session.shippingAddress)
          : null;
        const billingSnap = session.billingAddress
          ? snapAddress(session.billingAddress)
          : shippingSnap;

        const itemCount = session.items.reduce((n, i) => n + i.quantity, 0);
        const discountPerUnit =
          itemCount > 0 ? session.discountMinor / BigInt(itemCount) : BigInt(0);
        const taxPerUnit = itemCount > 0 ? session.taxMinor / BigInt(itemCount) : BigInt(0);

        let allocatedDiscount = BigInt(0);
        let allocatedTax = BigInt(0);

        const lineData = session.items.map((item, index) => {
          const isLast = index === session.items.length - 1;
          let lineDiscount = discountPerUnit * BigInt(item.quantity);
          let lineTax = taxPerUnit * BigInt(item.quantity);
          if (isLast) {
            lineDiscount = session.discountMinor - allocatedDiscount;
            lineTax = session.taxMinor - allocatedTax;
          } else {
            allocatedDiscount += lineDiscount;
            allocatedTax += lineTax;
          }
          const lineTotal =
            item.unitPriceMinor * BigInt(item.quantity) - lineDiscount + lineTax;
          return {
            variantId: item.variantId,
            productIdSnap: item.variant.product.id,
            productNameSnap: item.variant.product.name,
            variantNameSnap: item.variant.name,
            skuSnap: item.variant.sku,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            discountMinor: lineDiscount < BigInt(0) ? BigInt(0) : lineDiscount,
            taxMinor: lineTax < BigInt(0) ? BigInt(0) : lineTax,
            totalMinor: lineTotal < BigInt(0) ? BigInt(0) : lineTotal,
            currencyCode: item.currencyCode,
          };
        });

        const order = await tx.order.create({
          data: {
            number: newOrderNumber(),
            userId: session.userId,
            status: "PAID",
            currencyCode: session.currencyCode,
            shippingAddressId: session.shippingAddressId,
            billingAddressId: session.billingAddressId ?? session.shippingAddressId,
            shippingAddressSnap: shippingSnap ?? undefined,
            billingAddressSnap: billingSnap ?? undefined,
            subtotalMinor: session.subtotalMinor,
            discountMinor: session.discountMinor,
            taxMinor: session.taxMinor,
            shippingMinor: session.shippingMinor,
            totalMinor: session.totalMinor,
            couponCode: session.couponCode,
            promotionId: session.promotionId,
            customerEmail: session.userId
              ? (
                  await tx.user.findUnique({
                    where: { id: session.userId },
                    select: { email: true },
                  })
                )?.email ?? null
              : null,
            items: { create: lineData },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: "PAID",
                note: "Created from verified payment",
              },
            },
          },
        });

        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: { orderId: order.id },
        });

        await tx.checkoutSession.update({
          where: { id: session.id },
          data: {
            status: "COMPLETED",
            convertedOrderId: order.id,
            paymentStatus: "PAID",
          },
        });

        await tx.cart.update({
          where: { id: session.cartId },
          data: { status: "CONVERTED" },
        });
        await tx.cartItem.deleteMany({ where: { cartId: session.cartId } });

        if (session.promotionId) {
          await tx.promotion.update({
            where: { id: session.promotionId },
            data: { usageCount: { increment: 1 } },
          });
          await tx.promotionUsage.create({
            data: {
              promotionId: session.promotionId,
              userId: session.userId,
              orderId: order.id,
            },
          });
        }

        await this.inventory.applySaleForOrder(tx, {
          orderId: order.id,
          lines: lineData.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        });

        return order.id;
      });

      if (idemRecordId) await completeIdempotency(this.prisma, idemRecordId, 201);
      return this.toDto(orderId);
    } catch (error) {
      if (idemRecordId) {
        try {
          await this.prisma.idempotencyRecord.delete({ where: { id: idemRecordId } });
        } catch {
          /* ignore */
        }
      }
      throw error;
    }
  }

  async getCustomerOrder(userId: string, idOrNumber: string): Promise<OrderDto> {
    const order = await this.findOwnedOrder(userId, idOrNumber);
    return this.toDto(order.id, { customerSafe: true });
  }

  async listCustomerOrders(
    userId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{ items: OrderSummaryDto[]; pagination: { nextCursor: string | null; hasMore: boolean } }> {
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    let cursorFilter: Prisma.OrderWhereInput = {};
    if (query.cursor) {
      try {
        const raw = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")) as {
          id?: string;
          placedAt?: string;
        };
        if (raw.id && raw.placedAt) {
          const placedAt = new Date(raw.placedAt);
          cursorFilter = {
            OR: [
              { placedAt: { lt: placedAt } },
              { placedAt, id: { lt: raw.id } },
            ],
          };
        }
      } catch {
        /* ignore bad cursor */
      }
    }

    const rows = await this.prisma.order.findMany({
      where: { userId, ...cursorFilter },
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
        nextCursor:
          hasMore && last
            ? Buffer.from(
                JSON.stringify({ id: last.id, placedAt: last.placedAt.toISOString() }),
                "utf8",
              ).toString("base64url")
            : null,
        hasMore,
      },
    };
  }

  async listAdminOrders(query: { cursor?: string; limit?: number; status?: string }) {
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const rows = await this.prisma.order.findMany({
      where: query.status ? { status: query.status as "PAID" } : {},
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { _count: { select: { items: true } } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        currencyCode: o.currencyCode,
        total: moneyFromBigInt(o.totalMinor, o.currencyCode),
        placedAt: o.placedAt.toISOString(),
        itemCount: o._count.items,
        userId: o.userId,
      })),
      pagination: {
        nextCursor: null as string | null,
        hasMore,
      },
    };
  }

  async getAdminOrder(idOrNumber: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { number: idOrNumber }] },
    });
    if (!order) throw notFound("Order not found");
    return this.toDto(order.id, { customerSafe: false });
  }

  async updateStatus(
    idOrNumber: string,
    toStatus: string,
    staffUserId: string,
    note?: string,
    audit?: AuditMeta,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { number: idOrNumber }] },
    });
    if (!order) throw notFound("Order not found");
    this.state.assertTransition(order.status, toStatus);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: toStatus as "PAID" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: toStatus as "PAID",
          note,
          staffUserId,
        },
      });
    });

    await writeAuditLog(this.prisma, {
      action: "order.status.update",
      entityType: "Order",
      entityId: order.id,
      staffUserId,
      metadata: { from: order.status, to: toStatus },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return this.toDto(order.id, { customerSafe: false });
  }

  async requestCancellation(
    userId: string,
    idOrNumber: string,
    reason?: string,
  ): Promise<CancellationDto> {
    const order = await this.findOwnedOrder(userId, idOrNumber);
    if (!this.state.canCancel(order.status)) {
      throw conflict("Order cannot be cancelled in its current status");
    }
    if (order.cancellation) {
      return {
        id: order.cancellation.id,
        orderId: order.id,
        reason: order.cancellation.reason,
        status: order.cancellation.status,
        createdAt: order.cancellation.createdAt.toISOString(),
      };
    }

    const row = await this.prisma.cancellation.create({
      data: {
        orderId: order.id,
        reason,
        status: "REQUESTED",
      },
    });
    // Does NOT auto-refund and does not change order to CANCELLED until staff approves
    return {
      id: row.id,
      orderId: order.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async approveCancellation(
    idOrNumber: string,
    staffUserId: string,
    audit?: AuditMeta,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { number: idOrNumber }] },
      include: { cancellation: true },
    });
    if (!order) throw notFound("Order not found");
    if (!order.cancellation) throw validationError("No cancellation request");
    this.state.assertTransition(order.status, "CANCELLED");

    await this.prisma.$transaction(async (tx) => {
      await tx.cancellation.update({
        where: { id: order.cancellation!.id },
        data: { status: "COMPLETED" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "CANCELLED",
          note: "Cancellation approved",
          staffUserId,
        },
      });
    });

    await writeAuditLog(this.prisma, {
      action: "order.cancellation.approve",
      entityType: "Order",
      entityId: order.id,
      staffUserId,
      metadata: { cancellationId: order.cancellation.id },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return this.toDto(order.id, { customerSafe: false });
  }

  async createShipment(
    orderIdOrNumber: string,
    input: { carrier?: string; trackingNumber?: string; shippingMethodId?: string },
    staffUserId: string,
    audit?: AuditMeta,
  ): Promise<ShipmentDto> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: orderIdOrNumber }, { number: orderIdOrNumber }] },
    });
    if (!order) throw notFound("Order not found");
    if (["CANCELLED", "REFUNDED"].includes(order.status)) {
      throw conflict("Cannot ship a cancelled/refunded order");
    }
    if (["PENDING_PAYMENT"].includes(order.status)) {
      throw conflict("Cannot ship an unpaid order");
    }

    const shipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          shippingMethodId: input.shippingMethodId,
          status: "PENDING",
          events: {
            create: {
              status: "PENDING",
              description: "Shipment created",
              occurredAt: new Date(),
            },
          },
        },
      });

      if (order.status === "PAID") {
        await tx.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: "PAID",
            toStatus: "PROCESSING",
            note: "Shipment created",
            staffUserId,
          },
        });
      }
      return created;
    });

    await writeAuditLog(this.prisma, {
      action: "shipment.create",
      entityType: "Shipment",
      entityId: shipment.id,
      staffUserId,
      metadata: { orderId: order.id },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return this.toShipmentDto(shipment.id);
  }

  async updateShipmentStatus(
    shipmentId: string,
    input: {
      status: string;
      description?: string;
      location?: string;
      trackingNumber?: string;
      occurredAt?: string;
    },
    staffUserId: string,
    audit?: AuditMeta,
  ): Promise<ShipmentDto> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw notFound("Shipment not found");
    this.shipmentState.assertTransition(shipment.status, input.status);

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status: input.status as "PENDING",
          description: input.description,
          location: input.location,
          occurredAt,
        },
      });

      const data: Prisma.ShipmentUpdateInput = {
        status: input.status as "PENDING",
      };
      if (input.trackingNumber) data.trackingNumber = input.trackingNumber;
      if (input.status === "IN_TRANSIT" || input.status === "OUT_FOR_DELIVERY") {
        data.shippedAt = shipment.shippedAt ?? occurredAt;
      }
      if (input.status === "DELIVERED") {
        data.deliveredAt = occurredAt;
        data.shippedAt = shipment.shippedAt ?? occurredAt;
      }
      await tx.shipment.update({ where: { id: shipmentId }, data });

      if (input.status === "DELIVERED") {
        const order = await tx.order.findUnique({ where: { id: shipment.orderId } });
        if (order && !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)) {
          const next =
            order.status === "PARTIALLY_SHIPPED" || order.status === "SHIPPED"
              ? "DELIVERED"
              : "SHIPPED";
          if (next === "SHIPPED" && order.status !== "SHIPPED") {
            this.state.assertTransition(order.status, "SHIPPED");
            await tx.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: order.status,
                toStatus: "SHIPPED",
                staffUserId,
                note: "Shipment in progress / delivered path",
              },
            });
          }
          if (input.status === "DELIVERED") {
            const refreshed = await tx.order.findUnique({ where: { id: shipment.orderId } });
            if (refreshed && refreshed.status !== "DELIVERED") {
              this.state.assertTransition(refreshed.status, "DELIVERED");
              await tx.order.update({ where: { id: refreshed.id }, data: { status: "DELIVERED" } });
              await tx.orderStatusHistory.create({
                data: {
                  orderId: refreshed.id,
                  fromStatus: refreshed.status,
                  toStatus: "DELIVERED",
                  staffUserId,
                  note: "All tracked shipments delivered",
                },
              });
            }
          }
        }
      } else if (input.status === "IN_TRANSIT" || input.status === "OUT_FOR_DELIVERY") {
        const order = await tx.order.findUnique({ where: { id: shipment.orderId } });
        if (order && ["PAID", "PROCESSING"].includes(order.status)) {
          this.state.assertTransition(order.status, "SHIPPED");
          await tx.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: "SHIPPED",
              staffUserId,
              note: "Shipment in transit",
            },
          });
        }
      }
    });

    await writeAuditLog(this.prisma, {
      action: "shipment.status.update",
      entityType: "Shipment",
      entityId: shipmentId,
      staffUserId,
      metadata: { from: shipment.status, to: input.status },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
    });

    return this.toShipmentDto(shipmentId);
  }

  async listShipmentsForOrder(
    orderId: string,
    opts?: { userId?: string },
  ): Promise<ShipmentDto[]> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { number: orderId }],
        ...(opts?.userId ? { userId: opts.userId } : {}),
      },
    });
    if (!order) throw notFound("Order not found");
    const rows = await this.prisma.shipment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(rows.map((r) => this.toShipmentDto(r.id)));
  }

  private async findOwnedOrder(userId: string, idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        OR: [{ id: idOrNumber }, { number: idOrNumber }],
      },
      include: { cancellation: true },
    });
    if (!order) throw notFound("Order not found");
    return order;
  }

  async toDto(orderId: string, opts?: { customerSafe?: boolean }): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        paymentIntents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) throw notFound("Order not found");

    const payment = order.paymentIntents[0];
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      currencyCode: order.currencyCode,
      subtotal: moneyFromBigInt(order.subtotalMinor, order.currencyCode),
      discount: moneyFromBigInt(order.discountMinor, order.currencyCode),
      tax: moneyFromBigInt(order.taxMinor, order.currencyCode),
      shipping: moneyFromBigInt(order.shippingMinor, order.currencyCode),
      total: moneyFromBigInt(order.totalMinor, order.currencyCode),
      placedAt: order.placedAt.toISOString(),
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: parseSnap(order.shippingAddressSnap),
      billingAddress: parseSnap(order.billingAddressSnap),
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productId: item.productIdSnap,
        sku: item.skuSnap,
        productName: item.productNameSnap,
        variantName: item.variantNameSnap,
        quantity: item.quantity,
        unitPrice: moneyFromBigInt(item.unitPriceMinor, item.currencyCode),
        tax: moneyFromBigInt(item.taxMinor, item.currencyCode),
        discount: moneyFromBigInt(item.discountMinor, item.currencyCode),
        total: moneyFromBigInt(item.totalMinor, item.currencyCode),
      })),
      paymentIntentId: opts?.customerSafe ? undefined : payment?.id ?? null,
      paymentStatus: payment?.status ?? null,
    };
  }

  private async toShipmentDto(shipmentId: string): Promise<ShipmentDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { events: { orderBy: { occurredAt: "asc" } } },
    });
    if (!shipment) throw notFound("Shipment not found");
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      events: shipment.events.map((e) => ({
        id: e.id,
        status: e.status,
        description: e.description,
        location: e.location,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  }
}
