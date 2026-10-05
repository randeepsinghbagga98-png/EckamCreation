const WEB = "http://127.0.0.1:3050";
const sitemap = await fetch(`${WEB}/sitemap.xml`).then((r) => r.text());
const robots = await fetch(`${WEB}/robots.txt`).then((r) => r.text());
const home = await fetch(`${WEB}/`).then((r) => r.text());
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const paths = locs.map((loc) => {
  try {
    return new URL(loc).pathname;
  } catch {
    return loc;
  }
});

const pathStatus = [];
for (const path of paths) {
  const res = await fetch(`${WEB}${path === "/" ? "/" : path}`, { redirect: "manual" });
  pathStatus.push({ path, status: res.status });
}

console.log(
  JSON.stringify(
    {
      sitemapLocs: locs.length,
      sitemapExample: locs.every((loc) => loc.startsWith("https://example.invalid")),
      sitemapLocalhost: /localhost/.test(sitemap),
      sitemapForbidden: locs.some((loc) => /\/(admin|cart|checkout|account)\b/.test(loc)),
      locs,
      robotsSitemap: robots.includes("https://example.invalid/sitemap.xml"),
      robotsLocalhost: /localhost/.test(robots),
      homeExampleCanon: /example\.invalid/.test(home),
      homeLocalhost: /localhost/.test(home),
      pathStatus,
    },
    null,
    2,
  ),
);
