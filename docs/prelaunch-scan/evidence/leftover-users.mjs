import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
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
const users = await prisma.user.findMany({
  select: { id: true, email: true, createdAt: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});
const shaped = users.map((u) => ({
  id: u.id,
  createdAt: u.createdAt,
  prefix: u.email.split("@")[0].slice(0, 20),
  domain: u.email.split("@")[1] || "",
}));
writeFileSync(join(ROOT, "docs/prelaunch-scan/evidence/recent-users.json"), JSON.stringify({ countAll: await prisma.user.count(), recent: shaped }, null, 2));
await prisma.$disconnect();
console.log(JSON.stringify({ countAll: shaped.length, recentPrefixes: shaped.map((x) => x.prefix + "@" + x.domain) }));
