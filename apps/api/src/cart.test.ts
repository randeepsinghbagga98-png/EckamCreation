import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CART_TOKEN_HEADER } from "@eckamcreation/api-contracts";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as createCart } from "./app/v1/carts/route";
import { GET as getCart, DELETE as clearCart } from "./app/v1/carts/current/route";
import { POST as addItem } from "./app/v1/carts/current/items/route";
import {
  PATCH as patchItem,
  DELETE as removeItem,
} from "./app/v1/carts/current/items/[itemId]/route";
import { POST as mergeCart } from "./app/v1/carts/merge/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetCartServices } from "./lib/cart";
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

describeDb("cart API", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `cart_a_${suffix}@example.com`;
  const emailB = `cart_b_${suffix}@example.com`;
  const password = "Secret123";
  let cookieA = "";
  let cookieB = "";
  let userIdA = "";
  let userIdB = "";
  let variantA = "";
  let variantB = "";
  let variantNoPrice = "";
  let draftVariant = "";
  let productA = "";
  let productDraft = "";
  let guestToken = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCartServices();
    setRateLimiter(createAuthRateLimiter());

    await prisma.currency.upsert({
      where: { code: "INR" },
      create: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
      update: {},
    });

    const active = await prisma.product.create({
      data: {
        slug: `cart-prod-a-${suffix}`,
        name: `Cart Product A ${suffix}`,
        status: "ACTIVE",
        publishedAt: new Date(),
        variants: {
          create: [
            {
              sku: `CART-A-${suffix}`,
              name: "A",
              isDefault: true,
              isActive: true,
              prices: {
                create: {
                  currencyCode: "INR",
                  amountMinor: 15000n,
                  isActive: true,
                },
              },
            },
            {
              sku: `CART-B-${suffix}`,
              name: "B",
              isActive: true,
              prices: {
                create: {
                  currencyCode: "INR",
                  amountMinor: 25000n,
                  isActive: true,
                },
              },
            },
            {
              sku: `CART-NOPRICE-${suffix}`,
              name: "NoPrice",
              isActive: true,
            },
          ],
        },
      },
      include: { variants: true },
    });
    productA = active.id;
    variantA = active.variants.find((v) => v.sku.startsWith("CART-A-"))!.id;
    variantB = active.variants.find((v) => v.sku.startsWith("CART-B-"))!.id;
    variantNoPrice = active.variants.find((v) => v.sku.startsWith("CART-NOPRICE-"))!.id;

    const draft = await prisma.product.create({
      data: {
        slug: `cart-draft-${suffix}`,
        name: `Cart Draft ${suffix}`,
        status: "DRAFT",
        variants: {
          create: {
            sku: `CART-DRAFT-${suffix}`,
            name: "Draft",
            isDefault: true,
            isActive: true,
            prices: {
              create: { currencyCode: "INR", amountMinor: 999n, isActive: true },
            },
          },
        },
      },
      include: { variants: true },
    });
    productDraft = draft.id;
    draftVariant = draft.variants[0]!.id;

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailA, password, name: "Cart A" }),
      }),
    );
    const bodyA = await regA.json();
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    userIdA = bodyA.data.userId;

    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailB, password, name: "Cart B" }),
      }),
    );
    const bodyB = await regB.json();
    cookieB = cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
    userIdB = bodyB.data.userId;
  });

  afterAll(async () => {
    const carts = await prisma.cart.findMany({
      where: {
        OR: [
          { userId: { in: [userIdA, userIdB] } },
          { guestToken: guestToken || undefined },
        ],
      },
      select: { id: true },
    });
    const cartIds = carts.map((c) => c.id);
    // Also clean merged / orphan guest carts from this suite via items' variants
    const related = await prisma.cartItem.findMany({
      where: { variantId: { in: [variantA, variantB, variantNoPrice, draftVariant] } },
      select: { cartId: true },
    });
    const allCartIds = [...new Set([...cartIds, ...related.map((r) => r.cartId)])];

    if (allCartIds.length) {
      await prisma.cartItem.deleteMany({ where: { cartId: { in: allCartIds } } });
      await prisma.cart.deleteMany({ where: { id: { in: allCartIds } } });
    }

    await prisma.price.deleteMany({
      where: { variantId: { in: [variantA, variantB, draftVariant] } },
    });
    await prisma.productVariant.deleteMany({
      where: { id: { in: [variantA, variantB, variantNoPrice, draftVariant] } },
    });
    await prisma.product.deleteMany({ where: { id: { in: [productA, productDraft] } } });
    await prisma.session.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.customerProfile.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
    await prisma.$disconnect();
  });

  it("creates and retrieves a guest cart", async () => {
    const created = await createCart(
      new Request("http://localhost:3002/v1/carts?currency=INR", { method: "POST" }),
    );
    const body = await created.json();
    expect(created.status).toBe(201);
    expect(body.data.guestToken).toBeTruthy();
    expect(body.data.userId).toBeNull();
    expect(body.data.items).toEqual([]);
    guestToken = body.data.guestToken;
    expect(created.headers.get(CART_TOKEN_HEADER)).toBe(guestToken);

    const get = await getCart(
      new Request("http://localhost:3002/v1/carts/current", {
        headers: { [CART_TOKEN_HEADER]: guestToken },
      }),
    );
    const getBody = await get.json();
    expect(get.status).toBe(200);
    expect(getBody.data.id).toBe(body.data.id);
  });

  it("adds, updates, removes, and clears guest cart items with DB pricing", async () => {
    const add = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({
          variantId: variantA,
          quantity: 2,
          unitPrice: { amountMinor: "1", currencyCode: "INR" },
        }),
      }),
    );
    const added = await add.json();
    expect(add.status).toBe(200);
    expect(added.data.items).toHaveLength(1);
    expect(added.data.items[0].quantity).toBe(2);
    expect(added.data.items[0].unitPrice.amountMinor).toBe("15000");
    expect(added.data.items[0].lineTotal.amountMinor).toBe("30000");
    expect(added.data.subtotal.amountMinor).toBe("30000");
    expect(JSON.stringify(added)).not.toMatch(/passwordHash|sessionToken|storageKey/i);

    const dup = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: variantA, quantity: 3 }),
      }),
    );
    const dupBody = await dup.json();
    expect(dupBody.data.items).toHaveLength(1);
    expect(dupBody.data.items[0].quantity).toBe(5);

    const patch = await patchItem(
      new Request(`http://localhost:3002/v1/carts/current/items/${variantA}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ quantity: 4 }),
      }),
      { params: Promise.resolve({ itemId: variantA }) },
    );
    const patched = await patch.json();
    expect(patched.data.items[0].quantity).toBe(4);
    expect(patched.data.items[0].lineTotal.amountMinor).toBe("60000");

    const remove = await removeItem(
      new Request(`http://localhost:3002/v1/carts/current/items/${variantA}`, {
        method: "DELETE",
        headers: { [CART_TOKEN_HEADER]: guestToken },
      }),
      { params: Promise.resolve({ itemId: variantA }) },
    );
    const removed = await remove.json();
    expect(removed.data.items).toHaveLength(0);

    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: variantA, quantity: 1 }),
      }),
    );
    const cleared = await clearCart(
      new Request("http://localhost:3002/v1/carts/current", {
        method: "DELETE",
        headers: { [CART_TOKEN_HEADER]: guestToken },
      }),
    );
    const clearBody = await cleared.json();
    expect(clearBody.data.items).toHaveLength(0);
  });

  it("rejects inactive products and handles missing price / quantity zero", async () => {
    const bad = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: draftVariant, quantity: 1 }),
      }),
    );
    expect(bad.status).toBe(404);

    const noPrice = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: variantNoPrice, quantity: 1 }),
      }),
    );
    const noPriceBody = await noPrice.json();
    expect(noPrice.status).toBe(200);
    expect(noPriceBody.data.items[0].availability).toBe("PRICE_UNAVAILABLE");
    expect(noPriceBody.data.subtotal).toBeNull();

    const zero = await patchItem(
      new Request(`http://localhost:3002/v1/carts/current/items/${variantNoPrice}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ quantity: 0 }),
      }),
      { params: Promise.resolve({ itemId: variantNoPrice }) },
    );
    const zeroBody = await zero.json();
    expect(zeroBody.data.items.every((i: { variantId: string }) => i.variantId !== variantNoPrice)).toBe(
      true,
    );
  });

  it("marks stale catalogue items without silently removing them", async () => {
    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: guestToken,
        },
        body: JSON.stringify({ variantId: variantB, quantity: 1 }),
      }),
    );

    await prisma.product.update({
      where: { id: productA },
      data: { status: "ARCHIVED" },
    });

    const get = await getCart(
      new Request("http://localhost:3002/v1/carts/current?currency=INR", {
        headers: { [CART_TOKEN_HEADER]: guestToken },
      }),
    );
    const body = await get.json();
    const item = body.data.items.find((i: { variantId: string }) => i.variantId === variantB);
    expect(item).toBeTruthy();
    expect(item.availability).toBe("PRODUCT_UNAVAILABLE");
    expect(item.available).toBe(false);

    await prisma.product.update({
      where: { id: productA },
      data: { status: "ACTIVE", publishedAt: new Date() },
    });
  });

  it("supports customer carts with isolation", async () => {
    const add = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ variantId: variantA, quantity: 2 }),
      }),
    );
    const added = await add.json();
    expect(add.status).toBe(200);
    expect(added.data.userId).toBe(userIdA);
    expect(added.data.guestToken).toBeNull();
    expect(added.data.items[0].quantity).toBe(2);

    const other = await getCart(
      new Request("http://localhost:3002/v1/carts/current", {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieB}` },
      }),
    );
    // B may have no cart yet
    expect([200, 404]).toContain(other.status);
    if (other.status === 200) {
      const otherBody = await other.json();
      expect(otherBody.data.items.some((i: { variantId: string }) => i.variantId === variantA)).toBe(
        false,
      );
    }
  });

  it("merges guest cart into customer cart with quantity cap and invalidation", async () => {
    const guestCreate = await createCart(
      new Request("http://localhost:3002/v1/carts?currency=INR", { method: "POST" }),
    );
    const guestBody = await guestCreate.json();
    const mergeToken = guestBody.data.guestToken as string;

    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: mergeToken,
        },
        body: JSON.stringify({ variantId: variantA, quantity: 900 }),
      }),
    );
    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: mergeToken,
        },
        body: JSON.stringify({ variantId: variantB, quantity: 1 }),
      }),
    );

    // Ensure customer A has a high qty so merge must cap
    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ variantId: variantA, quantity: 200 }),
      }),
    );

    const merge = await mergeCart(
      new Request("http://localhost:3002/v1/carts/merge", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${CUSTOMER_SESSION_COOKIE}=${cookieA}`,
        },
        body: JSON.stringify({ guestToken: mergeToken }),
      }),
    );
    const merged = await merge.json();
    expect(merge.status).toBe(200);
    const lineA = merged.data.items.find((i: { variantId: string }) => i.variantId === variantA);
    const lineB = merged.data.items.find((i: { variantId: string }) => i.variantId === variantB);
    expect(lineA.quantity).toBe(999); // prior customer qty + 900 capped
    expect(lineB.quantity).toBe(1);

    const guestGone = await getCart(
      new Request("http://localhost:3002/v1/carts/current", {
        headers: { [CART_TOKEN_HEADER]: mergeToken },
      }),
    );
    expect(guestGone.status).toBe(404);

    const unauthMerge = await mergeCart(
      new Request("http://localhost:3002/v1/carts/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestToken: mergeToken }),
      }),
    );
    expect(unauthMerge.status).toBe(401);
  });

  it("caps quantity on duplicate add at CART_MAX_QUANTITY", async () => {
    const created = await createCart(
      new Request("http://localhost:3002/v1/carts?currency=INR", { method: "POST" }),
    );
    const body = await created.json();
    const token = body.data.guestToken as string;

    await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({ variantId: variantB, quantity: 900 }),
      }),
    );
    const again = await addItem(
      new Request("http://localhost:3002/v1/carts/current/items?currency=INR", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CART_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({ variantId: variantB, quantity: 200 }),
      }),
    );
    const againBody = await again.json();
    expect(againBody.data.items[0].quantity).toBe(999);
  });
});
