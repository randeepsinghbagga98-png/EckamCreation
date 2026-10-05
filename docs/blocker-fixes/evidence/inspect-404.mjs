async function inspect(url) {
  const res = await fetch(url, { redirect: "manual" });
  const body = await res.text();
  return {
    url: url.replace("http://127.0.0.1:3050", "").replace("http://127.0.0.1:3002", "api"),
    status: res.status,
    markers: {
      productNotFound: /Product not found|This piece could not be found/i.test(body),
      collectionNotFound: /Collection not found/i.test(body),
      globalNotFound: /This page is not available/i.test(body),
      realProduct: /Add to cart|Artisan Decorative Tray/i.test(body),
    },
  };
}
const out = [
  await inspect("http://127.0.0.1:3050/shop/qa-scan-unknown-slug-zzz"),
  await inspect("http://127.0.0.1:3050/collections/qa-scan-unknown-collection"),
  await inspect("http://127.0.0.1:3002/v1/catalogue/products/qa-scan-unknown-slug-zzz"),
  await inspect("http://127.0.0.1:3050/shop/tan-carryall"),
];
console.log(JSON.stringify(out, null, 2));
