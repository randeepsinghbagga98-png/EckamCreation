import "./lib/preload-env";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEVELOPMENT_AI_MESSAGE,
  createEckamAiService,
} from "@eckamcreation/ai";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as createConversation } from "./app/v1/ai/conversations/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { getCategoryService, getProductService, resetCatalogueServices } from "./lib/catalogue";
import {
  getAiConversationService,
  getAiToolRegistry,
  getDevelopmentAiProvider,
  resetAiServices,
} from "./lib/ai";
import {
  CATALOGUE_COMPARE_PRODUCTS,
  CATALOGUE_GET_CATEGORIES,
  CATALOGUE_GET_PRODUCT,
  CATALOGUE_GET_PRODUCTS_BY_CATEGORY,
  CATALOGUE_SEARCH_PRODUCTS,
  createCatalogueAiTools,
} from "./lib/ai/catalogue-tools";
import {
  COMMERCE_ADD_TO_CART,
  COMMERCE_ADD_TO_WISHLIST,
  COMMERCE_REMOVE_FROM_CART,
  COMMERCE_REMOVE_FROM_WISHLIST,
  COMMERCE_UPDATE_CART_QUANTITY,
} from "./lib/ai/commerce-tools";
import {
  CUSTOMER_CANCEL_ORDER,
  CUSTOMER_GET_ORDER,
  CUSTOMER_GET_ORDER_STATUS,
  CUSTOMER_GET_ORDER_TRACKING,
  CUSTOMER_GET_PROFILE,
  CUSTOMER_GET_RECENT_ORDERS,
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

function authed(cookie: string): HeadersInit {
  return {
    cookie: `${CUSTOMER_SESSION_COOKIE}=${cookie}`,
    "content-type": "application/json",
  };
}

function assertNoSecrets(value: unknown) {
  const text = JSON.stringify(value);
  expect(text).not.toContain("AI_API_KEY");
  expect(text).not.toContain("passwordHash");
  expect(text).not.toContain("DATABASE_URL");
  expect(text).not.toMatch(/sk-/);
  expect(text).not.toMatch(/onHand|reserved|storageKey|supplier/i);
}

describeDb("AI catalogue tools", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const draftSlug = `ai-unpublished-bag-${suffix}`;
  const context = { conversationId: `conv_tools_${suffix}` };
  let draftId = "";
  let cookie = "";
  let conversationId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetCatalogueServices();
    resetAiServices();
    setRateLimiter(createAuthRateLimiter());

    const draft = await prisma.product.create({
      data: {
        slug: draftSlug,
        name: `Unpublished Secret Bag ${suffix}`,
        description: "Must never appear in AI catalogue tools.",
        status: "DRAFT",
      },
    });
    draftId = draft.id;

    const reg = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `ai_tools_${suffix}@example.com`,
          password: "Secret123",
          name: "AI Tools Customer",
        }),
      }),
    );
    expect(reg.status).toBe(201);
    cookie = cookieFrom(reg, CUSTOMER_SESSION_COOKIE);
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.aiToolCall.deleteMany({ where: { conversationId } });
      await prisma.aiMessage.deleteMany({ where: { conversationId } });
      await prisma.aiConversation.deleteMany({ where: { id: conversationId } });
    }
    if (draftId) {
      await prisma.product.delete({ where: { id: draftId } }).catch(() => undefined);
    }
    resetAiServices();
    resetCatalogueServices();
  });

  function tools() {
    return createCatalogueAiTools({
      products: getProductService(),
      categories: getCategoryService(),
    });
  }

  function byName(name: string) {
    return tools().find((tool) => tool.name === name)!;
  }

  it("registers catalogue and commerce tools on the server-side registry", () => {
    const registry = getAiToolRegistry();
    const names = registry.list().map((tool) => tool.name).sort();
    expect(names).toEqual([
      CATALOGUE_COMPARE_PRODUCTS,
      CATALOGUE_GET_CATEGORIES,
      CATALOGUE_GET_PRODUCT,
      CATALOGUE_GET_PRODUCTS_BY_CATEGORY,
      CATALOGUE_SEARCH_PRODUCTS,
      COMMERCE_ADD_TO_CART,
      COMMERCE_ADD_TO_WISHLIST,
      COMMERCE_REMOVE_FROM_CART,
      COMMERCE_REMOVE_FROM_WISHLIST,
      COMMERCE_UPDATE_CART_QUANTITY,
      CUSTOMER_CANCEL_ORDER,
      CUSTOMER_GET_ORDER,
      CUSTOMER_GET_ORDER_STATUS,
      CUSTOMER_GET_ORDER_TRACKING,
      CUSTOMER_GET_PROFILE,
      CUSTOMER_GET_RECENT_ORDERS,
    ].sort());
    expect(createEckamAiService).toBeTypeOf("function");
  });

  it("searches real published products", async () => {
    const result = await byName(CATALOGUE_SEARCH_PRODUCTS).execute({ query: "bag", limit: 8 }, context);
    expect(result.ok).toBe(true);
    const products = (result.data as { products: Array<{ slug: string; name: string; price: string | null }> })
      .products;
    expect(products.length).toBeGreaterThan(0);
    expect(products.some((item) => item.slug === "noir-compact-bag")).toBe(true);
    expect(products.some((item) => item.slug === draftSlug)).toBe(false);
    expect(products.every((item) => item.price === null || /^\d+$/.test(item.price))).toBe(true);
    assertNoSecrets(result);
  });

  it("returns a real product by slug", async () => {
    const result = await byName(CATALOGUE_GET_PRODUCT).execute(
      { slug: "cream-structured-tote" },
      context,
    );
    expect(result.ok).toBe(true);
    const product = (result.data as { product: { slug: string; name: string; defaultVariantId: string | null } })
      .product;
    expect(product.slug).toBe("cream-structured-tote");
    expect(product.name.toLowerCase()).toContain("cream");
    expect(product.defaultVariantId).toBeTruthy();
    assertNoSecrets(result);
  });

  it("compares two real published products", async () => {
    const result = await byName(CATALOGUE_COMPARE_PRODUCTS).execute(
      { productIds: ["cream-structured-tote", "noir-compact-bag"] },
      context,
    );
    expect(result.ok).toBe(true);
    const products = (result.data as { products: Array<{ slug: string; name: string }> }).products;
    expect(products).toHaveLength(2);
    expect(products.map((item) => item.slug).sort()).toEqual(["cream-structured-tote", "noir-compact-bag"]);
    expect(JSON.stringify(result)).not.toMatch(/unpublished|secret bag/i);
    assertNoSecrets(result);
  });

  it("compares three or four real products and rejects unpublished or invalid ones", async () => {
    const many = await byName(CATALOGUE_COMPARE_PRODUCTS).execute(
      {
        productIds: [
          "cream-structured-tote",
          "noir-compact-bag",
          "tan-carryall",
          "linen-accent-cushion",
        ],
      },
      context,
    );
    expect(many.ok).toBe(true);
    expect((many.data as { products: unknown[] }).products).toHaveLength(4);

    const unpublished = await byName(CATALOGUE_COMPARE_PRODUCTS).execute(
      { productIds: ["cream-structured-tote", draftSlug] },
      context,
    );
    expect(unpublished.ok).toBe(false);
    expect(JSON.stringify(unpublished)).not.toContain("Must never appear");

    const missing = await byName(CATALOGUE_COMPARE_PRODUCTS).execute(
      { productIds: ["cream-structured-tote", "does-not-exist-xyz"] },
      context,
    );
    expect(missing.ok).toBe(false);
  });

  it("returns a controlled error for an invalid product slug", async () => {
    const result = await byName(CATALOGUE_GET_PRODUCT).execute(
      { slug: "does-not-exist-xyz" },
      context,
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_TOOL_EXECUTION_FAILED");
    expect(result.error?.message).toBe("Product not found");
    expect(JSON.stringify(result)).not.toMatch(/prisma|stack|DATABASE_URL/i);
  });

  it("returns real published categories", async () => {
    const result = await byName(CATALOGUE_GET_CATEGORIES).execute({}, context);
    expect(result.ok).toBe(true);
    const categories = (result.data as { categories: Array<{ slug: string; name: string }> }).categories;
    expect(categories.some((item) => item.slug === "bags-lifestyle")).toBe(true);
    expect(categories.some((item) => item.slug === "jewellery-accessories")).toBe(true);
    expect(categories.every((item) => !("productCount" in item))).toBe(true);
    assertNoSecrets(result);
  });

  it("returns real products for jewellery and home categories", async () => {
    const jewellery = await byName(CATALOGUE_GET_PRODUCTS_BY_CATEGORY).execute(
      { category: "jewellery" },
      context,
    );
    expect(jewellery.ok).toBe(true);
    const jewelleryProducts = (
      jewellery.data as { products: Array<{ slug: string }>; category: { slug: string } }
    ).products;
    expect(jewellery.data).toMatchObject({ category: { slug: "jewellery-accessories" } });
    expect(jewelleryProducts.some((item) => item.slug === "pearl-drop-earrings")).toBe(true);

    const home = await byName(CATALOGUE_GET_PRODUCTS_BY_CATEGORY).execute(
      { category: "home" },
      context,
    );
    expect(home.ok).toBe(true);
    const homeProducts = (home.data as { products: Array<{ slug: string }> }).products;
    expect(homeProducts.some((item) => item.slug === "linen-accent-cushion")).toBe(true);
  });

  it("excludes unpublished products from search and product lookup", async () => {
    const search = await byName(CATALOGUE_SEARCH_PRODUCTS).execute(
      { query: `Unpublished Secret Bag ${suffix}` },
      context,
    );
    expect(search.ok).toBe(true);
    const products = (search.data as { products: Array<{ slug: string }> }).products;
    expect(products).toEqual([]);

    const lookup = await byName(CATALOGUE_GET_PRODUCT).execute({ slug: draftSlug }, context);
    expect(lookup.ok).toBe(false);
    expect(lookup.error?.message).toBe("Product not found");
  });

  it("rejects invalid tool arguments without executing catalogue work", async () => {
    const result = byName(CATALOGUE_SEARCH_PRODUCTS).execute({ query: "" }, context);
    await expect(result).rejects.toMatchObject({ code: "AI_TOOL_INVALID_ARGUMENTS" });
  });

  it("sanitizes tool execution failures", async () => {
    const result = await byName(CATALOGUE_GET_PRODUCT).execute({ slug: "missing" }, context);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.error)).not.toMatch(/prisma|password|secret|stack/i);
  });

  it("lets a conversation execute a real catalogue tool and audit the call", async () => {
    const provider = getDevelopmentAiProvider();
    expect(provider).toBeTruthy();
    provider!.queueToolCalls([
      { toolName: CATALOGUE_SEARCH_PRODUCTS, arguments: { query: "cream structured tote" } },
    ]);

    const response = await createConversation(
      new Request("http://localhost:3002/v1/ai/conversations", {
        method: "POST",
        headers: authed(cookie),
        body: JSON.stringify({
          channel: "web",
          content: "Do you have the cream structured tote?",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    conversationId = body.data.id;
    expect(body.data.messages.at(-1)?.content).toBe(DEVELOPMENT_AI_MESSAGE);
    const assistantProducts = body.data.messages.at(-1)?.products ?? [];
    expect(assistantProducts.some((product: { slug?: string }) => product.slug === "cream-structured-tote")).toBe(
      true,
    );
    expect(JSON.stringify(body.data.messages.at(-1))).not.toContain("catalogue.search_products");

    const audited = await prisma.aiToolCall.findMany({
      where: { conversationId },
    });
    expect(audited).toHaveLength(1);
    expect(audited[0]?.toolName).toBe(CATALOGUE_SEARCH_PRODUCTS);
    expect(audited[0]?.success).toBe(true);
    expect(audited[0]?.argsJson).toMatchObject({ query: "cream structured tote" });
    expect(audited[0]?.resultSummary).toMatch(/^products:\d+$/);
    expect(audited[0]?.messageId).toBeTruthy();
    assertNoSecrets(body);
    assertNoSecrets(audited[0]);
    expect(getAiConversationService()).toBeTruthy();
  });
});
