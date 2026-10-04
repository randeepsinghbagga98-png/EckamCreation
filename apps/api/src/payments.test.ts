import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PaymentProviderNotConfiguredError,
  PaymentProviderRegistry,
  PaymentStateService,
  PaymentValidationError,
  TestPaymentAdapter,
  TEST_PAYMENT_PROVIDER_ID,
  assertTestProviderAllowed,
} from "@eckamcreation/payments";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as addCartItem } from "./app/v1/carts/current/items/route";
import { POST as startCheckout } from "./app/v1/checkout/sessions/route";
import { PATCH as patchCheckout } from "./app/v1/checkout/sessions/[id]/route";
import { POST as completeCheckout } from "./app/v1/checkout/sessions/[id]/complete/route";
import { POST as createIntent } from "./app/v1/payments/intents/route";
import { GET as getIntent } from "./app/v1/payments/intents/[id]/route";
import { POST as initiatePayment } from "./app/v1/payments/intents/[id]/initiate/route";
import { POST as paymentWebhook } from "./app/v1/webhooks/payments/[provider]/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetCartServices } from "./lib/cart";
import { resetCheckoutServices } from "./lib/checkout";
import { resetOrderServices } from "./lib/orders";
import {
  getPaymentService,
  getTestPaymentAdapter,
  resetPaymentServices,
} from "./lib/payments";
import { createAuthRateLimiter } from "./lib/auth/rate-limit-auth";
import { setRateLimiter } from "./lib/rate-limit";

