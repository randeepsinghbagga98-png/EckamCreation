/**
 * Idempotent apply of packages/database/prisma/data/imported-catalogue.json
 * Creates Category → Product → Variant → Media → ProductCategory.
 * Does not invent Price or Inventory rows.
 *
 * Usage:
 *   node packages/database/scripts/apply-catalogue-fixture.mjs --allow-remote
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const FIXTURE = join(ROOT, "packages/database/prisma/data/imported-catalogue.json");

function loadEnv() {
  for (const path of [join(ROOT, ".env.vercel.production"), join(ROOT, ".env.local")]) {
    if (!existsSync(path)) continue;
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
      if (!process.env[key] && value && !value.includes("[SENSITIVE]")) {
        process.env[key] = value;
      }
    }
    if (
      path.endsWith(".env.vercel.production") &&
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes("[SENSITIVE]")
    ) {
      break;
    }
  }
}

loadEnv();
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SENSITIVE]")) {
  throw new Error("DATABASE_URL is required (real Neon URL, not a Vercel placeholder).");
}

let host = "UNKNOWN";
try {
  host = new URL(process.env.DATABASE_URL).hostname;
} catch {
  host = "UNKNOWN";
}
const allowRemote = process.argv.includes("--allow-remote");
const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(host);
if (!isLocal && !allowRemote) {
  throw new Error(
    "Refusing apply: DATABASE_URL host is not LOCAL (pass --allow-remote for production Neon).",
  );
}
if (allowRemote && !isLocal) {
  const suffix = host.includes(".") ? host.split(".").slice(-2).join(".") : host;
  console.log(`Remote fixture target host suffix: ${suffix}`);
}

if (!existsSync(FIXTURE)) {
  throw new Error(`Missing fixture: ${FIXTURE}`);
}

const payload = JSON.parse(readFileSync(FIXTURE, "utf8"));
const products = Array.isArray(payload.products) ? payload.products : [];
const prisma = new PrismaClient();

let created = 0;
let updated = 0;
let mediaCreated = 0;

try {
  for (const product of products) {
    const category = await prisma.category.upsert({
      where: { slug: product.category.slug },
      create: {
        slug: product.category.slug,
        name: product.category.name,
        path: `/${product.category.slug}`,
        sortOrder: product.category.sortOrder ?? 0,
        isActive: true,
        deletedAt: null,
      },
      update: {
        name: product.category.name,
        path: `/${product.category.slug}`,
        sortOrder: product.category.sortOrder ?? 0,
        isActive: true,
        deletedAt: null,
      },
    });

    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        status: product.status || "ACTIVE",
        publishedAt: new Date(),
        deletedAt: null,
      },
      update: {
        name: product.name,
        description: product.description,
        status: product.status || "ACTIVE",
        deletedAt: null,
        publishedAt: existing?.publishedAt ?? new Date(),
      },
    });
    if (existing) updated += 1;
    else created += 1;

    await prisma.productCategory.upsert({
      where: {
        productId_categoryId: { productId: row.id, categoryId: category.id },
      },
      create: { productId: row.id, categoryId: category.id, isPrimary: true },
      update: { isPrimary: true },
    });

    await prisma.productVariant.upsert({
      where: { sku: product.sku },
      create: {
        productId: row.id,
        sku: product.sku,
        name: "Default",
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
      update: {
        productId: row.id,
        name: "Default",
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
    });

    // No Price / Inventory invention.

    for (const media of product.media || []) {
      const existingMedia = await prisma.productMedia.findFirst({
        where: { productId: row.id, url: media.url },
      });
      if (existingMedia) {
        await prisma.productMedia.update({
          where: { id: existingMedia.id },
          data: {
            kind: "IMAGE",
            mimeType: media.mimeType || "image/svg+xml",
            altText: media.altText,
            sortOrder: media.sortOrder ?? 0,
            isPrimary: Boolean(media.isPrimary),
            storageKey: media.storageKey ?? null,
          },
        });
      } else {
        await prisma.productMedia.create({
          data: {
            productId: row.id,
            kind: "IMAGE",
            url: media.url,
            mimeType: media.mimeType || "image/svg+xml",
            altText: media.altText,
            sortOrder: media.sortOrder ?? 0,
            isPrimary: Boolean(media.isPrimary),
            storageKey: media.storageKey ?? null,
          },
        });
        mediaCreated += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        fixtureCount: products.length,
        productsCreated: created,
        productsUpdated: updated,
        mediaCreated,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
