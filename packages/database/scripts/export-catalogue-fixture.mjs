/**
 * Export local catalogue (non-seed import rows) to a commit-safe JSON fixture.
 * Reads LOCAL database only. Never prints connection strings.
 *
 * Usage (repo root, local DATABASE_URL):
 *   node packages/database/scripts/export-catalogue-fixture.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const OUT = join(ROOT, "packages/database/prisma/data/imported-catalogue.json");

const SEED_SKUS = new Set([
  "ECK-BAG-001",
  "ECK-BAG-002",
  "ECK-BAG-003",
  "ECK-FSH-001",
  "ECK-BTY-001",
  "ECK-KIT-001",
  "ECK-JWL-001",
  "ECK-JWL-002",
  "ECK-HOM-001",
  "ECK-GFT-001",
  "ECK-ART-001",
]);

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required (local).");
}
const host = new URL(process.env.DATABASE_URL).hostname;
if (!/^(localhost|127\.0\.0\.1)$/i.test(host)) {
  throw new Error("Refusing export: source DATABASE_URL must be LOCAL.");
}

const prisma = new PrismaClient();
const products = await prisma.product.findMany({
  where: { deletedAt: null },
  include: {
    variants: {
      where: { deletedAt: null },
      include: { prices: { where: { isActive: true } } },
    },
    media: { orderBy: { sortOrder: "asc" } },
    categories: { include: { category: true } },
  },
  orderBy: { createdAt: "asc" },
});

const imported = [];
for (const product of products) {
  const defaultVariant =
    product.variants.find((v) => v.isDefault) || product.variants[0];
  if (!defaultVariant) continue;
  if (SEED_SKUS.has(defaultVariant.sku)) continue;

  const primaryCategory =
    product.categories.find((c) => c.isPrimary)?.category ||
    product.categories[0]?.category;
  if (!primaryCategory) continue;

  imported.push({
    slug: product.slug,
    name: product.name,
    description: product.description,
    status: product.status,
    sku: defaultVariant.sku,
    category: {
      slug: primaryCategory.slug,
      name: primaryCategory.name,
      sortOrder: primaryCategory.sortOrder,
    },
    // Imported rows intentionally omit invented prices/stock.
    media: product.media.map((m, index) => ({
      url: m.url,
      altText: m.altText,
      mimeType: m.mimeType || "image/svg+xml",
      sortOrder: m.sortOrder ?? index,
      isPrimary: m.isPrimary || index === 0,
      storageKey: m.storageKey,
    })),
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "local-db-non-seed-products",
      count: imported.length,
      products: imported,
    },
    null,
    2,
  ),
);
console.log(`Wrote ${imported.length} imported products to ${OUT}`);
await prisma.$disconnect();
