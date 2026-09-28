import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  StaffAuthService,
  MemoryStaffSessionStore,
  PERMISSIONS,
  assertStaffPermission,
  AuthError,
  ensureRbacCatalog,
} from "@eckamcreation/auth";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as login } from "./app/v1/auth/login/route";
import { POST as logout } from "./app/v1/auth/logout/route";
import { GET as session } from "./app/v1/auth/session/route";
import { POST as staffLogin } from "./app/v1/auth/staff/login/route";
import { GET as staffSession } from "./app/v1/auth/staff/session/route";
import { POST as staffLogout } from "./app/v1/auth/staff/logout/route";
import { CUSTOMER_SESSION_COOKIE, STAFF_SESSION_COOKIE } from "./lib/auth/cookies";
import { requireAuthenticatedUser, requirePermission, requireStaff } from "./lib/auth/guards";
import { resetAuthServices } from "./lib/auth/services";
import { ApiError } from "./lib/errors";
import {
  AUTH_RATE_LIMIT_BUCKET,
  createAuthRateLimiter,
  MemoryRateLimiter,
} from "./lib/auth/rate-limit-auth";
import { setRateLimiter } from "./lib/rate-limit";

function loadEnv() {
  const file = resolve(process.cwd(), ".env.local");
  const alt = resolve(process.cwd(), "../../.env.local");
  for (const path of [file, alt]) {
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

function cookieFrom(response: Response, name: string): string | null {
  const headers = response.headers.getSetCookie?.() ?? [];
  for (const row of headers) {
    if (row.startsWith(`${name}=`)) {
      return row.split(";")[0]!.slice(name.length + 1);
    }
  }
  // Fallback for environments without getSetCookie
  const single = response.headers.get("set-cookie");
  if (!single) return null;
  const match = single.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

describeDb("customer auth (db)", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `customer_${suffix}@example.com`;
  const password = "Secret123";
  let customerCookie = "";

  beforeAll(() => {
    resetAuthServices();
    setRateLimiter(createAuthRateLimiter());
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email } } });
    await prisma.customerProfile.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers a customer and sets session cookie without returning password/hash/token", async () => {
    const res = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: "Test Customer" }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/password|scrypt\$|sessionToken/i);
    customerCookie = cookieFrom(res, CUSTOMER_SESSION_COOKIE) ?? "";
    expect(customerCookie.length).toBeGreaterThan(10);
  });

  it("rejects duplicate registration", async () => {
    const res = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("logs in with valid credentials", async () => {
    const res = await login(
      new Request("http://localhost:3002/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.email).toBe(email);
    customerCookie = cookieFrom(res, CUSTOMER_SESSION_COOKIE) ?? customerCookie;
  });

  it("rejects invalid credentials", async () => {
    const res = await login(
      new Request("http://localhost:3002/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "WrongPass1" }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns current session", async () => {
    const res = await session(
      new Request("http://localhost:3002/v1/auth/session", {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerCookie}` },
      }),
    );
    const body = await res.json();
    expect(body.data.authenticated).toBe(true);
    expect(body.data.session.userId).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/password|scrypt\$|sessionToken/i);
  });

  it("logs out and revokes session", async () => {
    const res = await logout(
      new Request("http://localhost:3002/v1/auth/logout", {
        method: "POST",
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerCookie}` },
      }),
    );
    expect(res.status).toBe(200);
    const after = await session(
      new Request("http://localhost:3002/v1/auth/session", {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerCookie}` },
      }),
    );
    const body = await after.json();
    expect(body.data.authenticated).toBe(false);
  });
});

describeDb("staff auth + rbac (db)", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const staffEmail = `staff_${suffix}@eckam.local`;
  const staffPassword = "StaffPass1";
  const analystEmail = `analyst_${suffix}@eckam.local`;
  let staffCookie = "";
  let staffId = "";
  let analystCookie = "";
  const store = new MemoryStaffSessionStore();

  beforeAll(async () => {
    resetAuthServices();
    setRateLimiter(createAuthRateLimiter());
    await ensureRbacCatalog(prisma);
    const staffAuth = new StaffAuthService(prisma, store);
    const admin = await staffAuth.createStaffUser({
      email: staffEmail,
      name: "Admin User",
      password: staffPassword,
      roleCodes: ["admin"],
      status: "ACTIVE",
    });
    staffId = admin.id;
    await staffAuth.createStaffUser({
      email: analystEmail,
      name: "Analyst User",
      password: staffPassword,
      roleCodes: ["analyst"],
      status: "ACTIVE",
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ staffUserId: staffId }, { staffUser: { email: { in: [staffEmail, analystEmail] } } }] },
    });
    await prisma.staffUserRole.deleteMany({
      where: { staffUser: { email: { in: [staffEmail, analystEmail] } } },
    });
    await prisma.staffUser.deleteMany({ where: { email: { in: [staffEmail, analystEmail] } } });
    store.clear();
    await prisma.$disconnect();
  });

  it("authenticates staff and returns roles/permissions without secrets", async () => {
    // Use service directly then hit HTTP with cookie — staff auth service uses default store in routes.
    // Align route store with global default by logging in via HTTP after creating users in default store service.
    resetAuthServices();
    const res = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ email: staffEmail, password: staffPassword }),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.kind).toBe("staff");
    expect(body.data.roles).toContain("admin");
    expect(body.data.permissions).toContain(PERMISSIONS.PRODUCTS_WRITE);
    expect(JSON.stringify(body)).not.toMatch(/password|scrypt\$|sessionToken/i);
    staffCookie = cookieFrom(res, STAFF_SESSION_COOKIE) ?? "";
    expect(staffCookie.length).toBeGreaterThan(10);
  });

  it("keeps customer and staff sessions separate", async () => {
    const customerReq = new Request("http://localhost:3002/", {
      headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
    });
    await expect(requireAuthenticatedUser(customerReq)).rejects.toBeInstanceOf(ApiError);

    const staffReq = new Request("http://localhost:3002/", {
      headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
    });
    const staff = await requireStaff(staffReq);
    expect(staff.email).toBe(staffEmail);
  });

  it("returns 401 when unauthenticated for staff guards", async () => {
    await expect(requireStaff(new Request("http://localhost:3002/"))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns 403 when staff lacks permission", async () => {
    resetAuthServices();
    const loginRes = await staffLogin(
      new Request("http://localhost:3002/v1/auth/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({ email: analystEmail, password: staffPassword }),
      }),
    );
    analystCookie = cookieFrom(loginRes, STAFF_SESSION_COOKIE) ?? "";
    const req = new Request("http://localhost:3002/", {
      headers: { cookie: `${STAFF_SESSION_COOKIE}=${analystCookie}` },
    });
    await expect(requirePermission(req, PERMISSIONS.PRODUCTS_WRITE)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows permitted staff actions", async () => {
    const req = new Request("http://localhost:3002/", {
      headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
    });
    const staff = await requirePermission(req, PERMISSIONS.PRODUCTS_WRITE);
    expect(() => assertStaffPermission(staff, PERMISSIONS.PRODUCTS_WRITE)).not.toThrow();
  });

  it("reads staff session and logs out", async () => {
    const sess = await staffSession(
      new Request("http://localhost:3002/v1/auth/staff/session", {
        headers: { cookie: `${STAFF_SESSION_COOKIE}=${staffCookie}` },
      }),
    );
    const body = await sess.json();
    expect(body.data.authenticated).toBe(true);

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
    expect((await after.json()).data.authenticated).toBe(false);
  });

  it("writes audit logs for staff login without secrets", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { action: { in: ["staff.login", "staff.login_failed", "staff.logout"] }, staffUser: { email: staffEmail } },
      take: 5,
    });
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      expect(JSON.stringify(log.metadata ?? {})).not.toMatch(/password|scrypt\$|tok_/i);
    }
  });
});

describe("auth rate limiting policy", () => {
  it("protects auth bucket", async () => {
    const limiter = new MemoryRateLimiter({
      [AUTH_RATE_LIMIT_BUCKET]: { max: 2, windowMs: 60_000 },
    });
    await limiter.check({ bucket: AUTH_RATE_LIMIT_BUCKET, key: "t" });
    await limiter.check({ bucket: AUTH_RATE_LIMIT_BUCKET, key: "t" });
    const third = await limiter.check({ bucket: AUTH_RATE_LIMIT_BUCKET, key: "t" });
    expect(third.allowed).toBe(false);
  });
});

describe("service-level customer auth errors", () => {
  it("maps AuthError codes", () => {
    expect(new AuthError("INVALID_CREDENTIALS", "x").code).toBe("INVALID_CREDENTIALS");
  });
});
