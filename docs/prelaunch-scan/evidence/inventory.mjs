import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(join(ROOT, "apps/api/src/app")).filter((f) => f.endsWith("route.ts"));
const endpoints = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const methods = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(text) || new RegExp(`export\\s+const\\s+${m}\\b`).test(text)) {
      methods.push(m);
    }
  }
  const perms = [...text.matchAll(/PERMISSIONS\.([A-Z_]+)/g)].map((x) => x[1]);
  const path = "/" + relative(join(ROOT, "apps/api/src/app"), file).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  const isAdmin = path.startsWith("/v1/admin") || path.startsWith("/v1/auth/staff");
  const isMe = path.startsWith("/v1/me");
  const isPublic =
    path === "/" ||
    path === "/v1" ||
    path === "/v1/health" ||
    path.startsWith("/v1/catalogue") ||
    path.startsWith("/v1/search") ||
    path === "/v1/auth/login" ||
    path === "/v1/auth/register" ||
    path.startsWith("/v1/webhooks") ||
    path.startsWith("/v1/carts");
  for (const method of methods) {
    endpoints.push({
      method,
      path: path === "/route.ts" ? "/" : path,
      public: Boolean(isPublic && !isAdmin && !isMe),
      authRequired: Boolean(isAdmin || isMe || path.startsWith("/v1/checkout") || path.startsWith("/v1/payments") || path.startsWith("/v1/ai")),
      permissionRequired: isAdmin ? perms[0] || "staff-session" : null,
      expectedSuccess: method === "GET" ? 200 : [200, 201],
      expectedUnauthorized: 401,
      file: relative(ROOT, file).replace(/\\/g, "/"),
    });
  }
}

writeFileSync(
  join(ROOT, "docs/prelaunch-scan/api-endpoints.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: endpoints.length, endpoints }, null, 2),
);

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const require = createRequire(join(ROOT, "packages/database/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const counts = {
  products: await prisma.product.count(),
  published: await prisma.product.count({ where: { status: "ACTIVE" } }).catch(() => null),
  categories: await prisma.category.count(),
  customers: await prisma.user.count(),
  orders: await prisma.order.count(),
  staff: await prisma.staffUser.count(),
};

let published = counts.published;
if (published == null) {
  try {
    published = await prisma.product.count({ where: { status: "PUBLISHED" } });
  } catch {
    published = null;
  }
}

const qaUsers = await prisma.user.findMany({
  where: { OR: [{ email: { startsWith: "qa-scan-" } }, { email: { contains: "@example.invalid" } }, { email: { contains: "@example.com" } }] },
  select: { id: true, email: true },
});
const testish = qaUsers.map((u) => ({
  id: u.id,
  emailShape: u.email.includes("qa-scan") ? "qa-scan" : u.email.includes("example.invalid") ? "invalid" : u.email.includes("example.com") ? "example.com" : "other",
}));

const testProducts = await prisma.product.findMany({
  where: { OR: [{ slug: { contains: "checkout" } }, { name: { contains: "Checkout Product" } }, { name: { contains: "Cart Product" } }, { name: { contains: "Order Product" } }, { slug: { startsWith: "qa-scan-" } }] },
  select: { id: true, slug: true, name: true },
});

await prisma.$disconnect();

const catalog = await fetch("http://127.0.0.1:3002/v1/catalogue/products?limit=50").then((r) => r.json());
const items = catalog?.data?.items || catalog?.items || [];
const slugs = items.map((p) => p.slug);

const search501 = await fetch("http://127.0.0.1:3002/v1/search?q=tray");
const searchBody = await search501.text();
const webSearch = await fetch("http://localhost:3047/search?q=tray", { redirect: "manual" });
const faviconSvg = await fetch("http://localhost:3047/icon.svg", { redirect: "manual" });
const fullImg = await fetch(
  "http://localhost:3047/_next/image?url=" + encodeURIComponent("https://images.unsplash.com/photo-1611591437281-460bfbe1220a") + "&w=640&q=75",
  { redirect: "manual" },
);

writeFileSync(
  join(ROOT, "docs/prelaunch-scan/evidence/inventory-meta.json"),
  JSON.stringify(
    {
      endpointCount: endpoints.length,
      counts,
      published,
      leftoverUsers: testish,
      leftoverUserCount: testish.length,
      leftoverProducts: testProducts.map((p) => ({ id: p.id, slug: p.slug })),
      publicSlugs: slugs,
      searchApi: { status: search501.status, leak: /prisma|stack|DATABASE_URL/i.test(searchBody) },
      webSearch: webSearch.status,
      iconSvg: faviconSvg.status,
      nextImageSample: fullImg.status,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify({
    endpointCount: endpoints.length,
    counts,
    leftoverUserCount: testish.length,
    leftoverUserShapes: testish.reduce((a, x) => ((a[x.emailShape] = (a[x.emailShape] || 0) + 1), a), {}),
    leftoverProducts: testProducts.length,
    searchApi: search501.status,
    webSearch: webSearch.status,
    iconSvg: faviconSvg.status,
    nextImageSample: fullImg.status,
    publicProductCount: slugs.length,
  }),
);
