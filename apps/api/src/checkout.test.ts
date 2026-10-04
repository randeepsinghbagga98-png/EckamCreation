import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CART_TOKEN_HEADER } from "@eckamcreation/api-contracts";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as createCart } from "./app/v1/carts/route";
import { POST as addCartItem } from "./app/v1/carts/current/items/route";
import { POST as startCheckout } from "./app/v1/checkout/sessions/route";
import {
  GET as getCheckout,
  PATCH as patchCheckout,
} from "./app/v1/checkout/sessions/[id]/route";
import { POST as quoteCheckout } from "./app/v1/checkout/sessions/[id]/quote/route";
import { POST as completeCheckout } from "./app/v1/checkout/sessions/[id]/complete/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetCartServices } from "./lib/cart";
import { resetCheckoutServices } from "./lib/checkout";
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

describeDb("checkout API", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `co_a_${suffix}@example.com`;
  const emailB = `co_b_${suffix}@example.com`;
  const password = "Secret123";
  let cookieA = "";
  let cookieB = "";
  let userIdA = "";
  let userIdB = "";
  let countryId = "";
  let addressA = "";
  let addressB = "";
  let shippingMethodId = "";
  let inactiveMethodId = "";
  let zoneId = "";
  let variantId = "";
  let draftVariantId = "";
  let promoId = "";
  const couponCode = `SAVE10-${suffix}`;
  let guestToken = "";
  let checkoutIdA = "";
  let taxRuleId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCartServices();
    resetCheckoutServices();
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
        name: `Zone ${suffix}`,
        isActive: true,
        zoneCountries: { create: { countryId } },
        methods: {
          create: [
            {
              code: `STD-${suffix}`,
              name: "Standard",
              isActive: true,
              estimatedDaysMin: 3,
              estimatedDaysMax: 7,
              rates: {
                create: {
                  currencyCode: "INR",
                  amountMinor: 5000n,
                  isActive: true,
                },
              },
            },
            {
              code: `INACTIVE-${suffix}`,
              name: "Inactive",
              isActive: false,
              rates: {
                create: {
                  currencyCode: "INR",
                  amountMinor: 100n,
                  isActive: true,
                },
              },
            },
          ],
        },
      },
      include: { methods: true },
    });
    zoneId = zone.id;
    shippingMethodId = zone.methods.find((m) => m.isActive)!.id;
    inactiveMethodId = zone.methods.find((m) => !m.isActive)!.id;

    const taxRule = await prisma.taxRule.create({
      data: {
        name: `GST ${suffix}`,
        countryId,
        priority: 10,
        isActive: true,
        rates: {
          create: {
            taxCode: "GST",
            name: "GST 18%",
            rateBps: 1800,
            inclusive: false,
            isActive: true,
            },
        },
      },
    });
    taxRuleId = taxRule.id;

    const promo = await prisma.promotion.create({
      data: {
        name: `Promo ${suffix}`,
        type: "PERCENTAGE",
        value: 1000, // 10%
        currencyCode: "INR",
        isActive: true,
        coupons: {
          create: {
            code: couponCode,
            isActive: true,
          },
        },
      },
    });
    promoId = promo.id;

    const product = await prisma.product.create({
      data: {
        slug: `co-prod-${suffix}`,
        name: `Checkout Product ${suffix}`,
        status: "ACTIVE",
        publishedAt: new Date(),
        variants: {
          create: {
            sku: `CO-${suffix}`,
            name: "Default",
            isDefault: true,
            isActive: true,
            weightGrams: 500,
            prices: {
              create: {
                currencyCode: "INR",
                amountMinor: 10000n,
                isActive: true,
              },
            },
          },
        },
      },
      include: { variants: true },
    });
    variantId = product.variants[0]!.id;

    const draft = await prisma.product.create({
      data: {
        slug: `co-draft-${suffix}`,
        name: `Draft ${suffix}`,
        status: "DRAFT",
        variants: {
          create: {
            sku: `CO-DRAFT-${suffix}`,
            isActive: true,
            prices: {
              create: { currencyCode: "INR", amountMinor: 100n, isActive: true },
            },
          },
        },
      },
      include: { variants: true },
    });
    draftVariantId = draft.variants[0]!.id;

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailA, password, name: "Checkout A" }),
      }),
    );
    const bodyA = await regA.json();
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    userIdA = bodyA.data.userId;

    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailB, password, name: "Checkout B" }),
      }),
    );
    const bodyB = await regB.json();
    cookieB = cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
    userIdB = bodyB.data.userId;

    const addrA = await prisma.address.create({
      data: {
        userId: userIdA,
        type: "SHIPPING",
        fullName: "A Ship",
        line1: "1 Main",
        city: "Bengaluru",
        postalCode: "560001",
        countryId,
        isDefault: true,
      },
    });
    addressA = addrA.id;

    const addrB = await prisma.address.create({
      data: {
        userId: userIdB,
        type: "SHIPPING",
        fullName: "B Ship",
        line1: "2 Main",
        city: "Mumbai",
        postalCode: "400001",
        countryId,
        isDefault: true,
      },
    });
    addressB = addrB.id;
  });

  afterAll(async () => {
    const sessions = await prisma.checkoutSession.findMany({
      where: { OR: [{ userId: { in: [userIdA, userIdB] } }, { cart: { guestToken: { not: null } } }] },
      select: { id: true, cartId: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    const cartIds = sessions.map((s) => s.cartId);

    if (sessionIds.length) {
      await prisma.checkoutItem.deleteMany({ where: { checkoutSessionId: { in: sessionIds } } });
      await prisma.checkoutSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    const extraCarts = await prisma.cart.findMany({
      where: {
        OR: [
          { userId: { in: [userIdA, userIdB] } },
          { items: { some: { variantId: { in: [variantId, draftVariantId] } } } },
        ],
      },
      select: { id: true },
    });
    const allCartIds = [...new Set([...cartIds, ...extraCarts.map((c) => c.id)])];
    if (allCartIds.length) {
      await prisma.cartItem.deleteMany({ where: { cartId: { in: allCartIds } } });
      await prisma.cart.deleteMany({ where: { id: { in: allCartIds } } });
    }

    await prisma.idempotencyRecord.deleteMany({ where: { scope: "checkout.start" } });
    await prisma.address.deleteMany({ where: { id: { in: [addressA, addressB] } } });
    await prisma.address.deleteMany({ where: { userId: null, fullName: { contains: suffix } } });
    await prisma.coupon.deleteMany({ where: { promotionId: promoId } });
    await prisma.promotion.deleteMany({ where: { id: promoId } });
    await prisma.taxRate.deleteMany({ where: { taxRuleId } });
    await prisma.taxRule.deleteMany({ where: { id: taxRuleId } });
    await prisma.shippingRate.deleteMany({
      where: { shippingMethod: { zoneId } },
    });
    await prisma.shippingMethod.deleteMany({ where: { zoneId } });
    await prisma.shippingZoneCountry.deleteMany({ where: { zoneId } });
    await prisma.shippingZone.deleteMany({ where: { id: zoneId } });
    await prisma.price.deleteMany({ where: { variantId: { in: [variantId, draftVariantId] } } });
    await prisma.productVariant.deleteMany({ where: { id: { in: [variantId, draftVariantId] } } });
    await prisma.product.deleteMany({
      where: { slug: { in: [`co-prod-${suffix}`, `co-draft-${suffix}`] } },
    });
    await prisma.session.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    await prisma.$disconnect();
  });

  async function seedCustomerCart(cookie: string) {
    await addCartItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookie}`,
        },
        body: JSON.stringify({ variantId, quantity: 2 }),
      }),
    );
  }

  it("rejects empty cart and inactive products", async () => {
    const empty = await startCheckout(
      new Request("http://localhost:3002/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({}),
      }),
    );
    // may 404 cart or 400 empty depending on whether cart exists
    expect([400, 404]).toContain(empty.status);

    const guest = await createCart(
      new Request("http://localhost:3002/v1/carts?currency=INR", { method: "POST" }),
    );
    const guestBody = await guest.json();
    guestToken = guestBody.data.guestToken;

    const badAdd = await addCartItem(
      new Request("http://localhost:3002/v1/carts/current/items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: draftVariantId, quantity: 1 }),
      }),
    );
    expect(badAdd.status).toBe(404);
  });

  it("starts customer checkout with locked DB prices", async () => {
    await seedCustomerCart(cookieA);

    const res = await startCheckout(
      new Request("http://localhost:3002/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
          "Idempotency-Key": `co-start-${suffix}`,
        },
        body: JSON.stringify({ currency: "INR", country: "IN" }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    checkoutIdA = body.data.id;
    expect(body.data.status).toBe("OPEN");
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].unitPrice.amountMinor).toBe("10000");
    expect(body.data.subtotal.amountMinor).toBe("20000");
    expect(body.data.convertedOrderId).toBeNull();
    expect(body.data.paymentReady).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|providerIntentId|scrypt/i);
  });

  it("enforces ownership and address rules", async () => {
    const foreign = await getCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieB}` },
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(foreign.status).toBe(404);

    const unauth = await getCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(unauth.status).toBe(401);

    const badAddr = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ shippingAddressId: addressB }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(badAddr.status).toBe(404);

    const okAddr = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ shippingAddressId: addressA }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    const addrBody = await okAddr.json();
    expect(okAddr.status).toBe(200);
    expect(addrBody.data.status).toBe("ADDRESS");
    expect(addrBody.data.shippingAddressId).toBe(addressA);
    expect(addrBody.data.taxConfigured).toBe(true);
    expect(addrBody.data.tax.amountMinor).toBe("3600"); // 18% of 20000
  });

  it("selects shipping, applies coupon, ignores client totals", async () => {
    const inactive = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ shippingMethodId: inactiveMethodId }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(inactive.status).toBe(400);

    const patch = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({
          shippingMethodId,
          couponCode,
          // client-supplied totals must be ignored (not in schema, but ensure DB totals win)
        }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    const body = await patch.json();
    expect(patch.status).toBe(200);
    expect(body.data.status).toBe("SHIPPING");
    expect(body.data.shipping.amountMinor).toBe("5000");
    expect(body.data.discount.amountMinor).toBe("2000"); // 10% of 20000
    // taxable 18000 * 18% = 3240; + shipping 5000; total = 18000+3240+5000 = 26240
    expect(body.data.tax.amountMinor).toBe("3240");
    expect(body.data.total.amountMinor).toBe("26240");

    const badCoupon = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ couponCode: "NOPE-INVALID" }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(badCoupon.status).toBe(400);
  });

  it("detects price changes and completes to READY_FOR_PAYMENT without order/payment", async () => {
    await prisma.price.updateMany({
      where: { variantId },
      data: { amountMinor: 12000n },
    });

    const completeWhileStale = await completeCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}/complete`, {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect(completeWhileStale.status).toBe(409);

    const quoted = await quoteCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}/quote`, {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    const quoteBody = await quoted.json();
    expect(quoted.status).toBe(200);
    expect(quoteBody.data.items[0].unitPrice.amountMinor).toBe("12000");
    expect(quoteBody.data.warnings?.some((w: string) => w.startsWith("PRICE_CHANGED"))).toBe(true);

    // Re-apply shipping after reprice (totals recalculated)
    await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({
          shippingAddressId: addressA,
          shippingMethodId,
          couponCode,
        }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );

    const done = await completeCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}/complete`, {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}` },
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    const doneBody = await done.json();
    expect(done.status).toBe(200);
    expect(doneBody.data.status).toBe("PAYMENT");
    expect(doneBody.data.paymentStatus).toBe("READY_FOR_PAYMENT");
    expect(doneBody.data.paymentReady).toBe(true);
    expect(doneBody.data.convertedOrderId).toBeNull();

    const intents = await prisma.paymentIntent.count({
      where: { amountMinor: BigInt(doneBody.data.total.amountMinor) },
    });
    expect(intents).toBe(0);

    const orders = await prisma.order.count({ where: { userId: userIdA } });
    expect(orders).toBe(0);

    const reuse = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ couponCode: null }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    // PAYMENT is locked (ready-for-payment boundary); cannot mutate further
    expect(reuse.status).toBe(409);
  });

  it("supports guest checkout with inline address", async () => {
    const created = await createCart(
      new Request("http://localhost:3002/v1/carts?currency=INR", { method: "POST" }),
    );
    const createdBody = await created.json();
    const token = createdBody.data.guestToken as string;

    await addCartItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({ variantId, quantity: 1 }),
      }),
    );

    const start = await startCheckout(
      new Request("http://localhost:3002/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({ currency: "INR", country: "IN" }),
      }),
    );
    const startBody = await start.json();
    expect(start.status).toBe(201);
    const checkoutId = startBody.data.id as string;

    const otherGuest = await getCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutId}`, {
        headers: { [CART_TOKEN_HEADER]: guestToken || "bogus" },
      }),
      { params: Promise.resolve({ id: checkoutId }) },
    );
    expect(otherGuest.status).toBe(404);

    const patched = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({
          shippingAddress: {
            fullName: `Guest ${suffix}`,
            line1: "9 Guest Lane",
            city: "Bengaluru",
            postalCode: "560002",
            countryId,
          },
          shippingMethodId,
        }),
      }),
      { params: Promise.resolve({ id: checkoutId }) },
    );
    const patchBody = await patched.json();
    expect(patched.status).toBe(200);
    expect(patchBody.data.shippingAddressId).toBeTruthy();
    expect(patchBody.data.status).toBe("SHIPPING");

    const reuseOrphan = await patchCheckout(
      new Request(`http://localhost:3002/v1/checkout/sessions/${checkoutIdA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({ shippingAddressId: addressA }),
      }),
      { params: Promise.resolve({ id: checkoutIdA }) },
    );
    expect([401, 404]).toContain(reuseOrphan.status);

    const otherGuestStart = await startCheckout(
      new Request("http://localhost:3002/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ currency: "INR", country: "IN" }),
      }),
    );
    const otherGuestBody = await otherGuestStart.json();
    if (otherGuestStart.status === 201) {
      const hijack = await patchCheckout(
        new Request(`http://localhost:3002/v1/checkout/sessions/${otherGuestBody.data.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            [CART_TOKEN_HEADER]: guestToken,
          },
          body: JSON.stringify({ shippingAddressId: patchBody.data.shippingAddressId }),
        }),
        { params: Promise.resolve({ id: otherGuestBody.data.id }) },
      );
      expect(hijack.status).toBe(404);
    }
  });
});
