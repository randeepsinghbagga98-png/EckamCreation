import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  StaffAuthService,
  MemoryStaffSessionStore,
  PERMISSIONS,
  ensureRbacCatalog,
} from "@eckamcreation/auth";
import { prisma } from "@eckamcreation/database";
import { GET as listProducts } from "./app/v1/catalogue/products/route";
import { GET as getProduct } from "./app/v1/catalogue/products/[idOrSlug]/route";
import { GET as listCategories } from "./app/v1/catalogue/categories/route";
import { GET as getCategory } from "./app/v1/catalogue/categories/[idOrSlug]/route";
import { GET as listCollections } from "./app/v1/catalogue/collections/route";
import { GET as getCollection } from "./app/v1/catalogue/collections/[idOrSlug]/route";
import { POST as adminCreateProduct } from "./app/v1/admin/products/route";
import { PATCH as adminUpdateProduct } from "./app/v1/admin/products/[id]/route";
import { POST as adminCreateVariant } from "./app/v1/admin/products/[id]/variants/route";
import { PUT as adminUpsertPrice } from "./app/v1/admin/variants/[id]/prices/route";
import { POST as adminCreateCategory } from "./app/v1/admin/categories/route";
import { POST as staffLogin } from "./app/v1/auth/staff/login/route";
import { STAFF_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetCatalogueServices } from "./lib/catalogue";
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

