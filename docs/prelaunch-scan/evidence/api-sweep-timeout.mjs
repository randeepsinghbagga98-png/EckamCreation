import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
const API = "http://127.0.0.1:3002";
const inv = JSON.parse(readFileSync(join(ROOT, "docs/prelaunch-scan/api-endpoints.json"), "utf8"));
async function hit(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
    const body = await res.text();
    return { status: res.status, leak: /scrypt\$|Bearer |sk-|passwordHash|DATABASE_URL|AUTH_SECRET/i.test(body) };
  } catch (err) {
    return { status: 0, leak: false, err: String(err?.name || "err") };
  } finally {
    clearTimeout(t);
  }
}
const rows = [];
for (const ep of inv.endpoints) {
  const path = ep.path.replace(/\[([^\]]+)\]/g, "qa-scan-unknown");
  const init = { method: ep.method };
  if (ep.method !== "GET") {
    init.headers = { "content-type": "application/json" };
    init.body = "{}";
  }
  const r = await hit(API + path, init);
  const unexpected5xx = r.status >= 500 && r.status !== 501;
  rows.push({
    id: `S11-${ep.method}-${ep.path}`,
    method: ep.method,
    path: ep.path,
    status: r.status,
    leak: r.leak,
    result: unexpected5xx || r.leak || r.status === 0 ? "FAIL" : "PASS",
  });
}
const summary = {
  checked: rows.length,
  fail: rows.filter((x) => x.result === "FAIL").length,
  pass: rows.filter((x) => x.result === "PASS").length,
  status501: rows.filter((x) => x.status === 501).length,
  unexpected5xx: rows.filter((x) => x.status >= 500 && x.status !== 501),
  timeouts: rows.filter((x) => x.status === 0),
  leaks: rows.filter((x) => x.leak),
};
writeFileSync(join(ROOT, "docs/prelaunch-scan/evidence/api-sweep.json"), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
