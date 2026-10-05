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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const raw = process.env.DATABASE_URL || "";
const host = (raw.match(/@([^:/]+)/) || [])[1] || "";
const gate = host === "localhost" || host === "127.0.0.1" ? "LOCAL" : raw ? "REMOTE/UNKNOWN" : "UNKNOWN";

const require = createRequire(join(ROOT, "packages/database/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { email: { startsWith: "ai_" } },
  select: { id: true, email: true, createdAt: true },
  orderBy: { createdAt: "desc" },
});

const rows = [];
for (const user of users) {
  const [orders, addresses, carts, wishlistItems, sessions] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }).catch(() => -1),
    prisma.address.count({ where: { userId: user.id } }).catch(async () => {
      try {
        return await prisma.address.count({ where: { customer: { userId: user.id } } });
      } catch {
        return -1;
      }
    }),
    prisma.cart.count({ where: { userId: user.id } }).catch(() => -1),
    prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }).catch(() => -1),
    prisma.session.count({ where: { userId: user.id } }).catch(() => -1),
  ]);
  rows.push({
    id: user.id,
    emailPattern: user.email.replace(/[0-9]+/g, "#"),
    createdAt: user.createdAt,
    role: "customer",
    orders,
    addresses,
    carts,
    wishlistItems,
    sessions,
  });
}

await prisma.$disconnect();
writeFileSync(
  join(ROOT, "docs/blocker-fixes/evidence/data1-users.json"),
  JSON.stringify({ gate, count: rows.length, rows }, null, 2),
);
console.log(JSON.stringify({ gate, count: rows.length, ids: rows.map((r) => r.id), orders: rows.map((r) => r.orders) }));