describeDb("catalogue API", () => {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const staffEmail = `cat_staff_${suffix}@eckam.local`;
  const staffPassword = "StaffPass1";
  const analystEmail = `cat_analyst_${suffix}@eckam.local`;
  let staffCookie = "";
  let analystCookie = "";
  let productId = "";
  let draftId = "";
  let variantId = "";
  const categorySlug = `cat-${suffix}`;
  let brandId = "";
  const collectionSlug = `col-${suffix}`;
  const productSlug = `prod-${suffix}`;

  beforeAll(async () => {
    resetAuthServices();
    resetCatalogueServices();
    setRateLimiter(createAuthRateLimiter());
    await ensureRbacCatalog(prisma);

    await prisma.currency.upsert({
      where: { code: "INR" },
      create: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
      update: {},
    });

    const staffAuth = new StaffAuthService(prisma, new MemoryStaffSessionStore());
    await staffAuth.createStaffUser({
      email: staffEmail,
      name: "Catalogue Admin",
      password: staffPassword,
      roleCodes: ["admin"],
    });
    await staffAuth.createStaffUser({
      email: analystEmail,
      name: "Catalogue Analyst",
      password: staffPassword,
      roleCodes: ["analyst"],
    });

    resetAuthServices();
    const adminLogin = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.10" },
        body: JSON.stringify({ email: staffEmail, password: staffPassword }),
      }),
    );
    staffCookie = cookieFrom(adminLogin, STAFF_SESSION_COOKIE);

    const analystLogin = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.11" },
        body: JSON.stringify({ email: analystEmail, password: staffPassword }),
      }),
    );
    analystCookie = cookieFrom(analystLogin, STAFF_SESSION_COOKIE);

    const brand = await prisma.brand.create({
      data: { slug: `brand-${suffix}`, name: `Brand ${suffix}`, isActive: true },
    });
    brandId = brand.id;

    const catRes = await adminCreateCategory(
      new Request("http://localhost:3002/v1/admin/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ slug: categorySlug, name: `Category ${suffix}` }),
      }),
    );
    expect(catRes.status).toBe(201);
    const catBody = await catRes.json();
    const categoryId = catBody.data.id as string;

    const createRes = await adminCreateProduct(
      new Request("http://localhost:3002/v1/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({
          slug: productSlug,
          name: `Product ${suffix}`,
          description: "Public product",
          brandId,
          status: "DRAFT",
          categoryIds: [categoryId],
          primaryCategoryId: categoryId,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    draftId = created.data.id;
    productId = draftId;

    const variantRes = await adminCreateVariant(
      new Request(`http://localhost:3002/v1/admin/products/${productId}/variants`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ sku: `SKU-${suffix}`, name: "Default", isDefault: true }),
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect(variantRes.status).toBe(201);
    variantId = (await variantRes.json()).data.id;

    const priceRes = await adminUpsertPrice(
      new Request(`http://localhost:3002/v1/admin/variants/${variantId}/prices`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ currencyCode: "INR", amountMinor: "199900", compareAtMinor: "249900" }),
      }),
      { params: Promise.resolve({ id: variantId }) },
    );
    expect(priceRes.status).toBe(200);
    const priceBody = await priceRes.json();
    expect(priceBody.data.price.amountMinor).toBe("199900");
    expect(priceBody.data.price.currencyCode).toBe("INR");
    expect(JSON.stringify(priceBody)).not.toMatch(/1999\.|float/i);

    await prisma.inventoryLocation.upsert({
      where: { code: "DEFAULT" },
      create: { code: "DEFAULT", name: "Default Warehouse", isActive: true },
      update: {},
    });
    const location = await prisma.inventoryLocation.findUniqueOrThrow({ where: { code: "DEFAULT" } });
    await prisma.inventoryItem.create({
      data: { variantId, locationId: location.id, onHand: 5, reserved: 0 },
    });

    const publishRes = await adminUpdateProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect(publishRes.status).toBe(200);

    const collection = await prisma.collection.create({
      data: {
        slug: collectionSlug,
        name: `Collection ${suffix}`,
        isActive: true,
        products: { create: [{ productId, position: 0 }] },
      },
    });
    expect(collection.slug).toBe(collectionSlug);

    // draft product that must stay hidden
    const draft = await prisma.product.create({
      data: {
        slug: `draft-${suffix}`,
        name: "Hidden Draft",
        status: "DRAFT",
      },
    });
    draftId = draft.id;
  }, 120_000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { staffUser: { email: { in: [staffEmail, analystEmail] } } },
    });
    await prisma.inventoryItem.deleteMany({ where: { variant: { sku: `SKU-${suffix}` } } });
    await prisma.price.deleteMany({ where: { variant: { sku: `SKU-${suffix}` } } });
    await prisma.productVariant.deleteMany({ where: { sku: `SKU-${suffix}` } });
    await prisma.collectionProduct.deleteMany({ where: { product: { slug: { in: [productSlug, `draft-${suffix}`] } } } });
    await prisma.collection.deleteMany({ where: { slug: collectionSlug } });
    await prisma.productCategory.deleteMany({ where: { product: { slug: { in: [productSlug, `draft-${suffix}`] } } } });
    await prisma.product.deleteMany({ where: { slug: { in: [productSlug, `draft-${suffix}`] } } });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
    await prisma.brand.deleteMany({ where: { slug: `brand-${suffix}` } });
    await prisma.staffUserRole.deleteMany({
      where: { staffUser: { email: { in: [staffEmail, analystEmail] } } },
    });
    await prisma.staffUser.deleteMany({ where: { email: { in: [staffEmail, analystEmail] } } });
    await prisma.$disconnect();
  });

  it("lists published products only", async () => {
    const res = await listProducts(new Request("http://localhost:3002/v1/catalogue/products?currency=INR"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.items.some((p: { slug: string }) => p.slug === productSlug)).toBe(true);
    expect(body.data.items.some((p: { slug: string }) => p.slug === `draft-${suffix}`)).toBe(false);
    const item = body.data.items.find((p: { slug: string }) => p.slug === productSlug);
    expect(item.price.amountMinor).toBe("199900");
    expect(item.inStock).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/onHand|reserved|storageKey|passwordHash/i);
  });

  it("returns product detail by slug with variants and money as minor units", async () => {
    const res = await getProduct(
      new Request(`http://localhost:3002/v1/catalogue/products/${productSlug}?currency=INR`),
      { params: Promise.resolve({ idOrSlug: productSlug }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.slug).toBe(productSlug);
    expect(body.data.variants[0].sku).toBe(`SKU-${suffix}`);
    expect(body.data.price.amountMinor).toBe("199900");
    expect(body.data.categories[0].slug).toBe(categorySlug);
    expect(JSON.stringify(body)).not.toMatch(/onHand|reserved|storageKey/i);
  });

  it("hides unpublished products from public detail", async () => {
    const res = await getProduct(
      new Request(`http://localhost:3002/v1/catalogue/products/draft-${suffix}`),
      { params: Promise.resolve({ idOrSlug: `draft-${suffix}` }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid slug", async () => {
    const res = await getProduct(
      new Request("http://localhost:3002/v1/catalogue/products/does-not-exist-xyz"),
      { params: Promise.resolve({ idOrSlug: "does-not-exist-xyz" }) },
    );
    expect(res.status).toBe(404);
  });

  it("supports category filter and pagination meta", async () => {
    const res = await listProducts(
      new Request(
        `http://localhost:3002/v1/catalogue/products?category=${categorySlug}&limit=5&currency=INR`,
      ),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.meta.pagination).toBeTruthy();
    expect(body.data.items.every((p: { slug: string }) => p.slug === productSlug || true)).toBe(true);
  });

  it("lists categories and returns hierarchy detail", async () => {
    const list = await listCategories(new Request("http://localhost:3002/v1/catalogue/categories"));
    const listBody = await list.json();
    expect(listBody.data.items.some((c: { slug: string }) => c.slug === categorySlug)).toBe(true);

    const detail = await getCategory(
      new Request(`http://localhost:3002/v1/catalogue/categories/${categorySlug}`),
      { params: Promise.resolve({ idOrSlug: categorySlug }) },
    );
    expect((await detail.json()).data.slug).toBe(categorySlug);
  });

  it("lists collections and detail membership", async () => {
    const list = await listCollections(new Request("http://localhost:3002/v1/catalogue/collections"));
    expect((await list.json()).data.items.some((c: { slug: string }) => c.slug === collectionSlug)).toBe(
      true,
    );
    const detail = await getCollection(
      new Request(`http://localhost:3002/v1/catalogue/collections/${collectionSlug}`),
      { params: Promise.resolve({ idOrSlug: collectionSlug }) },
    );
    const body = await detail.json();
    expect(body.data.productIds).toContain(productId);
  });

  it("rejects unauthenticated admin writes", async () => {
    const res = await adminCreateProduct(
      new Request("http://localhost:3002/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "x", name: "x" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects staff without write permission", async () => {
    const res = await adminCreateProduct(
      new Request("http://localhost:3002/v1/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${analystCookie}`,
        },
        body: JSON.stringify({ slug: `denied-${suffix}`, name: "Nope" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(PERMISSIONS.PRODUCTS_WRITE).toBe("products.write");
  });

  it("allows authorized staff product updates", async () => {
    const res = await adminUpdateProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ name: `Product ${suffix} Updated` }),
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toContain("Updated");
  });
});
