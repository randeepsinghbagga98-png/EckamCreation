const urls = [
  "http://127.0.0.1:3050/shop/qa-scan-unknown-slug-zzz",
  "http://127.0.0.1:3050/shop/nope%20here",
  "http://127.0.0.1:3050/collections/qa-scan-unknown-collection",
  "http://127.0.0.1:3050/shop/tan-carryall",
  "http://127.0.0.1:3050/collections/everyday-edit",
  "http://127.0.0.1:3002/v1/catalogue/products/qa-scan-unknown-slug-zzz",
];
for (const url of urls) {
  const started = Date.now();
  const res = await fetch(url, { redirect: "manual" });
  console.log(
    JSON.stringify({
      status: res.status,
      ms: Date.now() - started,
      path: url.replace(/http:\/\/127\.0\.0\.1:\d+/, ""),
    }),
  );
}
