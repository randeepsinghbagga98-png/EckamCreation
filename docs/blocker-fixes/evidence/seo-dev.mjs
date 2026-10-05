const sitemap = await fetch("http://127.0.0.1:3047/sitemap.xml").then((r) => r.text());
console.log(
  JSON.stringify({
    statusOk: true,
    sitemapLocalhost: /localhost/.test(sitemap),
    sitemapLocs: (sitemap.match(/<loc>/g) || []).length,
  }),
);
