import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { GET as getProfile, PATCH as patchProfile } from "./app/v1/me/route";
import { GET as listAddresses, POST as createAddress } from "./app/v1/me/addresses/route";
import { PATCH as patchAddress, DELETE as deleteAddress } from "./app/v1/me/addresses/[id]/route";
import {
  GET as getPrefs,
  PATCH as patchPrefs,
} from "./app/v1/me/notification-preferences/route";
import { GET as getWishlist } from "./app/v1/me/wishlist/route";
import { POST as addWishlistItem } from "./app/v1/me/wishlist/items/route";
import { DELETE as removeWishlistItem } from "./app/v1/me/wishlist/items/[variantId]/route";
import { GET as listOrders } from "./app/v1/me/orders/route";
import { GET as getOrder } from "./app/v1/me/orders/[idOrNumber]/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetCustomerServices } from "./lib/customer";
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

function authed(cookie: string, init?: RequestInit): HeadersInit {
  return {
    ...(init?.headers ?? {}),
    cookie: `${CUSTOMER_SESSION_COOKIE}=${cookie}`,
    "content-type": "application/json",
  };
}

describeDb("customer API", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `cust_a_${suffix}@example.com`;
  const emailB = `cust_b_${suffix}@example.com`;
  const password = "Secret123";
  let cookieA = "";
  let cookieB = "";
  let userIdA = "";
  let userIdB = "";
  let countryId = "";
  let addressId = "";
  let productId = "";
  let variantId = "";
  let draftProductId = "";
  let draftVariantId = "";
  let orderIdA = "";
  let orderNumberA = "";
  let orderIdB = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCustomerServices();
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

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailA, password, name: "Customer A" }),
      }),
    );
    const bodyA = await regA.json();
    expect(regA.status).toBe(201);
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    userIdA = bodyA.data.userId;

    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailB, password, name: "Customer B" }),
      }),
    );
    const bodyB = await regB.json();
    expect(regB.status).toBe(201);
    cookieB = cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
    userIdB = bodyB.data.userId;

    const product = await prisma.product.create({
      data: {
        slug: `cust-prod-${suffix}`,
        name: `Customer Product ${suffix}`,
        status: "ACTIVE",
        publishedAt: new Date(),
        variants: {
          create: {
            sku: `SKU-CUST-${suffix}`,
            name: "Default",
            isDefault: true,
            isActive: true,
          },
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0]!.id;

    const draft = await prisma.product.create({
      data: {
        slug: `cust-draft-${suffix}`,
        name: `Draft Product ${suffix}`,
        status: "DRAFT",
        variants: {
          create: {
            sku: `SKU-DRAFT-${suffix}`,
            name: "Draft var",
            isDefault: true,
            isActive: true,
          },
        },
      },
      include: { variants: true },
    });
    draftProductId = draft.id;
    draftVariantId = draft.variants[0]!.id;

    const orderA = await prisma.order.create({
      data: {
        number: `ORD-A-${suffix}`,
        userId: userIdA,
        status: "PAID",
        currencyCode: "INR",
        subtotalMinor: 10000n,
        totalMinor: 10000n,
        customerEmail: emailA,
        items: {
          create: {
            productNameSnap: "Item A",
            skuSnap: "SKU-A",
            quantity: 1,
            unitPriceMinor: 10000n,
            totalMinor: 10000n,
            currencyCode: "INR",
          },
        },
      },
    });
    orderIdA = orderA.id;
    orderNumberA = orderA.number;

    const orderB = await prisma.order.create({
      data: {
        number: `ORD-B-${suffix}`,
        userId: userIdB,
        status: "PAID",
        currencyCode: "INR",
        subtotalMinor: 20000n,
        totalMinor: 20000n,
        customerEmail: emailB,
        notes: "internal staff note should not leak",
        items: {
          create: {
            productNameSnap: "Item B",
            skuSnap: "SKU-B",
            quantity: 1,
            unitPriceMinor: 20000n,
            totalMinor: 20000n,
            currencyCode: "INR",
          },
        },
      },
    });
    orderIdB = orderB.id;
  });

  afterAll(async () => {
    await prisma.wishlistItem.deleteMany({
      where: { wishlist: { userId: { in: [userIdA, userIdB] } } },
    });
    await prisma.wishlist.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: [userIdA, userIdB] } } },
    });
    await prisma.order.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.address.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [userIdA, userIdB] } },
    });
    await prisma.customerConsent.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: [userIdA, userIdB] } },
    });
    await prisma.session.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.productVariant.deleteMany({
      where: { id: { in: [variantId, draftVariantId] } },
    });
    await prisma.product.deleteMany({ where: { id: { in: [productId, draftProductId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    await prisma.$disconnect();
  });

  it("rejects unauthenticated profile access with 401", async () => {
    const res = await getProfile(new Request("http://localhost:3002/v1/me"));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("reads authenticated profile without secrets", async () => {
    const res = await getProfile(
      new Request("http://localhost:3002/v1/me", {
        headers: authed(cookieA),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(userIdA);
    expect(body.data.email).toBe(emailA);
    expect(body.data.name).toBe("Customer A");
    expect(JSON.stringify(body)).not.toMatch(/password|scrypt\$|sessionToken|passwordHash/i);
    expect(body.data.notes).toBeUndefined();
  });

  it("updates profile fields", async () => {
    const res = await patchProfile(
      new Request("http://localhost:3002/v1/me", {
        method: "PATCH",
        headers: authed(cookieA),
        body: JSON.stringify({
          name: "Customer A Updated",
          phone: "+919876543210",
          locale: "en-IN",
          defaultCurrencyCode: "INR",
          defaultCountryId: countryId,
        }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Customer A Updated");
    expect(body.data.phone).toBe("+919876543210");
    expect(body.data.locale).toBe("en-IN");
    expect(body.data.defaultCurrencyCode).toBe("INR");
    expect(body.data.defaultCountryId).toBe(countryId);
  });

  it("creates, lists, updates, and deletes addresses with ownership isolation", async () => {
    const createRes = await createAddress(
      new Request("http://localhost:3002/v1/me/addresses", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({
          type: "SHIPPING",
          fullName: "A Ship",
          phone: "+911111111111",
          line1: "12 MG Road",
          city: "Bengaluru",
          state: "KA",
          postalCode: "560001",
          countryId,
          isDefault: true,
        }),
      }),
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);
    addressId = created.data.id;
    expect(created.data.isDefault).toBe(true);

    const second = await createAddress(
      new Request("http://localhost:3002/v1/me/addresses", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({
          type: "SHIPPING",
          fullName: "A Ship 2",
          line1: "34 Brigade",
          city: "Bengaluru",
          postalCode: "560025",
          countryId,
          isDefault: true,
        }),
      }),
    );
    const secondBody = await second.json();
    expect(second.status).toBe(201);
    expect(secondBody.data.isDefault).toBe(true);

    const listRes = await listAddresses(
      new Request("http://localhost:3002/v1/me/addresses", {
        headers: authed(cookieA),
      }),
    );
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody.data.items.length).toBeGreaterThanOrEqual(2);
    const defaults = listBody.data.items.filter(
      (a: { type: string; isDefault: boolean }) =>
        (a.type === "SHIPPING" || a.type === "BOTH") && a.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(secondBody.data.id);

    const foreign = await patchAddress(
      new Request(`http://localhost:3002/v1/me/addresses/${addressId}`, {
        method: "PATCH",
        headers: authed(cookieB),
        body: JSON.stringify({ fullName: "Hacker" }),
      }),
      { params: Promise.resolve({ id: addressId }) },
    );
    expect(foreign.status).toBe(404);

    const patchRes = await patchAddress(
      new Request(`http://localhost:3002/v1/me/addresses/${secondBody.data.id}`, {
        method: "PATCH",
        headers: authed(cookieA),
        body: JSON.stringify({ city: "Mysuru" }),
      }),
      { params: Promise.resolve({ id: secondBody.data.id }) },
    );
    const patched = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patched.data.city).toBe("Mysuru");

    const delForeign = await deleteAddress(
      new Request(`http://localhost:3002/v1/me/addresses/${secondBody.data.id}`, {
        method: "DELETE",
        headers: authed(cookieB),
      }),
      { params: Promise.resolve({ id: secondBody.data.id }) },
    );
    expect(delForeign.status).toBe(404);

    const delRes = await deleteAddress(
      new Request(`http://localhost:3002/v1/me/addresses/${addressId}`, {
        method: "DELETE",
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ id: addressId }) },
    );
    expect(delRes.status).toBe(200);
  });

  it("updates notification preferences", async () => {
    const getRes = await getPrefs(
      new Request("http://localhost:3002/v1/me/notification-preferences", {
        headers: authed(cookieA),
      }),
    );
    const getBody = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getBody.data.emailTransactional).toBe(true);

    const patchRes = await patchPrefs(
      new Request("http://localhost:3002/v1/me/notification-preferences", {
        method: "PATCH",
        headers: authed(cookieA),
        body: JSON.stringify({ emailMarketing: true, pushEnabled: true }),
      }),
    );
    const patchBody = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchBody.data.emailMarketing).toBe(true);
    expect(patchBody.data.pushEnabled).toBe(true);
  });

  it("manages wishlist with active products only", async () => {
    const addDraft = await addWishlistItem(
      new Request("http://localhost:3002/v1/me/wishlist/items", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({ variantId: draftVariantId }),
      }),
    );
    expect(addDraft.status).toBe(404);

    const addRes = await addWishlistItem(
      new Request("http://localhost:3002/v1/me/wishlist/items", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({ productId }),
      }),
    );
    const added = await addRes.json();
    expect(addRes.status).toBe(201);
    expect(added.data.variantId).toBe(variantId);
    expect(added.data.productId).toBe(productId);

    const dup = await addWishlistItem(
      new Request("http://localhost:3002/v1/me/wishlist/items", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({ variantId }),
      }),
    );
    expect(dup.status).toBe(409);

    const listRes = await getWishlist(
      new Request("http://localhost:3002/v1/me/wishlist", {
        headers: authed(cookieA),
      }),
    );
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody.data.items.some((i: { variantId: string }) => i.variantId === variantId)).toBe(
      true,
    );

    // Seed unpublished item directly then ensure list hides it
    await prisma.wishlistItem.create({
      data: {
        wishlistId: listBody.data.id,
        variantId: draftVariantId,
      },
    });
    const list2 = await getWishlist(
      new Request("http://localhost:3002/v1/me/wishlist", {
        headers: authed(cookieA),
      }),
    );
    const list2Body = await list2.json();
    expect(
      list2Body.data.items.some((i: { variantId: string }) => i.variantId === draftVariantId),
    ).toBe(false);

    const foreignRemove = await removeWishlistItem(
      new Request(`http://localhost:3002/v1/me/wishlist/items/${variantId}`, {
        method: "DELETE",
        headers: authed(cookieB),
      }),
      { params: Promise.resolve({ variantId }) },
    );
    expect(foreignRemove.status).toBe(404);

    const removeRes = await removeWishlistItem(
      new Request(`http://localhost:3002/v1/me/wishlist/items/${variantId}`, {
        method: "DELETE",
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ variantId }) },
    );
    expect(removeRes.status).toBe(200);
  });

  it("lists own orders and blocks cross-customer order access", async () => {
    const listRes = await listOrders(
      new Request("http://localhost:3002/v1/me/orders", {
        headers: authed(cookieA),
      }),
    );
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody.data.items.some((o: { id: string }) => o.id === orderIdA)).toBe(true);
    expect(listBody.data.items.some((o: { id: string }) => o.id === orderIdB)).toBe(false);

    const own = await getOrder(
      new Request(`http://localhost:3002/v1/me/orders/${orderNumberA}`, {
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ idOrNumber: orderNumberA }) },
    );
    const ownBody = await own.json();
    expect(own.status).toBe(200);
    expect(ownBody.data.id).toBe(orderIdA);
    expect(ownBody.data.items.length).toBe(1);
    expect(JSON.stringify(ownBody)).not.toMatch(/internal staff note|passwordHash|sessionToken/i);
    expect(ownBody.data.notes).toBeUndefined();

    const foreign = await getOrder(
      new Request(`http://localhost:3002/v1/me/orders/${orderIdB}`, {
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ idOrNumber: orderIdB }) },
    );
    expect(foreign.status).toBe(404);
  });
});
