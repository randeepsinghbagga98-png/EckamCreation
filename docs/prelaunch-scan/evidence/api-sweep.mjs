import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
const API = "http://127.0.0.1:3002";
const inv = JSON.parse(readFileSync(join(ROOT, "docs/prelaunch-scan/api-endpoints.json"), "utf8"));
const rows = [];
function leaky(t) {
  return /scrypt\$|Bearer |sk-|passwordHash|sessionToken|AUTH_SECRET|DATABASE_URL|at Object\.|prisma\./i.test(t || "");
}
for (const ep of inv.endpoints) {
  const path = ep.path.replace(/\[([^\]]+)\]/g, "qa-scan-unknown");
  const url = API + path;
  const init = { method: ep.method, redirect: "manual" };
  if (ep.method !== "GET" && ep.method !== "HEAD") {
    init.headers = { "content-type": "application/json" };
    init.body = "{}";
  }
  let status = 0;
  let body = "";
  try {
    const res = await fetch(url, init);
    status = res.status;
    body = await res.text();
  } catch (err) {
    status = 0;
    body = String(err?.name || "error");
  }
  const leak = leaky(body);
  const unexpected5xx = status >= 500 && status !== 501;
  const okAuth = !ep.authRequired || [401, 403, 400, 404, 405, 415, 422].includes(status);
  const result = unexpected5xx || leak ? "FAIL" : status === 0 ? "FAIL" : "PASS";
  rows.push({
    id: `S11-${ep.method}-${ep.path}`,
    method: ep.method,
    path: ep.path,
    status,
    authRequired: ep.authRequired,
    leak,
    result,
    okAuth,
  });
}
const summary = {
  checked: rows.length,
  fail: rows.filter((r) => r.result === "FAIL").length,
  status5xx: rows.filter((r) => r.status >= 500).length,
  status501: rows.filter((r) => r.status === 501).length,
  leak: rows.filter((r) => r.leak).length,
  unexpected5xx: rows.filter((r) => r.status >= 500 && r.status !== 501).map((r) => ({ path: r.path, method: r.method, status: r.status })),
  fails: rows.filter((r) => r.result === "FAIL").map((r) => ({ path: r.path, method: r.method, status: r.status, leak: r.leak })),
};
writeFileSync(join(ROOT, "docs/prelaunch-scan/evidence/api-sweep.json"), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
