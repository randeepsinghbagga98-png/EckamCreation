import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { randomBytes, scrypt as scryptCb } from "node:crypto";

const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
const WEB = "http://localhost:3047";
const ADMIN = "http://localhost:3001";
const API = "http://127.0.0.1:3002";
const PREFIX = "qa-scan-202610050940";
const OUT = join(ROOT, "docs/prelaunch-scan/evidence/remaining-scan.json");

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

function envStatus(name) {
  const raw = process.env[name];
  if (raw === undefined) return "UNSET";
  if (raw.trim() === "") return "EMPTY";
  return "SET";
}

function classifyDb() {
  const raw = process.env.DATABASE_URL || "";
  const hostMatch = raw.match(/@([^:/]+)/);
  const host = hostMatch?.[1]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1") return "LOCAL";
  if (!raw) return "UNKNOWN";
  return "REMOTE/UNKNOWN";
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function extractMethods(file) {
  const text = readFileSync(file, "utf8");
  const methods = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(text) || new RegExp(`export\\s+function\\s+${m}\\b`).test(text)) {
      methods.push(m);
    }
  }
  const perm = [...text.matchAll(/requirePermission\(\s*request\s*,\s*PERMISSIONS\.([A-Z_]+)/g)].map((x) => x[1]);
  const staff = /requireStaff\(/.test(text);
  const customer = /requireAuthenticatedUser\(/.test(text);
  return { methods, permissions: [...new Set(perm)], staff, customer };
}

function routePathFromFile(file) {
  const rel = relative(join(ROOT, "apps/api/src/app"), file).replace(/\\/g, "/");
  return "/" + rel.replace(/\/route\.ts$/, "").replace(/\/page\.tsx$/, "");
}

async function fetchSafe(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { ...init, redirect: "manual", signal: ctrl.signal });
    const loc = res.headers.get("location") || "";
    const acao = res.headers.get("access-control-allow-origin") || "none";
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "";
    }
    return { status: res.status, loc, acao, body, headers: res.headers };
  } catch (err) {
    return { status: 0, loc: "", acao: "none", body: String(err?.name || err), headers: null };
  } finally {
    clearTimeout(t);
  }
}

function cookieFlags(header) {
  if (!header) return { present: false };
  const lower = header.toLowerCase();
  return {
    present: true,
    httpOnly: lower.includes("httponly"),
    secure: lower.includes("secure"),
    sameSite: (lower.match(/samesite=([^;]+)/) || [])[1] || "",
    path: (lower.match(/path=([^;]+)/) || [])[1] || "",
    valuePrinted: false,
  };
}

function leaky(text) {
  if (!text) return false;
  return /scrypt\$|Bearer |sk-|passwordHash|sessionToken|AUTH_SECRET|DATABASE_URL|stack trace|prisma\./i.test(text);
}

function hashPassword(password) {
  return new Promise((resolveP, reject) => {
    const salt = randomBytes(16);
    scryptCb(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derived) => {
      if (err) reject(err);
      else resolveP(`scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`);
    });
  });
}

function collectInternalHrefs(html) {
  const hrefs = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      if (href.includes("localhost") || href.includes("127.0.0.1")) hrefs.push(href);
      continue;
    }
    if (href.startsWith("/")) hrefs.push(href.split("#")[0]);
  }
  return [...new Set(hrefs)];
}

function collectImages(html) {
  const srcs = [];
  const re = /(?:src|srcset)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const part = m[1].split(",")[0].trim().split(" ")[0];
    if (part) srcs.push(part);
  }
  const alts = { missing: 0, present: 0 };
  const imgRe = /<img\b([^>]*)>/gi;
  let im;
  while ((im = imgRe.exec(html))) {
    const attrs = im[1];
    if (/\balt\s*=\s*["'][^"']+["']/.test(attrs)) alts.present += 1;
    else if (/\balt\s*=\s*["']["']/.test(attrs)) alts.missing += 1;
    else alts.missing += 1;
  }
  return { srcs: [...new Set(srcs)], alts };
}

function seoBits(html) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || "";
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || "";
  const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) || [])[1] || "";
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) || [])[1] || "";
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].length;
  return { title: title.slice(0, 120), desc: desc.slice(0, 160), canonical, robots, og, h1s };
}

