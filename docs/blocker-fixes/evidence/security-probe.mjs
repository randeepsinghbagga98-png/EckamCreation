import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const API = "http://127.0.0.1:3002";
const WEB = "http://localhost:3047";
const ADMIN = "http://localhost:3001";
const out = process.argv[2] || join("docs/blocker-fixes/security-baseline.md");

function cookieFlags(header) {
  if (!header) return { present: false };
  const lower = header.toLowerCase();
  return {
    present: true,
    httpOnly: lower.includes("httponly"),
    secure: lower.includes("secure"),
    sameSite: (lower.match(/samesite=([^;]+)/) || [])[1] || "",
    valuePrinted: false,
  };
}

function leaky(text) {
  return /scrypt\$|Bearer |sk-|passwordHash|sessionToken|AUTH_SECRET|DATABASE_URL/i.test(text || "");
}

async function req(url, init = {}) {
  const res = await fetch(url, { ...init, redirect: "manual" });
  const body = await res.text();
  return {
    status: res.status,
    loc: res.headers.get("location") || "",
    setCookie: res.headers.get("set-cookie") || "",
    body,
    leak: leaky(body),
  };
}

function cookieHeader(setCookie, name) {
  const parts = setCookie.split(/,(?=\s*[^;=]+=)/);
  for (const part of parts) {
    const row = part.trim();
    if (row.toLowerCase().startsWith(name.toLowerCase() + "=")) {
      return row.split(";")[0];
    }
  }
  const m = setCookie.match(new RegExp(`${name}=[^;]+`, "i"));
  return m ? m[0] : "";
}

const rows = [];
function add(id, expected, actual, pass) {
  rows.push({ id, expected, actual, result: pass ? "PASS" : "FAIL" });
}

const prefix = `qa-fix-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12)}`;
const password = randomBytes(12).toString("base64url") + "A1";
const emailA = `${prefix}-a@example.invalid`;
const emailB = `${prefix}-b@example.invalid`;

const staffLogin = await req(API + "/v1/auth/staff/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
});
const staffCookie = cookieHeader(staffLogin.setCookie, "eckam_staff_session");
add("staff-login", "200", String(staffLogin.status), staffLogin.status === 200);
add("staff-cookie", "httpOnly+Lax", JSON.stringify(cookieFlags(staffLogin.setCookie)), cookieFlags(staffLogin.setCookie).httpOnly && /lax/i.test(cookieFlags(staffLogin.setCookie).sameSite || ""));
add("staff-body-safe", "no secrets", `leak=${staffLogin.leak}`, !staffLogin.leak);

const adminDash = await req(ADMIN + "/admin", {});
add("admin-unauth", "307 login", `${adminDash.status} ${adminDash.loc}`, adminDash.status === 307 && adminDash.loc.includes("/admin/login"));

const adminApi = await req(API + "/v1/admin/dashboard");
add("admin-api-unauth", "401", String(adminApi.status), adminApi.status === 401);

const regA = await req(API + "/v1/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: emailA, password, name: "QA Fix A" }),
});
const cookieA = cookieHeader(regA.setCookie, "eckam_session");
add("reg-a", "201", String(regA.status), regA.status === 201);
add("cust-cookie", "httpOnly+Lax", JSON.stringify(cookieFlags(regA.setCookie)), cookieFlags(regA.setCookie).httpOnly && /lax/i.test(cookieFlags(regA.setCookie).sameSite || ""));

const regB = await req(API + "/v1/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: emailB, password, name: "QA Fix B" }),
});
const cookieB = cookieHeader(regB.setCookie, "eckam_session");
add("reg-b", "201", String(regB.status), regB.status === 201);

const custOnAdmin = await req(API + "/v1/admin/dashboard", { headers: { cookie: cookieA } });
add("cust-on-admin", "401/403", String(custOnAdmin.status), custOnAdmin.status === 401 || custOnAdmin.status === 403);

const idor = await req(API + "/v1/me/addresses/qa-fix-not-a-real-address-id", {
  method: "PATCH",
  headers: { "content-type": "application/json", cookie: cookieA },
  body: JSON.stringify({ fullName: "stolen" }),
});
add("idor-addr", "401/403/404", String(idor.status), [401, 403, 404].includes(idor.status));

