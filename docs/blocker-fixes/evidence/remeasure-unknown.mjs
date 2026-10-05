const url = "http://127.0.0.1:3050/shop/qa-scan-unknown-slug-zzz";
const started = Date.now();
const res = await fetch(url, { redirect: "manual" });
console.log(JSON.stringify({ status: res.status, ms: Date.now() - started }));
