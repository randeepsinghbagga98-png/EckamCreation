import "./lib/preload-env";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaffAuthService, MemoryStaffSessionStore, ensureRbacCatalog } from "@eckamcreation/auth";
import { prisma } from "@eckamcreation/database";
import { POST as staffLogin } from "./app/v1/auth/staff/login/route";
import { POST as staffLogout } from "./app/v1/auth/staff/logout/route";
import { GET as staffSession } from "./app/v1/auth/staff/session/route";
import { POST as register } from "./app/v1/auth/register/route";
import { GET as adminDashboard } from "./app/v1/admin/dashboard/route";
import { GET as adminListProducts, POST as adminCreateProduct } from "./app/v1/admin/products/route";
import { GET as adminGetProduct, PATCH as adminUpdateProduct } from "./app/v1/admin/products/[id]/route";
import { POST as adminPublishProduct } from "./app/v1/admin/products/[id]/publish/route";
import { POST as adminUnpublishProduct } from "./app/v1/admin/products/[id]/unpublish/route";
import { GET as adminListCategories, POST as adminCreateCategory } from "./app/v1/admin/categories/route";
import { PATCH as adminUpdateCategory } from "./app/v1/admin/categories/[id]/route";
import { GET as adminListOrders } from "./app/v1/admin/orders/route";
import { GET as adminGetOrder } from "./app/v1/admin/orders/[id]/route";
import { PATCH as adminPatchOrderStatus } from "./app/v1/admin/orders/[id]/status/route";
import { GET as adminListCustomers } from "./app/v1/admin/customers/route";
import { GET as adminGetCustomer, PATCH as adminUpdateCustomer } from "./app/v1/admin/customers/[id]/route";
import { GET as adminListPayments } from "./app/v1/admin/payments/intents/route";
import { GET as adminListShipments } from "./app/v1/admin/shipments/route";
import { GET as adminSettings } from "./app/v1/admin/settings/route";
import { GET as adminAiStatus } from "./app/v1/admin/ai/status/route";
import { CUSTOMER_SESSION_COOKIE, STAFF_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import { resetAdminServices } from "./lib/admin";
import { resetCatalogueServices } from "./lib/catalogue";
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

async function jsonOf(response: Response) {
  return response.json();
}

describeDb("admin panel API", () => {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const staffEmail = `admin_panel_${suffix}@eckam.local`;
  const staffPassword = "StaffPass1";
  const customerEmail = `admin_cust_${suffix}@example.com`;
  const customerPassword = "Secret123";
  let staffCookie = "";
  let customerCookie = "";
  let productId = "";
  let categoryId = "";
  let customerId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetAdminServices();
    resetCatalogueServices();
    setRateLimiter(createAuthRateLimiter());
    await ensureRbacCatalog(prisma);
    const staffAuth = new StaffAuthService(prisma, new MemoryStaffSessionStore());
    await staffAuth.createStaffUser({
      email: staffEmail,
      name: "Panel Admin",
      password: staffPassword,
      roleCodes: ["admin"],
    });
    resetAuthServices();

    const loginRes = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ email: staffEmail, password: staffPassword }),
      }),
    );
    staffCookie = cookieFrom(loginRes, STAFF_SESSION_COOKIE);

    const registerRes = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
        body: JSON.stringify({ email: customerEmail, password: customerPassword, name: "Panel Customer" }),
      }),
    );
    const registerBody = await jsonOf(registerRes);
    customerCookie = cookieFrom(registerRes, CUSTOMER_SESSION_COOKIE);
    customerId = registerBody.data.userId;
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    if (productId) {
      await prisma.productCategory.deleteMany({ where: { productId } });
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    await prisma.session.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.customerProfile.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.user.deleteMany({ where: { email: customerEmail } });
    await prisma.staffUserRole.deleteMany({ where: { staffUser: { email: staffEmail } } });
    await prisma.staffUser.deleteMany({ where: { email: staffEmail } });
  });

  it("logs in admin and rejects a wrong password", async () => {
    const ok = await staffSession(
      new Request("http://localhost:3002/v1/auth/staff/session", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const okBody = await jsonOf(ok);
    expect(okBody.data.authenticated).toBe(true);
    expect(okBody.data.session.roles).toContain("admin");

    const bad = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({ email: staffEmail, password: "WrongPass1" }),
      }),
    );
    expect(bad.status).toBe(401);
  });

  it("denies customer and unauthenticated access to admin dashboard", async () => {
    const anon = await adminDashboard(new Request("http://localhost:3002/v1/admin/dashboard"));
    expect(anon.status).toBe(401);

    const customer = await adminDashboard(
      new Request("http://localhost:3002/v1/admin/dashboard", {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerCookie}` },
      }),
    );
    expect(customer.status).toBe(401);
  });

  it("allows admin dashboard metrics from the database", async () => {
    const res = await adminDashboard(
      new Request("http://localhost:3002/v1/admin/dashboard", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const body = await jsonOf(res);
    expect(res.status).toBe(200);
    expect(body.data.products.total).toEqual(expect.any(Number));
    expect(body.data.customers.total).toEqual(expect.any(Number));
    expect(body.data.orders.total).toEqual(expect.any(Number));
    expect(JSON.stringify(body)).not.toMatch(/password|sessionToken|AI_API_KEY/i);
  });

  it("creates, lists, searches, filters, edits, and publishes a product", async () => {
    const catRes = await adminCreateCategory(
      new Request("http://localhost:3002/v1/admin/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({
          slug: `panel-cat-${suffix}`,
          name: `Panel Cat ${suffix}`,
          isActive: true,
        }),
      }),
    );
    const catBody = await jsonOf(catRes);
    expect(catRes.status).toBe(201);
    categoryId = catBody.data.id;

    const created = await adminCreateProduct(
      new Request("http://localhost:3002/v1/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({
          slug: `panel-prod-${suffix}`,
          name: `Panel Product ${suffix}`,
          description: "Admin panel product",
          status: "DRAFT",
          categoryIds: [categoryId],
          primaryCategoryId: categoryId,
        }),
      }),
    );
    const createdBody = await jsonOf(created);
    expect(created.status).toBe(201);
    productId = createdBody.data.id;

    const list = await adminListProducts(
      new Request("http://localhost:3002/v1/admin/products?limit=20", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const listBody = await jsonOf(list);
    expect(listBody.data.items.some((item: { id: string }) => item.id === productId)).toBe(true);

    const search = await adminListProducts(
      new Request(`http://localhost:3002/v1/admin/products?q=Panel Product ${suffix}`, {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const searchBody = await jsonOf(search);
    expect(searchBody.data.items.some((item: { id: string }) => item.id === productId)).toBe(true);

    const filtered = await adminListProducts(
      new Request(
        `http://localhost:3002/v1/admin/products?status=DRAFT&category=panel-cat-${suffix}`,
        { headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` } },
      ),
    );
    const filteredBody = await jsonOf(filtered);
    expect(filteredBody.data.items.some((item: { id: string }) => item.id === productId)).toBe(true);

    const detail = await adminGetProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}`, {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect((await jsonOf(detail)).data.id).toBe(productId);

    const edited = await adminUpdateProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ description: "Updated admin product" }),
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect((await jsonOf(edited)).data.description).toBe("Updated admin product");

    const published = await adminPublishProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}/publish`, {
        method: "POST",
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect((await jsonOf(published)).data.status).toBe("ACTIVE");

    const unpublished = await adminUnpublishProduct(
      new Request(`http://localhost:3002/v1/admin/products/${productId}/unpublish`, {
        method: "POST",
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
      { params: Promise.resolve({ id: productId }) },
    );
    expect((await jsonOf(unpublished)).data.status).toBe("DRAFT");
  });

  it("rejects invalid product payloads and SQL-looking input that breaks the slug contract", async () => {
    const res = await adminCreateProduct(
      new Request("http://localhost:3002/v1/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({
          slug: "'; DROP TABLE products; --",
          name: "",
          status: "ACTIVE",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(body)).not.toMatch(/prisma|database url|stack/i);
  });

  it("lists and edits categories", async () => {
    const list = await adminListCategories(
      new Request("http://localhost:3002/v1/admin/categories", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const listBody = await jsonOf(list);
    expect(listBody.data.items.some((item: { id: string }) => item.id === categoryId)).toBe(true);

    const edited = await adminUpdateCategory(
      new Request(`http://localhost:3002/v1/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ description: "Updated category" }),
      }),
      { params: Promise.resolve({ id: categoryId }) },
    );
    expect((await jsonOf(edited)).data.description).toBe("Updated category");
  });

  it("lists orders without exposing unsupported mutations", async () => {
    const list = await adminListOrders(
      new Request("http://localhost:3002/v1/admin/orders?limit=5", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    expect(list.status).toBe(200);
    const listBody = await jsonOf(list);
    expect(Array.isArray(listBody.data.items)).toBe(true);

    if (listBody.data.items[0]) {
      const id = listBody.data.items[0].id;
      const detail = await adminGetOrder(
        new Request(`http://localhost:3002/v1/admin/orders/${id}`, {
          headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
        }),
        { params: Promise.resolve({ id }) },
      );
      expect((await jsonOf(detail)).data.id).toBe(id);

      const bad = await adminPatchOrderStatus(
        new Request(`http://localhost:3002/v1/admin/orders/${id}/status`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
          },
          body: JSON.stringify({ status: "HACKED" }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(bad.status).toBe(400);
    }
  });

  it("lists customers without password or session exposure", async () => {
    const list = await adminListCustomers(
      new Request(`http://localhost:3002/v1/admin/customers?q=${encodeURIComponent(customerEmail)}`, {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const listBody = await jsonOf(list);
    expect(list.status).toBe(200);
    expect(listBody.data.items.some((item: { email: string | null }) => item.email === customerEmail)).toBe(
      true,
    );
    expect(JSON.stringify(listBody)).not.toMatch(/password|passwordHash|sessionToken|eckam_session/i);

    const detail = await adminGetCustomer(
      new Request(`http://localhost:3002/v1/admin/customers/${customerId}`, {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    const detailBody = await jsonOf(detail);
    expect(detailBody.data.id).toBe(customerId);
    expect(JSON.stringify(detailBody)).not.toMatch(/passwordHash|sessionToken|AI_API_KEY/i);

    const escalate = await adminUpdateCustomer(
      new Request(`http://localhost:3002/v1/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({ role: "admin", userId: "someone-else" }),
      }),
      { params: Promise.resolve({ id: customerId }) },
    );
    expect(escalate.status).toBe(400);
  });

  it("returns real payment and shipment data without invented records", async () => {
    const payments = await adminListPayments(
      new Request("http://localhost:3002/v1/admin/payments/intents?limit=20", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const paymentBody = await jsonOf(payments);
    expect(payments.status).toBe(200);
    expect(Array.isArray(paymentBody.data.items)).toBe(true);
    expect(paymentBody.data.providerConfigured).toBe(false);
    expect(JSON.stringify(paymentBody)).not.toMatch(/razorpay|phonepe|stripe_secret|sk_live/i);

    const shipments = await adminListShipments(
      new Request("http://localhost:3002/v1/admin/shipments?limit=20", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const shipmentBody = await jsonOf(shipments);
    expect(shipments.status).toBe(200);
    expect(Array.isArray(shipmentBody.data.items)).toBe(true);
  });

  it("returns AI and settings status without secrets or conversations", async () => {
    const ai = await adminAiStatus(
      new Request("http://localhost:3002/v1/admin/ai/status", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const aiBody = await jsonOf(ai);
    expect(ai.status).toBe(200);
    expect(aiBody.data.featureStatus === "live" || aiBody.data.featureStatus === "not_configured").toBe(true);
    expect(JSON.stringify(aiBody)).not.toMatch(/AI_API_KEY|sk-[a-zA-Z0-9]{8,}|system prompt|you are eckam/i);
    expect(aiBody.data).not.toHaveProperty("conversations");
    expect(JSON.stringify(aiBody)).not.toMatch(/"messages"|"systemInstruction"/);

    const settings = await adminSettings(
      new Request("http://localhost:3002/v1/admin/settings", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const settingsBody = await jsonOf(settings);
    expect(settings.status).toBe(200);
    expect(settingsBody.data.defaultCurrencyCode).toBe("INR");
    expect(JSON.stringify(settingsBody)).not.toMatch(/ADMIN_PASSWORD|AI_API_KEY|DATABASE_URL/i);
  });

  it("rejects arbitrary path-like parent identifiers", async () => {
    const res = await adminCreateCategory(
      new Request("http://localhost:3002/v1/admin/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}`,
        },
        body: JSON.stringify({
          slug: `bad-parent-${suffix}`,
          name: "Bad parent",
          parentId: "../../etc/passwd",
        }),
      }),
    );
    expect([400, 422]).toContain(res.status);
  });

  it("does not bootstrap a second admin when staff already exist", async () => {
    const email = `bootstrap_${suffix}@eckam.local`;
    process.env.ADMIN_EMAIL = email;
    process.env.ADMIN_PASSWORD = "BootstrapPass1";
    await new StaffAuthService(prisma).ensureBootstrapAdmin();
    const created = await prisma.staffUser.findUnique({ where: { email } });
    expect(created).toBeNull();
  });

  it("logs out the staff session", async () => {
    await staffLogout(
      new Request("http://localhost:3002/v1/auth/staff/logout", {
        method: "POST",
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const after = await staffSession(
      new Request("http://localhost:3002/v1/auth/staff/session", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    expect((await jsonOf(after)).data.authenticated).toBe(false);

    const denied = await adminDashboard(
      new Request("http://localhost:3002/v1/admin/dashboard", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    expect(denied.status).toBe(401);
  });
});