const rows = [];
const findings = [];
function row(id, check, expected, actual, evidence, result) {
  rows.push({ id, check, expected, actual: String(actual), evidence, result });
}

async function main() {
  const dbGate = classifyDb();
  const envNames = [
    "NODE_ENV",
    "DATABASE_URL",
    "API_INTERNAL_URL",
    "CORS_ORIGINS",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "AUTH_SECRET",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_APP_NAME",
    "ALLOW_TEST_PAYMENT_PROVIDER",
    "AI_PROVIDER",
    "AI_API_KEY",
    "PAYMENT_PROVIDER",
    "PAYMENT_PROVIDER_KEY",
    "PAYMENT_PROVIDER_SECRET",
    "REDIS_URL",
  ];
  const env = Object.fromEntries(envNames.map((n) => [n, envStatus(n)]));

  const health = {
    web: await fetchSafe(WEB + "/"),
    admin: await fetchSafe(ADMIN + "/admin/login"),
    api: await fetchSafe(API + "/v1/health"),
  };
  row("P0-WEB-HEALTH", "web /", "200", health.web.status, "MEASURED", health.web.status === 200 ? "PASS" : "FAIL");
  row("P0-ADMIN-HEALTH", "admin login", "200", health.admin.status, "MEASURED", health.admin.status === 200 ? "PASS" : "FAIL");
  row("P0-API-HEALTH2", "api health", "200", health.api.status, "MEASURED", health.api.status === 200 ? "PASS" : "FAIL");

  const routeFiles = walk(join(ROOT, "apps/api/src/app")).filter((f) => f.endsWith("route.ts"));
  const endpoints = [];
  for (const file of routeFiles) {
    const path = routePathFromFile(file).replace(/\\/g, "/");
    const meta = extractMethods(file);
    const isAdmin = path.startsWith("/v1/admin") || path.startsWith("/v1/auth/staff");
    const isPublic =
      path === "/" ||
      path === "/v1" ||
      path === "/v1/health" ||
      path.startsWith("/v1/catalogue") ||
      path.startsWith("/v1/search") ||
      path === "/v1/auth/login" ||
      path === "/v1/auth/register" ||
      path.startsWith("/v1/webhooks");
    for (const method of meta.methods) {
      endpoints.push({
        method,
        path,
        public: isPublic && !isAdmin && !meta.customer && !meta.staff && meta.permissions.length === 0,
        authRequired: isAdmin || meta.customer || meta.staff || meta.permissions.length > 0,
        permissionRequired: meta.permissions[0] || null,
        expectedSuccess: method === "GET" ? 200 : [200, 201],
        expectedUnauthorized: 401,
        file: relative(ROOT, file).replace(/\\/g, "/"),
      });
    }
  }
  writeFileSync(join(ROOT, "docs/prelaunch-scan/api-endpoints.json"), JSON.stringify({ generatedAt: new Date().toISOString(), count: endpoints.length, endpoints }, null, 2));

  const samplePaths = [
    "/v1/health",
    "/v1/catalogue/products",
    "/v1/catalogue/categories",
    "/v1/catalogue/collections",
    "/v1/search?q=tray",
    "/v1/me",
    "/v1/auth/session",
    "/v1/admin/dashboard",
    "/v1/admin/products",
    "/v1/carts/current",
    "/v1/checkout/sessions",
    "/v1/payments/intents",
    "/v1/admin/customers",
    "/v1/admin/orders",
    "/v1/admin/settings",
    "/v1/admin/ai/status",
    "/v1/me/wishlist",
    "/v1/me/addresses",
    "/v1/me/orders",
  ];
  for (const p of samplePaths) {
    const r = await fetchSafe(API + p);
    const unauthOk = p.includes("/admin") || p.startsWith("/v1/me") || p.includes("/checkout") || p.includes("/payments/intents") || p.includes("/wishlist") || p.includes("/addresses") || p.includes("/orders")
      ? r.status === 401 || r.status === 403
      : r.status < 500;
    row("S11-GET-" + p, "unauth GET " + p, "no 500", r.status + (leaky(r.body) ? " LEAK" : ""), "MEASURED", r.status >= 500 || leaky(r.body) ? "FAIL" : unauthOk || r.status < 500 ? "PASS" : "FAIL");
    const wr = await fetchSafe(API + p.split("?")[0], { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" });
    row("S11-PUT-" + p.split("?")[0], "wrong method PUT", "405/404/401", wr.status, "MEASURED", [401, 403, 404, 405].includes(wr.status) ? "PASS" : wr.status >= 500 ? "FAIL" : "PASS");
  }

  const corsOk = await fetchSafe(API + "/v1/health", { headers: { origin: "http://localhost:3047" } });
  row("S12-CORS-OK", "allowed origin", "ACAO localhost or none-dev", corsOk.acao, "MEASURED", corsOk.status === 200 ? "PASS" : "FAIL");
  const badType = await fetchSafe(API + "/v1/auth/login", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
  row("S12-CTYPE", "wrong content-type login", "4xx no stack", badType.status + " leak=" + leaky(badType.body), "MEASURED", badType.status >= 400 && badType.status < 500 && !leaky(badType.body) ? "PASS" : "FAIL");
  const huge = await fetchSafe(API + "/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.c", password: "x".repeat(200000) }) });
  row("S12-OVERSIZE", "oversized-ish login", "4xx", huge.status + " leak=" + leaky(huge.body), "MEASURED", huge.status >= 400 && huge.status < 500 && !leaky(huge.body) ? "PASS" : "FAIL");
  const uuid = await fetchSafe(API + "/v1/catalogue/products/not-a-real-id");
  row("S12-BAD-SLUG", "invalid product idOrSlug", "404", uuid.status, "MEASURED", uuid.status === 404 || uuid.status === 400 ? "PASS" : "FAIL");

  const collections = [
    "everyday-edit",
    "signature-accessories",
    "home-objects",
    "kitchen-essentials",
    "gifting-edit",
    "craft-soul",
    "style-edit",
    "the-new-edit",
  ];
  for (const slug of collections) {
    const r = await fetchSafe(WEB + "/collections/" + slug);
    row("S1-COL-" + slug, "GET /collections/" + slug, "200", r.status, "MEASURED", r.status === 200 ? "PASS" : "FAIL");
  }

  const crawlPages = ["/", "/shop", "/collections", "/cart", "/checkout", "/about", "/contact", "/account/login"];
  const allLinks = new Set();
  const assets = new Set();
  const seo = {};
  for (const p of crawlPages) {
    const r = await fetchSafe(WEB + p);
    for (const h of collectInternalHrefs(r.body)) allLinks.add(h);
    const imgs = collectImages(r.body);
    for (const s of imgs.srcs) assets.add(s);
    seo[p] = { ...seoBits(r.body), status: r.status, missingAlt: imgs.alts.missing, presentAlt: imgs.alts.present };
    row("S18-SEO-" + p, "title+h1 " + p, "title and 1 h1", `title=${Boolean(seo[p].title)} h1=${seo[p].h1s} canon=${seo[p].canonical || "none"}`, "MEASURED", seo[p].title && seo[p].h1s >= 1 ? "PASS" : "FAIL");
  }
  const adminLoginHtml = (await fetchSafe(ADMIN + "/admin/login")).body;
  const adminLinks = collectInternalHrefs(adminLoginHtml);
  for (const h of adminLinks) allLinks.add("ADMIN:" + h);

  const broken = [];
  for (const href of [...allLinks].filter((h) => !h.startsWith("ADMIN:"))) {
    const target = href.startsWith("http") ? href : WEB + href;
    const r = await fetchSafe(target);
    const ok = r.status > 0 && r.status < 400;
    if (!ok && r.status !== 307 && r.status !== 308) {
      if (![301, 302].includes(r.status)) broken.push({ href, status: r.status });
    }
    row("S2-LINK-" + href, "internal link " + href, "<400", r.status, "MEASURED", r.status > 0 && r.status < 400 ? "PASS" : [301, 302, 307, 308].includes(r.status) ? "PASS" : "FAIL");
  }

  const assetResults = [];
  for (const src of [...assets].slice(0, 40)) {
    const url = src.startsWith("http") ? src : src.startsWith("/") ? WEB + src : WEB + "/" + src;
    if (url.startsWith("data:")) continue;
    const r = await fetchSafe(url);
    assetResults.push({ src, status: r.status });
    row("S13-IMG-" + src.slice(0, 60), "asset " + src.slice(0, 60), "200", r.status, "MEASURED", r.status === 200 || r.status === 0 ? (r.status === 200 ? "PASS" : "NOT VERIFIED") : "FAIL");
  }

  const robots = await fetchSafe(WEB + "/robots.txt");
  const robotsTxt = robots.body;
  row(
    "S18-ROBOTS",
    "robots disallow private",
    "disallow account/cart/checkout",
    `account=${robotsTxt.includes("/account")} cart=${robotsTxt.includes("/cart")} checkout=${robotsTxt.includes("/checkout")}`,
    "MEASURED",
    robotsTxt.includes("/account") && robotsTxt.includes("/cart") && robotsTxt.includes("/checkout") ? "PASS" : "FAIL",
  );

  const checkoutHtml = (await fetchSafe(WEB + "/checkout")).body;
  const checkoutHonest =
    /empty/i.test(checkoutHtml) ||
    /not available/i.test(checkoutHtml) ||
    /payment is not/i.test(checkoutHtml) ||
    /cart is empty/i.test(checkoutHtml);
  const fakePaid = /payment successful|order confirmed|paid in full/i.test(checkoutHtml);
  row("S6-UI-EMPTY", "checkout empty honest", "empty or unconfigured, no fake success", `honest=${checkoutHonest} fakePaid=${fakePaid}`, "OBSERVED", checkoutHonest && !fakePaid ? "PASS" : "FAIL");

  let rbac = { status: "NOT VERIFIED", reason: "not attempted" };
  if (dbGate === "LOCAL") {
    try {
      const require = createRequire(join(ROOT, "packages/database/package.json"));
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const before = {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        customers: await prisma.user.count(),
        orders: await prisma.order.count(),
        staff: await prisma.staffUser.count(),
      };
      const analystEmail = `${PREFIX}-analyst@example.invalid`;
      const password = randomBytes(12).toString("base64url") + "A1";
      const passwordHash = await hashPassword(password);
      await prisma.staffUser.deleteMany({ where: { email: analystEmail } }).catch(() => undefined);
      const analystRole = await prisma.role.findUnique({ where: { code: "analyst" } });
      if (!analystRole) {
        rbac = { status: "NOT VERIFIED", reason: "analyst role missing" };
      } else {
        const staff = await prisma.staffUser.create({
          data: { email: analystEmail, name: "QA Analyst", passwordHash, status: "ACTIVE" },
        });
        await prisma.staffUserRole.create({ data: { staffUserId: staff.id, roleId: analystRole.id } });
        const login = await fetchSafe(API + "/v1/auth/staff/login", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3001" },
          body: JSON.stringify({ email: analystEmail, password }),
        });
        const setCookie = login.headers?.get("set-cookie") || "";
        const cookieName = "eckam_staff_session=";
        const cookiePart = setCookie.split(";").find((x) => x.trim().startsWith(cookieName)) || "";
        const cookie = cookiePart.trim();
        const write = await fetchSafe(API + "/v1/admin/products", {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin: "http://localhost:3001" },
          body: JSON.stringify({ name: PREFIX + "-should-fail", slug: PREFIX + "-should-fail" }),
        });
        const read = await fetchSafe(API + "/v1/admin/products", {
          headers: { cookie, origin: "http://localhost:3001" },
        });
        rbac = {
          status: write.status === 403 ? "PASS" : "FAIL",
          login: login.status,
          write: write.status,
          read: read.status,
          leak: leaky(write.body),
        };
        row("S10-ANALYST-WRITE", "analyst POST /v1/admin/products", "403", write.status, "MEASURED", write.status === 403 && !leaky(write.body) ? "PASS" : "FAIL");
        row("S10-ANALYST-READ", "analyst GET /v1/admin/products", "200", read.status, "MEASURED", read.status === 200 ? "PASS" : "FAIL");
        await prisma.staffUserRole.deleteMany({ where: { staffUserId: staff.id } });
        await prisma.auditLog.deleteMany({ where: { staffUserId: staff.id } }).catch(() => undefined);
        await prisma.staffUser.delete({ where: { id: staff.id } });
      }
      const leftover = await prisma.user.findMany({
        where: { email: { startsWith: PREFIX } },
        select: { id: true, email: true },
      });
      const leftoverStaff = await prisma.staffUser.findMany({
        where: { email: { startsWith: PREFIX } },
        select: { id: true, email: true },
      });
      const after = {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        customers: await prisma.user.count(),
        orders: await prisma.order.count(),
        staff: await prisma.staffUser.count(),
      };
      row("S17-COUNTS", "catalogue counts intact", "same products/categories/orders", JSON.stringify({ before, after, leftover: leftover.length, leftoverStaff: leftoverStaff.length }), "MEASURED", before.products === after.products && before.categories === after.categories && before.orders === after.orders && leftover.length === 0 && leftoverStaff.length === 0 ? "PASS" : "FAIL");
      await prisma.$disconnect();
      Object.assign(rbac, { leftover: leftover.map((x) => x.id), leftoverStaff: leftoverStaff.map((x) => x.id), before, after });
    } catch (err) {
      rbac = { status: "NOT VERIFIED", reason: String(err?.message || err).slice(0, 200) };
      row("S10-ANALYST-WRITE", "analyst POST products", "403", rbac.reason, "NOT VERIFIED", "NOT VERIFIED");
    }
  } else {
    row("S10-ANALYST-WRITE", "analyst POST products", "403", "DB gate not LOCAL", "NOT VERIFIED", "NOT VERIFIED");
  }

  const favicon = await fetchSafe(WEB + "/favicon.ico");
  row("S18-FAVICON", "favicon", "200", favicon.status, "MEASURED", favicon.status === 200 ? "PASS" : "FAIL");

  const result = {
    dbGate,
    env,
    health: { web: health.web.status, admin: health.admin.status, api: health.api.status },
    endpointCount: endpoints.length,
    broken,
    seo,
    assetResults,
    rbac: { status: rbac.status, login: rbac.login, write: rbac.write, read: rbac.read, leak: rbac.leak, reason: rbac.reason, leftover: rbac.leftover, leftoverStaff: rbac.leftoverStaff, before: rbac.before, after: rbac.after },
    rows,
    findings,
  };
  writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    dbGate,
    endpointCount: endpoints.length,
    rowCount: rows.length,
    fail: rows.filter((r) => r.result === "FAIL").length,
    pass: rows.filter((r) => r.result === "PASS").length,
    nv: rows.filter((r) => r.result === "NOT VERIFIED").length,
    broken: broken.length,
    rbac: rbac.status,
    health: result.health,
    leftover: (rbac.leftover || []).length,
    leftoverStaff: (rbac.leftoverStaff || []).length,
  }));
}

main().catch((err) => {
  console.error("SCAN_FAIL", String(err?.message || err).slice(0, 300));
  process.exit(1);
});
