import "./lib/preload-env";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AiProviderRegistry,
  AiToolRegistry,
  DevelopmentAiProvider,
  createEckamAiService,
} from "@eckamcreation/ai";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as createConversation } from "./app/v1/ai/conversations/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { getCustomerService, resetCustomerServices } from "./lib/customer";
import { getOrderService, resetOrderServices } from "./lib/orders";
import { getDevelopmentAiProvider, resetAiServices } from "./lib/ai";
import {
  CUSTOMER_CANCEL_ORDER,
  CUSTOMER_GET_ORDER,
  CUSTOMER_GET_ORDER_STATUS,
  CUSTOMER_GET_ORDER_TRACKING,
  CUSTOMER_GET_PROFILE,
  CUSTOMER_GET_RECENT_ORDERS,
  createCustomerAiTools,
} from "./lib/ai/customer-tools";
import { createAuthRateLimiter } from "./lib/auth/rate-limit-auth";
import { setRateLimiter } from "./lib/rate-limit";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

function cookieFrom(response: Response, name: string): string {
  const headers = response.headers.getSetCookie?.() ?? [];
  for (const row of headers) {
    if (row.startsWith(`${name}=`)) return row.split(";")[0]!.slice(name.length + 1);
  }
  const single = response.headers.get("set-cookie") ?? "";
  const match = single.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? "";
}

function customerTools() {
  return createCustomerAiTools({
    customers: getCustomerService(),
    orders: getOrderService(),
  });
}

function byName(name: string) {
  return customerTools().find((tool) => tool.name === name)!;
}

function assertNoSecrets(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(
    /password|passwordHash|sessionToken|cookie|AI_API_KEY|prisma|stack/i,
  );
}

