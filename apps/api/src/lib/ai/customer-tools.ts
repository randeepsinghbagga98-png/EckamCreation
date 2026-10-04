import {
  AiToolInvalidArgumentsError,
  type AiTool,
  type AiToolContext,
  type AiToolResult,
} from "@eckamcreation/ai";
import type { OrderDto, OrderSummaryDto, ShipmentDto } from "@eckamcreation/api-contracts";
import { z } from "zod";
import { ApiError } from "../errors";
import type { CustomerService } from "../customer/customer-service";
import type { OrderService } from "../orders/order-service";

export const CUSTOMER_GET_PROFILE = "customer.get_profile";
export const CUSTOMER_GET_RECENT_ORDERS = "customer.get_recent_orders";
export const CUSTOMER_GET_ORDER = "customer.get_order";
export const CUSTOMER_GET_ORDER_STATUS = "customer.get_order_status";
export const CUSTOMER_GET_ORDER_TRACKING = "customer.get_order_tracking";
export const CUSTOMER_CANCEL_ORDER = "customer.cancel_order";

const RECENT_ORDERS_MAX = 5;

const emptySchema = z.object({}).strict();

const recentOrdersSchema = z
  .object({
    limit: z.number().int().min(1).max(RECENT_ORDERS_MAX).optional(),
  })
  .strict();

const orderNumberSchema = z
  .object({
    orderNumber: z.string().trim().min(1).max(80),
  })
  .strict();

type ToolFailure = {
  ok: false;
  error: { code: string; message: string };
  data?: unknown;
};

export type CustomerToolDeps = {
  customers: CustomerService;
  orders: OrderService;
};

export function createCustomerAiTools(deps: CustomerToolDeps): AiTool[] {
  return [
    createGetProfileTool(deps),
    createGetRecentOrdersTool(deps),
    createGetOrderTool(deps),
    createGetOrderStatusTool(deps),
    createGetOrderTrackingTool(deps),
    createCancelOrderTool(deps),
  ];
}

function createGetProfileTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_GET_PROFILE,
    description:
      "Return the authenticated customer's safe account profile. Never accept a customer or user id from the model.",
    async execute(args, context): Promise<AiToolResult> {
      parseArgs(emptySchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        const profile = await deps.customers.getOrCreateProfile(auth.userId);
        return {
          ok: true,
          data: {
            kind: "profile",
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            locale: profile.locale,
            defaultCurrencyCode: profile.defaultCurrencyCode,
            emailVerified: profile.emailVerified,
          },
        };
      } catch (error) {
        return mapCustomerError(error, "I couldn't load your account details.");
      }
    },
  };
}

function createGetRecentOrdersTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_GET_RECENT_ORDERS,
    description:
      "List a small number of the authenticated customer's recent orders. Never accept a customer id from the model.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(recentOrdersSchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        const result = await deps.orders.listCustomerOrders(auth.userId, {
          limit: input.limit ?? RECENT_ORDERS_MAX,
        });
        return {
          ok: true,
          data: {
            kind: "order_list",
            orders: result.items.map(toSafeOrderSummary),
          },
        };
      } catch (error) {
        return mapCustomerError(error, "I couldn't load your recent orders.");
      }
    },
  };
}

function createGetOrderTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_GET_ORDER,
    description:
      "Get one of the authenticated customer's orders by customer-facing order number. Never invent an order.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(orderNumberSchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        const order = await deps.orders.getCustomerOrder(auth.userId, input.orderNumber);
        return {
          ok: true,
          data: {
            kind: "order_detail",
            order: toSafeOrderDetail(order),
          },
        };
      } catch (error) {
        return mapCustomerError(error, "I couldn't find that order.");
      }
    },
  };
}

function createGetOrderStatusTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_GET_ORDER_STATUS,
    description:
      "Return the actual current status of one of the authenticated customer's orders. Do not infer status.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(orderNumberSchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        const order = await deps.orders.getCustomerOrder(auth.userId, input.orderNumber);
        return {
          ok: true,
          data: {
            kind: "order_status",
            success: true,
            order: toSafeOrderSummaryFromDetail(order),
            orderNumber: order.number,
            status: order.status,
            createdAt: order.placedAt,
            paymentStatus: order.paymentStatus ?? null,
          },
        };
      } catch (error) {
        return mapCustomerError(error, "I couldn't find that order.");
      }
    },
  };
}

function createGetOrderTrackingTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_GET_ORDER_TRACKING,
    description:
      "Return customer-visible shipment tracking for an owned order when the commerce system has it. Never invent tracking.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(orderNumberSchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        await deps.orders.getCustomerOrder(auth.userId, input.orderNumber);
        const shipments = await deps.orders.listShipmentsForOrder(input.orderNumber, {
          userId: auth.userId,
        });
        const visible = shipments.map(toSafeShipment).filter(hasVisibleTracking);
        if (visible.length === 0) {
          return fail(
            "AI_TRACKING_NOT_AVAILABLE",
            "Tracking information isn't available for this order yet.",
          );
        }
        return {
          ok: true,
          data: {
            kind: "order_track",
            success: true,
            orderNumber: input.orderNumber,
            href: orderHref(input.orderNumber),
            shipments: visible,
            tracking: visible[0],
          },
        };
      } catch (error) {
        return mapCustomerError(error, "I couldn't find that order.");
      }
    },
  };
}

function createCancelOrderTool(deps: CustomerToolDeps): AiTool {
  return {
    name: CUSTOMER_CANCEL_ORDER,
    description:
      "Request cancellation of one of the authenticated customer's orders. Call only after an explicit cancel request for a specific order. The commerce system decides eligibility.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(orderNumberSchema, args);
      const auth = requireCustomer(context);
      if (!auth.ok) {
        return auth;
      }

      try {
        const cancellation = await deps.orders.requestCancellation(
          auth.userId,
          input.orderNumber,
        );
        const requested = cancellation.status === "REQUESTED";
        return {
          ok: true,
          data: {
            kind: "order_cancel",
            success: true,
            orderNumber: input.orderNumber,
            status: cancellation.status,
            href: orderHref(input.orderNumber),
            message: requested
              ? `I've submitted a cancellation request for order #${input.orderNumber}.`
              : `Order #${input.orderNumber} has been cancelled.`,
          },
        };
      } catch (error) {
        return mapCustomerError(error, "This order can no longer be cancelled.");
      }
    },
  };
}

function requireCustomer(context: AiToolContext): { ok: true; userId: string } | ToolFailure {
  if (!context.userId) {
    return fail("AI_CUSTOMER_AUTH_REQUIRED", "Sign in to continue with Eckam AI.");
  }
  return { ok: true, userId: context.userId };
}

function toSafeOrderSummary(order: OrderSummaryDto) {
  return {
    orderNumber: order.number,
    status: order.status,
    createdAt: order.placedAt,
    total: order.total,
    currency: order.currencyCode,
    itemCount: order.itemCount,
    href: orderHref(order.number),
  };
}

function toSafeOrderDetail(order: OrderDto) {
  return {
    ...toSafeOrderSummaryFromDetail(order),
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      variantName: item.variantName,
    })),
    paymentStatus: order.paymentStatus ?? null,
  };
}

function toSafeOrderSummaryFromDetail(order: OrderDto) {
  return {
    orderNumber: order.number,
    status: order.status,
    createdAt: order.placedAt,
    total: order.total,
    currency: order.currencyCode,
    itemCount: order.items.length,
    href: orderHref(order.number),
  };
}

function orderHref(orderNumber: string): string {
  return `/account/orders/${encodeURIComponent(orderNumber)}`;
}

function toSafeShipment(shipment: ShipmentDto) {
  return {
    status: shipment.status,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    events: (shipment.events ?? []).map((event) => ({
      status: event.status,
      description: event.description,
      location: event.location,
      occurredAt: event.occurredAt,
    })),
  };
}

function hasVisibleTracking(shipment: ReturnType<typeof toSafeShipment>): boolean {
  return Boolean(
    shipment.carrier ||
      shipment.trackingNumber ||
      shipment.shippedAt ||
      shipment.deliveredAt ||
      shipment.events.length > 0,
  );
}

function mapCustomerError(error: unknown, fallback: string): ToolFailure {
  if (error instanceof ApiError) {
    if (error.code === "NOT_FOUND") {
      return fail("AI_ORDER_NOT_FOUND", "I couldn't find that order.");
    }
    if (error.code === "UNAUTHORIZED") {
      return fail("AI_CUSTOMER_AUTH_REQUIRED", "Sign in to continue with Eckam AI.");
    }
    if (error.code === "CONFLICT") {
      return fail("AI_ORDER_NOT_CANCELLABLE", "This order can no longer be cancelled.");
    }
    if (error.code === "FORBIDDEN") {
      return fail("AI_ORDER_NOT_FOUND", "I couldn't find that order.");
    }
  }
  return fail("AI_CUSTOMER_ACTION_FAILED", fallback);
}

function parseArgs<T>(schema: z.ZodType<T>, args: Record<string, unknown>): T {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new AiToolInvalidArgumentsError();
  }
  return parsed.data;
}

function fail(code: string, message: string): ToolFailure {
  return { ok: false, error: { code, message } };
}
