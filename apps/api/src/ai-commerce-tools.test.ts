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
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { getCartService, resetCartServices } from "./lib/cart";
import { getProductService, resetCatalogueServices } from "./lib/catalogue";
import { getCustomerService, resetCustomerServices } from "./lib/customer";
import {
  getDevelopmentAiProvider,
  resetAiServices,
} from "./lib/ai";
import {
  COMMERCE_ADD_TO_CART,
  COMMERCE_ADD_TO_WISHLIST,
  COMMERCE_REMOVE_FROM_CART,
  COMMERCE_REMOVE_FROM_WISHLIST,
  COMMERCE_UPDATE_CART_QUANTITY,
  createCommerceAiTools,
} from "./lib/ai/commerce-tools";
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

function commerceTools() {
  return createCommerceAiTools({
    cart: getCartService(),
    customers: getCustomerService(),
    products: getProductService(),
  });
}

function byName(name: string) {
  return commerceTools().find((tool) => tool.name === name)!;
}

describe("AI commerce tools (no database)", () => {
  it("rejects unknown fields and dangerous arguments", async () => {
    const tool = byName(COMMERCE_ADD_TO_CART);
    await expect(
      tool.execute({ variantId: "v1", quantity: 1, userId: "someone-else" }, { conversationId: "c1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
    await expect(
      tool.execute({ variantId: "v1", quantity: 0 }, { conversationId: "c1", userId: "u1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
    await expect(
      tool.execute({ variantId: "v1", quantity: -2 }, { conversationId: "c1", userId: "u1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
  });

  it("requires authentication for wishlist and cart actions", async () => {
    const cart = await byName(COMMERCE_ADD_TO_CART).execute(
      { variantId: "v1", quantity: 1 },
      { conversationId: "c1" },
    );
    expect(cart.ok).toBe(false);
    expect(cart.error?.code).toBe("AI_COMMERCE_ACTION_NOT_ALLOWED");

    const wishlist = await byName(COMMERCE_ADD_TO_WISHLIST).execute(
      { variantId: "v1" },
      { conversationId: "c1" },
    );
    expect(wishlist.ok).toBe(false);
    expect(wishlist.error?.code).toBe("AI_WISHLIST_AUTH_REQUIRED");
  });

  it("does not execute arbitrary tools", async () => {
    const registry = new AiToolRegistry();
    for (const tool of commerceTools()) {
      registry.register(tool);
    }
    await expect(
      registry.execute("http.request", { href: "https://example.com" }, { conversationId: "c1" }),
    ).rejects.toMatchObject({ code: "AI_TOOL_NOT_FOUND" });
  });
});

describeDb("AI commerce tools", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const contextA = { conversationId: `conv_com_a_${suffix}`, userId: "" };
  const contextB = { conversationId: `conv_com_b_${suffix}`, userId: "" };
  let userIdA = "";
  let userIdB = "";
  let variantA = "";
  let variantB = "";
  let multiVariantSlug = "";
  let toteVariant = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCatalogueServices();
    resetCartServices();
    resetCustomerServices();
    resetAiServices();
    setRateLimiter(createAuthRateLimiter());

    await prisma.currency.upsert({
      where: { code: "INR" },
      create: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
      update: {},
    });

    const product = await prisma.product.create({
      data: {
        slug: `ai-commerce-bag-${suffix}`,
        name: `AI Commerce Bag ${suffix}`,
        status: "ACTIVE",
        publishedAt: new Date(),
        variants: {
          create: [
            {
              sku: `AI-COM-A-${suffix}`,
              name: "Default",
              isDefault: true,
              isActive: true,
              prices: { create: { currencyCode: "INR", amountMinor: 199900n, isActive: true } },
            },
            {
              sku: `AI-COM-B-${suffix}`,
              name: "Tan",
              isActive: true,
              prices: { create: { currencyCode: "INR", amountMinor: 219900n, isActive: true } },
            },
          ],
        },
      },
      include: { variants: true },
    });
    multiVariantSlug = product.slug;
    variantA = product.variants.find((item) => item.isDefault)?.id ?? product.variants[0]!.id;
    variantB = product.variants.find((item) => !item.isDefault)?.id ?? product.variants[1]!.id;

    const tote = await getProductService().getPublicBySlugOrId("cream-structured-tote");
    toteVariant = tote.defaultVariantId ?? tote.variants[0]!.id;

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `ai_com_a_${suffix}@example.com`,
          password: "Secret123",
          name: "AI Commerce A",
        }),
      }),
    );
    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `ai_com_b_${suffix}@example.com`,
          password: "Secret123",
          name: "AI Commerce B",
        }),
      }),
    );
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
    const sessionA = await prisma.user.findFirst({ where: { email: `ai_com_a_${suffix}@example.com` } });
    const sessionB = await prisma.user.findFirst({ where: { email: `ai_com_b_${suffix}@example.com` } });
    userIdA = sessionA!.id;
    userIdB = sessionB!.id;
    contextA.userId = userIdA;
    contextB.userId = userIdB;
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [userIdA, userIdB] } } } }).catch(() => undefined);
    await prisma.cart.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } }).catch(() => undefined);
    await prisma.wishlistItem.deleteMany({ where: { wishlist: { userId: { in: [userIdA, userIdB] } } } }).catch(() => undefined);
    await prisma.wishlist.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } }).catch(() => undefined);
    if (multiVariantSlug) {
      const product = await prisma.product.findUnique({ where: { slug: multiVariantSlug } });
      if (product) {
        await prisma.price.deleteMany({ where: { variant: { productId: product.id } } });
        await prisma.productVariant.deleteMany({ where: { productId: product.id } });
        await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
      }
    }
    resetAiServices();
    resetCartServices();
    resetCustomerServices();
    resetCatalogueServices();
  });

  it("adds, updates, and removes a real variant using the cart service", async () => {
    const added = await byName(COMMERCE_ADD_TO_CART).execute(
      { variantId: variantA, quantity: 1 },
      contextA,
    );
    expect(added.ok).toBe(true);
    const addData = added.data as { quantity: number; cart: { itemCount: number; subtotal: { amountMinor: string } | null } };
    expect(addData.quantity).toBe(1);
    expect(addData.cart.itemCount).toBe(1);
    const serverCart = await getCartService().getCurrent({ kind: "customer", userId: userIdA });
    expect(serverCart.itemCount).toBe(1);
    expect(serverCart.subtotal?.amountMinor).toBe(addData.cart.subtotal?.amountMinor);

    const itemId = serverCart.items[0]!.id;
    const updated = await byName(COMMERCE_UPDATE_CART_QUANTITY).execute(
      { cartItemId: itemId, quantity: 2 },
      contextA,
    );
    expect(updated.ok).toBe(true);
    expect((updated.data as { quantity: number }).quantity).toBe(2);
    const afterUpdate = await getCartService().getCurrent({ kind: "customer", userId: userIdA });
    expect(afterUpdate.items[0]?.quantity).toBe(2);

    const removed = await byName(COMMERCE_REMOVE_FROM_CART).execute(
      { cartItemId: itemId },
      contextA,
    );
    expect(removed.ok).toBe(true);
    await expect(getCartService().getCurrent({ kind: "customer", userId: userIdA })).resolves.toMatchObject({
      itemCount: 0,
    });
  });

  it("rejects an invalid variant and keeps the cart authoritative", async () => {
    const result = await byName(COMMERCE_ADD_TO_CART).execute(
      { variantId: "var_does_not_exist", quantity: 1 },
      contextA,
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_VARIANT_NOT_FOUND");
    expect(JSON.stringify(result)).not.toMatch(/prisma|stack|DATABASE_URL/i);
  });

  it("rejects another customer's cart item", async () => {
    await byName(COMMERCE_ADD_TO_CART).execute({ variantId: variantA, quantity: 1 }, contextA);
    const ownerCart = await getCartService().getCurrent({ kind: "customer", userId: userIdA });
    const stolen = await byName(COMMERCE_UPDATE_CART_QUANTITY).execute(
      { cartItemId: ownerCart.items[0]!.id, quantity: 3 },
      contextB,
    );
    expect(stolen.ok).toBe(false);
    expect(stolen.error?.code).toBe("AI_CART_ITEM_NOT_FOUND");
    const stillOwner = await getCartService().getCurrent({ kind: "customer", userId: userIdA });
    expect(stillOwner.items[0]?.quantity).toBe(1);
  });

  it("asks for clarification when a slug has multiple variants", async () => {
    const result = await byName(COMMERCE_ADD_TO_CART).execute(
      { slug: multiVariantSlug, quantity: 1 },
      contextA,
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_VARIANT_AMBIGUOUS");
  });

  it("adds and removes a wishlist item for the authenticated owner only", async () => {
    const added = await byName(COMMERCE_ADD_TO_WISHLIST).execute({ variantId: variantA }, contextA);
    expect(added.ok).toBe(true);
    const list = await getCustomerService().getWishlist(userIdA);
    expect(list.items.some((item) => item.variantId === variantA)).toBe(true);

    const other = await byName(COMMERCE_REMOVE_FROM_WISHLIST).execute({ variantId: variantA }, contextB);
    expect(other.ok).toBe(false);
    expect(await getCustomerService().getWishlist(userIdA)).toMatchObject({
      items: expect.arrayContaining([expect.objectContaining({ variantId: variantA })]),
    });

    const removed = await byName(COMMERCE_REMOVE_FROM_WISHLIST).execute({ variantId: variantA }, contextA);
    expect(removed.ok).toBe(true);
  });

  it("does not mutate cart for a recommendation turn", async () => {
    const before = await getCartService().getCurrent({ kind: "customer", userId: userIdA }).catch(() => null);
    const provider = getDevelopmentAiProvider() ?? new DevelopmentAiProvider();
    const registry = new AiProviderRegistry();
    registry.register(provider);
    const tools = new AiToolRegistry();
    for (const tool of commerceTools()) tools.register(tool);
    const service = createEckamAiService(registry, null, tools);
    await service.completeTurn({
      conversationId: contextA.conversationId,
      userId: userIdA,
      messages: [{ role: "user", content: "I like the Cream Structured Tote." }],
    });
    const after = await getCartService().getCurrent({ kind: "customer", userId: userIdA }).catch(() => null);
    expect(after?.itemCount ?? 0).toBe(before?.itemCount ?? 0);
  });

  it("mutates cart only when the explicit add tool is executed", async () => {
    const provider = new DevelopmentAiProvider();
    provider.queueToolCalls([
      { toolName: COMMERCE_ADD_TO_CART, arguments: { variantId: toteVariant, quantity: 2 } },
    ]);
    const registry = new AiProviderRegistry();
    registry.register(provider);
    const tools = new AiToolRegistry();
    for (const tool of commerceTools()) tools.register(tool);
    const service = createEckamAiService(registry, null, tools);
    const result = await service.completeTurn({
      conversationId: `conv_explicit_${suffix}`,
      userId: userIdA,
      messages: [{ role: "user", content: "Add two Cream Structured Totes to my cart." }],
    });
    expect(result.toolCalls[0]?.status).toBe("success");
    const cart = await getCartService().getCurrent({ kind: "customer", userId: userIdA });
    expect(cart.items.some((item) => item.variantId === toteVariant && item.quantity >= 2)).toBe(true);
  });

  it("sanitizes commerce failures", async () => {
    const result = await byName(COMMERCE_REMOVE_FROM_CART).execute(
      { cartItemId: "item_missing" },
      contextA,
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_CART_ITEM_NOT_FOUND");
    expect(JSON.stringify(result)).not.toMatch(/prisma|stack|passwordHash|AI_API_KEY/i);
    expect(variantB).toBeTruthy();
  });
});
