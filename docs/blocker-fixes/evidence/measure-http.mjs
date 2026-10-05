const rows = [
  "http://127.0.0.1:3050/shop/eckam-missing",
  "http://127.0.0.1:3050/collections/eckam-missing",
  "http://127.0.0.1:3050/shop/qa-scan-unknown-slug-zzz",
  "http://127.0.0.1:3050/shop/tan-carryall",
  "http://127.0.0.1:3050/favicon.ico",
  "http://127.0.0.1:3050/icon.svg",
  "http://127.0.0.1:3003/favicon.ico",
  "http://127.0.0.1:3003/icon.svg",
  "http://127.0.0.1:3003/admin",
  "http://127.0.0.1:3050/sitemap.xml",
  "http://127.0.0.1:3050/robots.txt",
];

for (const url of rows) {
  const res = await fetch(url, { redirect: "manual" });
  const type = (res.headers.get("content-type") || "").split(";")[0];
  const loc = res.headers.get("location") || "";
  const path = url.replace(/http:\/\/127\.0\.0\.1:\d+/, "");
  const host = url.includes(":3003") ? "admin" : "web";
  console.log(JSON.stringify({ host, status: res.status, type, loc, path }));
}

const sitemap = await fetch("http://127.0.0.1:3050/sitemap.xml").then((r) => r.text());
const robots = await fetch("http://127.0.0.1:3050/robots.txt").then((r) => r.text());
console.log(
  JSON.stringify({
    sitemapLocs: (sitemap.match(/<loc>/g) || []).length,
    sitemapLocalhost: /localhost/.test(sitemap),
    sitemapExample: /example\.invalid/.test(sitemap),
    robotsSitemap: /sitemap/i.test(robots),
    robotsLocalhost: /localhost/.test(robots),
  }),
);