describe("AI customer tools (no database)", () => {
  it("rejects model-supplied identity fields and dangerous arguments", async () => {
    const tool = byName(CUSTOMER_GET_RECENT_ORDERS);
    await expect(
      tool.execute({ userId: "someone-else" }, { conversationId: "c1", userId: "u1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
    await expect(
      tool.execute({ customerId: "cust_1" }, { conversationId: "c1", userId: "u1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
    await expect(
      byName(CUSTOMER_GET_ORDER).execute(
        { orderNumber: "ECK-1", accountId: "acc_1" },
        { conversationId: "c1", userId: "u1" },
      ),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
    await expect(
      byName(CUSTOMER_GET_PROFILE).execute({ sql: "select 1" }, { conversationId: "c1", userId: "u1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
  });

  it("requires authentication for profile and order tools", async () => {
    const profile = await byName(CUSTOMER_GET_PROFILE).execute({}, { conversationId: "c1" });
    expect(profile.ok).toBe(false);
    expect(profile.error?.code).toBe("AI_CUSTOMER_AUTH_REQUIRED");

    const orders = await byName(CUSTOMER_GET_RECENT_ORDERS).execute({}, { conversationId: "c1" });
    expect(orders.ok).toBe(false);
    expect(orders.error?.code).toBe("AI_CUSTOMER_AUTH_REQUIRED");
  });

  it("does not register refund, payment, or order-creation tools", () => {
    const names = customerTools().map((tool) => tool.name);
    expect(names).toEqual([
      CUSTOMER_GET_PROFILE,
      CUSTOMER_GET_RECENT_ORDERS,
      CUSTOMER_GET_ORDER,
      CUSTOMER_GET_ORDER_STATUS,
      CUSTOMER_GET_ORDER_TRACKING,
      CUSTOMER_CANCEL_ORDER,
    ]);
    expect(names).not.toContain("customer.request_refund");
    expect(names).not.toContain("customer.refund_order");
    expect(names).not.toContain("customer.issue_refund");
    expect(names).not.toContain("customer.create_order");
    expect(names).not.toContain("customer.pay_order");
    expect(names).not.toContain("customer.mark_paid");
  });

  it("does not execute arbitrary tools", async () => {
    const registry = new AiToolRegistry();
    for (const tool of customerTools()) {
      registry.register(tool);
    }
    await expect(
      registry.execute("http.request", { href: "https://example.com" }, { conversationId: "c1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_NOT_FOUND" });
  });
});

describeDb("AI customer order tools", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `ai_ord_a_${suffix}@example.com`;
  const emailB = `ai_ord_b_${suffix}@example.com`;
  const emailEmpty = `ai_ord_empty_${suffix}@example.com`;
  const contextA = { conversationId: `conv_ord_a_${suffix}`, userId: "" };
  const contextB = { conversationId: `conv_ord_b_${suffix}`, userId: "" };
  const contextEmpty = { conversationId: `conv_ord_empty_${suffix}`, userId: "" };
  let cookieA = "";
  let userIdA = "";
  let userIdB = "";
  let userIdEmpty = "";
  let paidNumber = "";
  let shippedNumber = "";
  let otherNumber = "";
  let conversationId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCustomerServices();
    resetOrderServices();
    resetAiServices();
    setRateLimiter(createAuthRateLimiter());

    await prisma.currency.upsert({
      where: { code: "INR" },
      create: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
      update: {},
    });

    const [regA, regB, regEmpty] = await Promise.all([
      register(
        new Request("http://localhost:3002/v1/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailA, password: "Secret123", name: "AI Order A" }),
        }),
      ),
      register(
        new Request("http://localhost:3002/v1/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailB, password: "Secret123", name: "AI Order B" }),
        }),
      ),
      register(
        new Request("http://localhost:3002/v1/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailEmpty, password: "Secret123", name: "AI Order Empty" }),
        }),
      ),
    ]);
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    expect(regEmpty.status).toBe(201);
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);

    const [userA, userB, userEmpty] = await Promise.all([
      prisma.user.findFirst({ where: { email: emailA } }),
      prisma.user.findFirst({ where: { email: emailB } }),
      prisma.user.findFirst({ where: { email: emailEmpty } }),
    ]);
    userIdA = userA!.id;
    userIdB = userB!.id;
    userIdEmpty = userEmpty!.id;
    contextA.userId = userIdA;
    contextB.userId = userIdB;
    contextEmpty.userId = userIdEmpty;

    paidNumber = `ECK-AI-PAID-${suffix}`;
    shippedNumber = `ECK-AI-SHIP-${suffix}`;
    otherNumber = `ECK-AI-OTH-${suffix}`;

    await prisma.order.create({
      data: {
        number: paidNumber,
        userId: userIdA,
        status: "PAID",
        currencyCode: "INR",
        subtotalMinor: 199900n,
        totalMinor: 199900n,
        customerEmail: emailA,
        items: {
          create: {
            productNameSnap: "Cream Structured Tote",
            skuSnap: `AI-ORD-PAID-${suffix}`,
            quantity: 1,
            unitPriceMinor: 199900n,
            totalMinor: 199900n,
            currencyCode: "INR",
          },
        },
      },
    });

    const shipped = await prisma.order.create({
      data: {
        number: shippedNumber,
        userId: userIdA,
        status: "SHIPPED",
        currencyCode: "INR",
        subtotalMinor: 89000n,
        totalMinor: 89000n,
        customerEmail: emailA,
        items: {
          create: {
            productNameSnap: "Noir Compact Bag",
            skuSnap: `AI-ORD-SHIP-${suffix}`,
            quantity: 1,
            unitPriceMinor: 89000n,
            totalMinor: 89000n,
            currencyCode: "INR",
          },
        },
      },
    });

    await prisma.shipment.create({
      data: {
        orderId: shipped.id,
        status: "IN_TRANSIT",
        carrier: "Delhivery",
        trackingNumber: `TRK-${suffix}`,
        shippedAt: new Date("2026-10-01T10:00:00.000Z"),
        events: {
          create: {
            status: "IN_TRANSIT",
            description: "Left the origin facility",
            location: "Mumbai",
            occurredAt: new Date("2026-10-01T12:00:00.000Z"),
          },
        },
      },
    });

    await prisma.order.create({
      data: {
        number: otherNumber,
        userId: userIdB,
        status: "PAID",
        currencyCode: "INR",
        subtotalMinor: 50000n,
        totalMinor: 50000n,
        customerEmail: emailB,
        items: {
          create: {
            productNameSnap: "Other Customer Item",
            skuSnap: `AI-ORD-OTH-${suffix}`,
            quantity: 1,
            unitPriceMinor: 50000n,
            totalMinor: 50000n,
            currencyCode: "INR",
          },
        },
      },
    });
  });

  afterAll(async () => {
    const orders = await prisma.order.findMany({ where: { number: { contains: suffix } } });
    const orderIds = orders.map((order) => order.id);
    if (orderIds.length > 0) {
      await prisma.shipmentEvent.deleteMany({ where: { shipment: { orderId: { in: orderIds } } } });
      await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.cancellation.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (conversationId) {
      await prisma.aiToolCall.deleteMany({ where: { conversationId } }).catch(() => undefined);
      await prisma.aiMessage.deleteMany({ where: { conversationId } }).catch(() => undefined);
      await prisma.aiConversation.deleteMany({ where: { id: conversationId } }).catch(() => undefined);
    }
    resetAiServices();
    resetOrderServices();
    resetCustomerServices();
  });

  it("returns an authenticated profile without secrets", async () => {
    const result = await byName(CUSTOMER_GET_PROFILE).execute({}, contextA);
    expect(result.ok).toBe(true);
    const data = result.data as { name: string | null; email: string | null };
    expect(data.email).toBe(emailA);
    expect(data.name).toBe("AI Order A");
    expect(JSON.stringify(result.data)).not.toContain("password");
    expect(JSON.stringify(result.data)).not.toContain(userIdA);
    expect(JSON.stringify(result.data)).not.toMatch(/session|token|cookie/i);
    assertNoSecrets(result);
  });

  it("returns real recent orders and an empty history", async () => {
    const recent = await byName(CUSTOMER_GET_RECENT_ORDERS).execute({}, contextA);
    expect(recent.ok).toBe(true);
    const orders = (recent.data as { orders: Array<{ orderNumber: string; status: string }> }).orders;
    expect(orders.some((order) => order.orderNumber === paidNumber)).toBe(true);
    expect(orders.some((order) => order.orderNumber === otherNumber)).toBe(false);
    expect(JSON.stringify(recent.data)).not.toContain("userId");
    assertNoSecrets(recent);

    const empty = await byName(CUSTOMER_GET_RECENT_ORDERS).execute({}, contextEmpty);
    expect(empty.ok).toBe(true);
    expect((empty.data as { orders: unknown[] }).orders).toEqual([]);
  });

  it("looks up a real order and rejects missing or foreign orders", async () => {
    const found = await byName(CUSTOMER_GET_ORDER).execute({ orderNumber: paidNumber }, contextA);
    expect(found.ok).toBe(true);
    const order = (found.data as { order: { orderNumber: string; items: Array<{ productName: string }> } }).order;
    expect(order.orderNumber).toBe(paidNumber);
    expect(order.items[0]?.productName).toBe("Cream Structured Tote");
    expect(JSON.stringify(found.data)).not.toContain("deliveryDate");
    assertNoSecrets(found);

    const missing = await byName(CUSTOMER_GET_ORDER).execute({ orderNumber: "ECK-MISSING" }, contextA);
    expect(missing.ok).toBe(false);
    expect(missing.error?.code).toBe("AI_ORDER_NOT_FOUND");
    assertNoSecrets(missing);

    const foreign = await byName(CUSTOMER_GET_ORDER).execute({ orderNumber: otherNumber }, contextA);
    expect(foreign.ok).toBe(false);
    expect(foreign.error?.code).toBe("AI_ORDER_NOT_FOUND");
    expect(JSON.stringify(foreign)).not.toContain("Other Customer Item");
  });

  it("returns the actual database order status without inventing delivery dates", async () => {
    const result = await byName(CUSTOMER_GET_ORDER_STATUS).execute(
      { orderNumber: paidNumber },
      contextA,
    );
    expect(result.ok).toBe(true);
    const data = result.data as { status: string; createdAt: string };
    const row = await prisma.order.findUnique({ where: { number: paidNumber } });
    expect(data.status).toBe(row?.status);
    expect(data.status).toBe("PAID");
    expect(JSON.stringify(result.data)).not.toMatch(/out for delivery|eta|deliveryDate/i);
    assertNoSecrets(result);
  });

  it("returns real tracking only when shipment data exists", async () => {
    const tracked = await byName(CUSTOMER_GET_ORDER_TRACKING).execute(
      { orderNumber: shippedNumber },
      contextA,
    );
    expect(tracked.ok).toBe(true);
    const data = tracked.data as {
      tracking: { carrier: string | null; trackingNumber: string | null };
    };
    expect(data.tracking.carrier).toBe("Delhivery");
    expect(data.tracking.trackingNumber).toBe(`TRK-${suffix}`);
    assertNoSecrets(tracked);

    const unavailable = await byName(CUSTOMER_GET_ORDER_TRACKING).execute(
      { orderNumber: paidNumber },
      contextA,
    );
    expect(unavailable.ok).toBe(false);
    expect(unavailable.error?.code).toBe("AI_TRACKING_NOT_AVAILABLE");
    expect(unavailable.error?.message).toMatch(/isn't available/i);
  });

  it("cancels an eligible owned order and rejects ineligible or foreign orders", async () => {
    const cancelled = await byName(CUSTOMER_CANCEL_ORDER).execute(
      { orderNumber: paidNumber },
      contextA,
    );
    expect(cancelled.ok).toBe(true);
    const data = cancelled.data as { status: string; orderNumber: string };
    expect(data.orderNumber).toBe(paidNumber);
    expect(data.status).toBe("REQUESTED");
    const row = await prisma.cancellation.findFirst({
      where: { order: { number: paidNumber } },
    });
    expect(row?.status).toBe("REQUESTED");

    const replay = await byName(CUSTOMER_CANCEL_ORDER).execute(
      { orderNumber: paidNumber },
      contextA,
    );
    expect(replay.ok).toBe(true);

    const shipped = await byName(CUSTOMER_CANCEL_ORDER).execute(
      { orderNumber: shippedNumber },
      contextA,
    );
    expect(shipped.ok).toBe(false);
    expect(shipped.error?.code).toBe("AI_ORDER_NOT_CANCELLABLE");

    const foreign = await byName(CUSTOMER_CANCEL_ORDER).execute(
      { orderNumber: otherNumber },
      contextA,
    );
    expect(foreign.ok).toBe(false);
    expect(foreign.error?.code).toBe("AI_ORDER_NOT_FOUND");
    const other = await prisma.cancellation.findFirst({
      where: { order: { number: otherNumber } },
    });
    expect(other).toBeNull();
    assertNoSecrets(cancelled);
  });

  it("does not cancel during a non-cancellation conversation", async () => {
    const before = await prisma.cancellation.count({
      where: { order: { number: shippedNumber } },
    });
    const provider = getDevelopmentAiProvider() ?? new DevelopmentAiProvider();
    const registry = new AiProviderRegistry();
    registry.register(provider);
    const tools = new AiToolRegistry();
    for (const tool of customerTools()) tools.register(tool);
    const service = createEckamAiService(registry, null, tools);
    await service.completeTurn({
      conversationId: `conv_no_cancel_${suffix}`,
      userId: userIdA,
      messages: [{ role: "user", content: "I don't want that order anymore." }],
    });
    const after = await prisma.cancellation.count({
      where: { order: { number: shippedNumber } },
    });
    expect(after).toBe(before);
  });

  it("cancels only when the explicit cancel tool is executed", async () => {
    const extraNumber = `ECK-AI-EXP-${suffix}`;
    await prisma.order.create({
      data: {
        number: extraNumber,
        userId: userIdA,
        status: "PROCESSING",
        currencyCode: "INR",
        subtotalMinor: 12000n,
        totalMinor: 12000n,
        customerEmail: emailA,
        items: {
          create: {
            productNameSnap: "Kitchen Vessel",
            skuSnap: `AI-ORD-EXP-${suffix}`,
            quantity: 1,
            unitPriceMinor: 12000n,
            totalMinor: 12000n,
            currencyCode: "INR",
          },
        },
      },
    });

    const provider = new DevelopmentAiProvider();
    provider.queueToolCalls([
      { toolName: CUSTOMER_CANCEL_ORDER, arguments: { orderNumber: extraNumber } },
    ]);
    const registry = new AiProviderRegistry();
    registry.register(provider);
    const tools = new AiToolRegistry();
    for (const tool of customerTools()) tools.register(tool);
    const service = createEckamAiService(registry, null, tools);
    const result = await service.completeTurn({
      conversationId: `conv_explicit_cancel_${suffix}`,
      userId: userIdA,
      messages: [{ role: "user", content: `Cancel order ${extraNumber}.` }],
    });
    expect(result.toolCalls[0]?.status).toBe("success");
    const row = await prisma.cancellation.findFirst({
      where: { order: { number: extraNumber } },
    });
    expect(row?.status).toBe("REQUESTED");
  });

  it("audits customer tool calls and keeps output sanitized", async () => {
    const provider = getDevelopmentAiProvider();
    expect(provider).toBeTruthy();
    provider!.queueToolCalls([
      { toolName: CUSTOMER_GET_RECENT_ORDERS, arguments: {} },
    ]);

    const response = await createConversation(
      new Request("http://localhost:3002/v1/ai/conversations", {
        method: "POST",
        headers: {
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channel: "web",
          content: "Show me my recent orders.",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    conversationId = body.data.id;
    const assistant = body.data.messages.at(-1);
    expect(assistant?.orders?.some((order: { orderNumber?: string }) => order.orderNumber === shippedNumber)).toBe(
      true,
    );
    expect(JSON.stringify(assistant)).not.toContain(userIdA);
    assertNoSecrets(assistant);

    const audited = await prisma.aiToolCall.findMany({
      where: { conversationId },
    });
    expect(audited).toHaveLength(1);
    expect(audited[0]?.toolName).toBe(CUSTOMER_GET_RECENT_ORDERS);
    expect(audited[0]?.success).toBe(true);
    expect(JSON.stringify(audited[0]?.argsJson ?? {})).not.toMatch(/password|cookie|AI_API_KEY/i);
  });
});
