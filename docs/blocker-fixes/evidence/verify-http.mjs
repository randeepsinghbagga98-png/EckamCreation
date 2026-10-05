const WEB = "http://127.0.0.1:3050";
const ADMIN = "http://127.0.0.1:3003";
const API = "http://127.0.0.1:3002";

async function status(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { url, status: res.status, loc: res.headers.get("location") || "", type: res.headers.get("content-type") || "" };
}

const products = await fetch(API + "/v1/catalogue/products?limit=50").then((r) => r.json());
const slugs = (products.data?.items || products.items || []).map((p) => p.slug);
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

const rows = [];
rows.push(await status(WEB + "/favicon.ico"));
rows.push(await status(WEB + "/icon.svg"));
rows.push(await status(WEB + "/sitemap.xml"));
rows.push(await status(WEB + "/robots.txt"));
rows.push(await status(ADMIN + "/admin"));
rows.push(await status(ADMIN + "/admin/login"));
rows.push(await status(ADMIN + "/favicon.ico"));
rows.push(await status(ADMIN + "/icon.svg"));

for (const slug of slugs) {
  rows.push({ kind: "pdp", ...(await status(WEB + "/shop/" + slug)) });
}
for (const slug of ["qa-scan-unknown-slug-zzz", "nope%20here", "x".repeat(80)]) {
  rows.push({ kind: "pdp-bad", ...(await status(WEB + "/shop/" + slug)) });
}
for (const slug of collections) {
  rows.push({ kind: "col", ...(await status(WEB + "/collections/" + slug)) });
}
for (const slug of ["qa-scan-unknown-collection", "nope%20col", "z".repeat(80)]) {
  rows.push({ kind: "col-bad", ...(await status(WEB + "/collections/" + slug)) });
}

const sitemapBody = await fetch(WEB + "/sitemap.xml").then((r) => r.text());
const home = await fetch(WEB + "/").then((r) => r.text());
const checkout = await fetch(WEB + "/checkout").then((r) => r.text());

const summary = {
  favicon: rows.find((r) => r.url.endsWith("/favicon.ico") && r.url.includes("3050")),
  icon: rows.find((r) => r.url.endsWith("/icon.svg") && r.url.includes("3050")),
  adminUnauth: rows.find((r) => r.url.endsWith("/admin") && r.url.includes("3003")),
  pdpOk: rows.filter((r) => r.kind === "pdp").map((r) => r.status),
  pdpBad: rows.filter((r) => r.kind === "pdp-bad").map((r) => r.status),
  colOk: rows.filter((r) => r.kind === "col").map((r) => r.status),
  colBad: rows.filter((r) => r.kind === "col-bad").map((r) => r.status),
  sitemapHasLocalhost: /localhost/.test(sitemapBody),
  sitemapHasExample: /example\.invalid/.test(sitemapBody),
  sitemapLocs: (sitemapBody.match(/<loc>/g) || []).length,
  homeHasLocalhostCanon: /canonical[^>]+localhost/.test(home),
  checkoutHasEmpty: /YOUR CART IS EMPTY|cart is empty/i.test(checkout),
  slugs: slugs.length,
};

console.log(JSON.stringify({ summary, rows: rows.map((r) => ({ kind: r.kind, status: r.status, loc: r.loc, url: r.url.replace(/http:\/\/127.0.0.1:\d+/, "") })) }));