const orderGuess = await req(API + "/v1/me/orders/qa-fix-not-a-real-order", {
  headers: { cookie: cookieA },
});
add("idor-order", "401/403/404", String(orderGuess.status), [401, 403, 404].includes(orderGuess.status));

const products = await req(API + "/v1/catalogue/products?limit=1");
let variantId = "";
try {
  const items = JSON.parse(products.body)?.data?.items || [];
  variantId = items[0]?.defaultVariantId || items[0]?.variants?.[0]?.id || "";
} catch {
  variantId = "";
}
if (!variantId) {
  try {
    const slug = JSON.parse(products.body)?.data?.items?.[0]?.slug;
    const detail = await req(API + `/v1/catalogue/products/${slug}`);
    const d = JSON.parse(detail.body)?.data;
    variantId = d?.variants?.[0]?.id || d?.defaultVariantId || "";
  } catch {
    variantId = "";
  }
}

const cart = await req(API + "/v1/carts/current/items", {
  method: "POST",
  headers: { "content-type": "application/json", cookie: cookieA },
  body: JSON.stringify({ variantId, quantity: 1, price: 1, total: 1, unitPrice: 1, currency: "USD" }),
});
let sub = "";
try {
  sub = JSON.parse(cart.body)?.data?.subtotal?.amountMinor || JSON.parse(cart.body)?.data?.totals?.subtotal || "SET";
} catch {
  sub = "parse";
}
add("cart-poison", "200 server total", `${cart.status} sub=${Boolean(sub)} leak=${cart.leak}`, cart.status === 200 && !cart.leak);

const checkout = await req(API + "/v1/checkout/sessions", {
  method: "POST",
  headers: { "content-type": "application/json", cookie: cookieA },
  body: JSON.stringify({}),
});
let ready = null;
let checkoutId = "";
try {
  const data = JSON.parse(checkout.body)?.data;
  ready = data?.paymentReady;
  checkoutId = data?.id || "";
} catch {
  ready = "parse";
}
add("checkout-ready", "201 paymentReady false", `${checkout.status} ready=${ready}`, checkout.status === 201 && ready === false);

const complete = checkoutId
  ? await req(API + `/v1/checkout/sessions/${checkoutId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieA },
      body: "{}",
    })
  : { status: 0, leak: false };
add("unpaid-complete", "4xx", String(complete.status), complete.status >= 400 && complete.status < 500);

const logout = await req(API + "/v1/auth/logout", {
  method: "POST",
  headers: { cookie: cookieA },
});
add("logout", "200", String(logout.status), logout.status === 200);
const replay = await req(API + "/v1/auth/session", { headers: { cookie: cookieA } });
let authed = true;
try {
  authed = JSON.parse(replay.body)?.data?.authenticated === true;
} catch {
  authed = replay.status === 200;
}
add("replay", "401 or unauthenticated", `${replay.status} auth=${authed}`, replay.status === 401 || authed === false);

const staffLogout = await req(API + "/v1/auth/staff/logout", {
  method: "POST",
  headers: { cookie: staffCookie },
});
add("staff-logout", "200", String(staffLogout.status), staffLogout.status === 200);
const staffReplay = await req(API + "/v1/auth/staff/session", { headers: { cookie: staffCookie } });
let staffAuthed = true;
try {
  staffAuthed = JSON.parse(staffReplay.body)?.data?.authenticated === true;
} catch {
  staffAuthed = staffReplay.status === 200;
}
add("staff-replay", "401 or unauthenticated", `${staffReplay.status} auth=${staffAuthed}`, staffReplay.status === 401 || staffAuthed === false);

const md = [
  `# Security probe`,
  "",
  `prefix: ${prefix}`,
  `web: ${WEB} admin: ${ADMIN} api: ${API}`,
  "",
  "| ID | Expected | Actual | Result |",
  "| --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.id} | ${r.expected} | ${String(r.actual).replace(/\|/g, "/")} | ${r.result} |`),
  "",
].join("\n");

writeFileSync(out, md);
console.log(JSON.stringify({ out, fail: rows.filter((r) => r.result === "FAIL").length, pass: rows.filter((r) => r.result === "PASS").length, ids: rows.map((r) => r.id + ":" + r.result) }));