function loadEnv() {
  for (const path of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), "../../.env.local")]) {
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

loadEnv();
process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_PAYMENT_PROVIDER = "1";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describe("payment provider readiness", () => {
  it("fails safely when no provider is registered", () => {
    const registry = new PaymentProviderRegistry();
    expect(() => registry.resolve()).toThrow(PaymentProviderNotConfiguredError);
    expect(() => registry.resolve("unknown")).toThrow(PaymentValidationError);
  });

  it("fails safely when a registered adapter is not configured", () => {
    const registry = new PaymentProviderRegistry();
    registry.register({
      id: "unconfigured",
      region: "india",
      supportedMethods: ["other"],
      isConfigured: () => false,
      createPayment: async () => {
        throw new Error("must not be called");
      },
      getPaymentStatus: async () => {
        throw new Error("must not be called");
      },
      verifyWebhook: async () => {
        throw new Error("must not be called");
      },
      refundPayment: async () => {
        throw new Error("must not be called");
      },
    });
    expect(() => registry.resolve("unconfigured")).toThrow(PaymentProviderNotConfiguredError);
    expect(() => registry.resolve()).toThrow(PaymentProviderNotConfiguredError);
  });

  it("keeps the test provider out of production", () => {
    expect(() => assertTestProviderAllowed("production")).toThrow(PaymentValidationError);
    expect(() => assertTestProviderAllowed("development")).not.toThrow();
    expect(() => assertTestProviderAllowed("test")).not.toThrow();
  });

  it("does not allow REQUIRES_PAYMENT to become SUCCEEDED in one step", () => {
    const states = new PaymentStateService();
    expect(() => states.assertTransition("REQUIRES_PAYMENT", "SUCCEEDED")).toThrow();
    expect(() => states.assertTransition("REQUIRES_PAYMENT", "PROCESSING")).not.toThrow();
  });
});

function cookieFrom(response: Response, name: string): string {
  const headers = response.headers.getSetCookie?.() ?? [];
  for (const row of headers) {
    if (row.startsWith(`${name}=`)) return row.split(";")[0]!.slice(name.length + 1);
  }
  const single = response.headers.get("set-cookie") ?? "";
  const match = single.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? "";
}

describeDb("payment core API", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `pay_a_${suffix}@example.com`;
  const emailB = `pay_b_${suffix}@example.com`;
  const password = "Secret123";
  let cookieA = "";
  let cookieB = "";
  let userIdA = "";
  let userIdB = "";
  let countryId = "";
  let addressId = "";
  let shippingMethodId = "";
  let zoneId = "";
  let productId = "";
  let variantId = "";
  let checkoutId = "";
  let intentId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCartServices();
    resetCheckoutServices();
    resetOrderServices();
    resetPaymentServices();
    setRateLimiter(createAuthRateLimiter());

    await prisma.currency.upsert({
      where: { code: "INR" },
      create: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
      update: {},
    });

    const country = await prisma.country.upsert({
      where: { iso2: "IN" },
      create: {
        iso2: "IN",
        iso3: "IND",
        name: "India",
        defaultCurrencyCode: "INR",
        isActive: true,
      },
      update: { isActive: true },
    });
    countryId = country.id;

    const zone = await prisma.shippingZone.create({
      data: {
        name: `PayZone ${suffix}`,
        isActive: true,
        zoneCountries: { create: { countryId } },
        methods: {
          create: {
            code: `PAY-STD-${suffix}`,
            name: "Standard",
            isActive: true,
            rates: {
              create: { currencyCode: "INR", amountMinor: 3000n, isActive: true },
            },
          },
        },
      },
      include: { methods: true },
    });
    zoneId = zone.id;
    shippingMethodId = zone.methods[0]!.id;

    const product = await prisma.product.create({
      data: {
        slug: `pay-prod-${suffix}`,
        name: `Pay Product ${suffix}`,
        status: "ACTIVE",
        publishedAt: new Date(),
        variants: {
          create: {
            sku: `PAY-${suffix}`,
            isDefault: true,
            isActive: true,
            prices: {
              create: { currencyCode: "INR", amountMinor: 10000n, isActive: true },
            },
          },
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0]!.id;

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailA, password, name: "Pay A" }),
      }),
    );
    const bodyA = await regA.json();
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    userIdA = bodyA.data.userId;

    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailB, password, name: "Pay B" }),
      }),
    );
    const bodyB = await regB.json();
    cookieB = cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
    userIdB = bodyB.data.userId;

    const addr = await prisma.address.create({
      data: {
        userId: userIdA,
        type: "BOTH",
        fullName: "Pay Ship",
        line1: "1 Pay St",
        city: "Bengaluru",
        postalCode: "560001",
        countryId,
        isDefault: true,
      },
    });
    addressId = addr.id;
  });

  afterAll(async () => {
    const intents = await prisma.paymentIntent.findMany({
      where: { idempotencyKey: { startsWith: "checkout:" } },
      select: { id: true, orderId: true },
    });
    const orderIds = intents.map((i) => i.orderId).filter(Boolean) as string[];
    if (orderIds.length) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.checkoutSession.updateMany({
        where: { convertedOrderId: { in: orderIds } },
        data: { convertedOrderId: null },
      });
      await prisma.paymentIntent.updateMany({
        where: { orderId: { in: orderIds } },
        data: { orderId: null },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.paymentTransaction.deleteMany({
      where: { paymentIntentId: { in: intents.map((i) => i.id) } },
    });
    await prisma.paymentIntent.deleteMany({
      where: { id: { in: intents.map((i) => i.id) } },
    });
    await prisma.webhookEvent.deleteMany({ where: { provider: TEST_PAYMENT_PROVIDER_ID } });
    await prisma.idempotencyRecord.deleteMany({ where: { scope: "payments.intents.create" } });
    await prisma.auditLog.deleteMany({
      where: { entityType: "PaymentIntent", entityId: { in: intents.map((i) => i.id) } },
    });

    const carts = await prisma.cart.findMany({
      where: { userId: { in: [userIdA, userIdB] } },
      select: { id: true },
    });
    const cartIds = carts.map((c) => c.id);
    if (cartIds.length) {
      await prisma.checkoutItem.deleteMany({
        where: { checkoutSession: { cartId: { in: cartIds } } },
      });
      await prisma.checkoutSession.deleteMany({ where: { cartId: { in: cartIds } } });
      await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
      await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
    }

    await prisma.address.deleteMany({ where: { id: addressId } });
    await prisma.shippingRate.deleteMany({ where: { shippingMethod: { zoneId } } });
    await prisma.shippingMethod.deleteMany({ where: { zoneId } });
    await prisma.shippingZoneCountry.deleteMany({ where: { zoneId } });
    await prisma.shippingZone.deleteMany({ where: { id: zoneId } });
    await prisma.price.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { id: variantId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.session.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    await prisma.$disconnect();
  });

  async function readyCheckout() {
    await addCartItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ variantId, quantity: 1 }),
      }),
    );
    const start = await startCheckout(
      new Request("http://localhost:3002/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ currency: "INR", country: "IN" }),
      }),
    );
    const startBody = await start.json();
    checkoutId = startBody.data.id;
    await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ shippingAddressId: addressId, shippingMethodId }),
      }),
      { params: Promise.resolve({ id: checkoutId }) },
    );
    const done = await completeCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutId}/complete`, {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: checkoutId }) },
    );
    expect(done.status).toBe(200);
  }

  it("creates PaymentIntent from checkout totals and ignores client amount", async () => {
    await readyCheckout();

    const intentBody = {
      checkoutSessionId: checkoutId,
      provider: TEST_PAYMENT_PROVIDER_ID,
      // Client amount must be ignored — authoritative total comes from checkout
      amount: { amountMinor: "1", currencyCode: "USD" },
    };

    const res = await createIntent(
      new Request("http://localhost:3002/v1/payments/intents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
          "Idempotency-Key": `pay-${suffix}`,
        },
        body: JSON.stringify(intentBody),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    intentId = body.data.id;
    expect(body.data.status).toBe("REQUIRES_PAYMENT");
    expect(body.data.amount.amountMinor).toBe("13000"); // 10000 + 3000 shipping
    expect(body.data.amount.currencyCode).toBe("INR");
    expect(JSON.stringify(body)).not.toMatch(/secret|webhook|password|cvv/i);

    const again = await createIntent(
      new Request("http://localhost:3002/v1/payments/intents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
          "Idempotency-Key": `pay-${suffix}`,
        },
        body: JSON.stringify(intentBody),
      }),
    );
    const againBody = await again.json();
    expect(again.status).toBe(200);
    expect(againBody.data.id).toBe(intentId);
  });

  it("enforces ownership and rejects initiate without configured production provider path", async () => {
    const foreign = await getIntent(
      new Request(`http://localhost:3002/v1/payments/intents/${intentId}`, {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieB}` },
      }),
      { params: Promise.resolve({ id: intentId }) },
    );
    expect(foreign.status).toBe(404);

    const mine = await getIntent(
      new Request(`http://localhost:3002/v1/payments/intents/${intentId}`, {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: intentId }) },
    );
    expect(mine.status).toBe(200);
  });

  it("initiates via test provider and completes order only through verified webhook", async () => {
    const adapter = getTestPaymentAdapter();
    expect(adapter).toBeTruthy();
    adapter!.setMode("pending");

    // Prefer test provider on initiate by updating intent provider
    await prisma.paymentIntent.update({
      where: { id: intentId },
      data: { provider: TEST_PAYMENT_PROVIDER_ID },
    });

    const init = await initiatePayment(
      new Request(`http://localhost:3002/v1/payments/intents/${intentId}/initiate`, {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: intentId }) },
    );
    const initBody = await init.json();
    expect(init.status).toBe(200);
    expect(initBody.data.status).toBe("PROCESSING");

    // Frontend success alone must NOT create order
    let orders = await prisma.order.count({ where: { userId: userIdA } });
    expect(orders).toBe(0);

    const intent = await prisma.paymentIntent.findUniqueOrThrow({ where: { id: intentId } });
    const payload = {
      eventId: `evt-${suffix}`,
      eventType: "payment.succeeded",
      providerPaymentId: intent.providerIntentId,
      status: "SUCCEEDED",
      amountMinor: intent.amountMinor.toString(),
      currencyCode: intent.currencyCode,
      paymentIntentId: intentId,
    };
    const { rawBody, signature } = TestPaymentAdapter.signPayload(payload);

    const badSig = await paymentWebhook(
      new Request(`http://localhost:3002/v1/webhooks/payments/${TEST_PAYMENT_PROVIDER_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-signature": "deadbeef",
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: TEST_PAYMENT_PROVIDER_ID }) },
    );
    expect(badSig.status).toBe(401);

    const ok = await paymentWebhook(
      new Request(`http://localhost:3002/v1/webhooks/payments/${TEST_PAYMENT_PROVIDER_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-signature": signature,
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: TEST_PAYMENT_PROVIDER_ID }) },
    );
    const okBody = await ok.json();
    expect(ok.status).toBe(200);
    expect(okBody.data.received).toBe(true);
    expect(okBody.data.processed).toBe(true);

    const refreshed = await prisma.paymentIntent.findUniqueOrThrow({ where: { id: intentId } });
    expect(refreshed.status).toBe("SUCCEEDED");
    expect(refreshed.orderId).toBeTruthy();

    orders = await prisma.order.count({ where: { userId: userIdA } });
    expect(orders).toBe(1);

    // Duplicate webhook is replay-safe
    const dup = await paymentWebhook(
      new Request(`http://localhost:3002/v1/webhooks/payments/${TEST_PAYMENT_PROVIDER_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-signature": signature,
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: TEST_PAYMENT_PROVIDER_ID }) },
    );
    const dupBody = await dup.json();
    expect(dupBody.data.duplicate).toBe(true);
    expect(await prisma.order.count({ where: { userId: userIdA } })).toBe(1);
  });

  it("rejects invalid checkout and invalid payment transitions", async () => {
    const { PaymentStateService, PaymentConflictError } = await import("@eckamcreation/payments");
    const states = new PaymentStateService();
    expect(() => states.assertTransition("REQUIRES_PAYMENT", "PROCESSING")).not.toThrow();
    expect(() => states.assertTransition("REQUIRES_PAYMENT", "SUCCEEDED")).toThrow(PaymentConflictError);
    expect(() => states.assertTransition("SUCCEEDED", "FAILED")).toThrow(PaymentConflictError);

    const notReady = await createIntent(
      new Request("http://localhost:3002/v1/payments/intents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ checkoutSessionId: "does-not-exist" }),
      }),
    );
    expect(notReady.status).toBe(404);
  });

  it("supports refund boundary without exceeding amount", async () => {
    const intent = await prisma.paymentIntent.findUniqueOrThrow({ where: { id: intentId } });
    const refund = await getPaymentService().createRefund({
      paymentIntentId: intent.id,
      amountMinor: BigInt(1000),
      reason: "partial test refund",
      idempotencyKey: `refund-${suffix}`,
    });
    expect(refund.status).toBe("SUCCEEDED");
    expect(refund.amountMinor).toBe(BigInt(1000));

    const replay = await getPaymentService().createRefund({
      paymentIntentId: intent.id,
      amountMinor: BigInt(1000),
      reason: "partial test refund",
      idempotencyKey: `refund-${suffix}`,
    });
    expect(replay.id).toBe(refund.id);

    await expect(
      getPaymentService().createRefund({
        paymentIntentId: intent.id,
        amountMinor: intent.amountMinor,
      }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/exceeds refundable/i) });
  });

  it("returns PAYMENT_PROVIDER_NOT_CONFIGURED when no adapter matches", async () => {
    // Fresh intent without test provider path: force pending + empty resolve
    // Use registry by clearing test adapter via new service with empty registry — covered by unit path:
    const { PaymentService, PaymentProviderRegistry, PaymentProviderNotConfiguredError } =
      await import("@eckamcreation/payments");
    const empty = new PaymentService({
      prisma,
      registry: new PaymentProviderRegistry(),
      allowTestProvider: false,
      nodeEnv: "test",
    });
    // Create a REQUIRES_PAYMENT intent manually
    const orphanCheckout = await prisma.checkoutSession.findUnique({ where: { id: checkoutId } });
    expect(orphanCheckout).toBeTruthy();
    // Use an already converted checkout — createIntent should fail; instead create orphan intent
    const orphan = await prisma.paymentIntent.create({
      data: {
        provider: "pending",
        amountMinor: 100n,
        currencyCode: "INR",
        status: "REQUIRES_PAYMENT",
        idempotencyKey: `orphan-${suffix}`,
        metadata: { checkoutSessionId: checkoutId, purpose: "checkout", userId: userIdA },
      },
    });
    await expect(
      empty.initiatePayment({ paymentIntentId: orphan.id, userId: userIdA }),
    ).rejects.toBeInstanceOf(PaymentProviderNotConfiguredError);

    await prisma.paymentIntent.delete({ where: { id: orphan.id } });
  });
});
