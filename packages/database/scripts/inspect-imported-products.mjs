import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = "C:/Users/WeShippX/Desktop/eckamcreation";
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

const prisma = new PrismaClient();

const IMPORT_URL = { startsWith: "/products/import/" };

function detectColor(name, storageKeys) {
  const blob = `${name} ${(storageKeys || []).join(" ")}`.toLowerCase();
  const colors = [
    "mint green",
    "blush pink",
    "light blue",
    "sky blue",
    "beige white",
    "black white",
    "mauve white",
    "ivory",
    "cream",
    "beige",
    "black",
    "pink",
    "tan",
    "mauve",
  ];
  for (const c of colors) {
    if (blob.includes(c.replace(" ", "_")) || blob.includes(c)) return c;
  }
  return "";
}

function detectType(categorySlug, name, storageKeys) {
  const blob = `${name} ${(storageKeys || []).join(" ")}`.toLowerCase();
  if (categorySlug === "handbags") return "handbag";
  if (/robot|car_mode|transforming/.test(blob)) return "transforming toy";
  if (/spoon|spatula|whisk|hot.?pot|kitchen/.test(blob)) {
    if (/spoon/.test(blob)) return "kitchen utensil";
    if (/spatula/.test(blob)) return "kitchen utensil";
    if (/whisk/.test(blob)) return "kitchen utensil";
    if (/hot.?pot|electric/.test(blob)) return "electric hot pot";
    if (/component/.test(blob)) return "kitchen set / components";
    return "kitchen product";
  }
  if (categorySlug === "beauty") return "beauty product";
  if (categorySlug === "fashion-wear") return "fashion wear";
  if (categorySlug === "toys") return "toy";
  if (categorySlug === "kitchen") return "kitchen product";
  return "unknown";
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

try {
  const taxRules = await prisma.taxRule.findMany({
    where: { isActive: true },
    include: {
      rates: { where: { isActive: true } },
      country: { select: { iso2: true, name: true } },
    },
  });

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      media: { some: { url: IMPORT_URL } },
    },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { deletedAt: null },
        include: {
          prices: { where: { isActive: true } },
          inventoryItems: true,
        },
      },
      categories: { include: { category: true } },
    },
    orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
  });

  const rows = products.map((p) => {
    const cat = p.categories.find((c) => c.isPrimary)?.category ?? p.categories[0]?.category;
    const variant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    const price = variant?.prices[0];
    const inv = variant?.inventoryItems ?? [];
    const onHand = inv.reduce((n, i) => n + i.onHand, 0);
    const storageKeys = p.media.map((m) => m.storageKey || m.url);
    const color = detectColor(p.name, storageKeys);
    const type = detectType(cat?.slug || "", p.name, storageKeys);
    const placeholderName = /^(Beauty|Fashion Wear|Toy|Kitchen) Product\b/i.test(p.name)
      || /^Toy Image\b/i.test(p.name)
      || /Product \d{2}$/i.test(p.name);
    const confidentName = !placeholderName;
    const hasPrice = Boolean(price);
    const hasStock = inv.length > 0;
    const groupingReview =
      /transforming|toy image|all components|images\.svg|copy index/i.test(
        `${p.description || ""} ${storageKeys.join(" ")}`,
      ) ||
      (cat?.slug === "toys" && /toy-image|transforming/.test(p.slug)) ||
      (cat?.slug === "kitchen" && /components|hot-pot|electric/.test(p.slug));

    let dataStatus = [];
    if (!confidentName) dataStatus.push("NAME_REVIEW");
    if (!hasPrice) dataStatus.push("PRICE_MISSING");
    if (!hasStock) dataStatus.push("INVENTORY_MISSING");
    if (groupingReview) dataStatus.push("GROUPING_REVIEW");
    if (dataStatus.length === 0) dataStatus = ["READY"];
    else if (dataStatus.filter((s) => s.endsWith("MISSING") || s === "NAME_REVIEW").length >= 2) {
      dataStatus = [...new Set([...dataStatus, "MULTIPLE_MISSING"])];
    }

    return {
      id: p.id,
      category: cat?.name || "",
      categorySlug: cat?.slug || "",
      name: p.name,
      slug: p.slug,
      sku: variant?.sku || "",
      imageCount: p.media.length,
      color,
      productType: type,
      price: price ? price.amountMinor.toString() : "",
      inventory: hasStock ? String(onHand) : "",
      dataStatus: dataStatus.join("|"),
      placeholderName,
      hasPrice,
      hasStock,
      groupingReview,
      confidentName,
      storageKeys,
      mediaUrls: p.media.map((m) => m.url),
    };
  });

  const buckets = {
    A_ready: rows.filter((r) => r.confidentName && r.hasPrice && r.hasStock && !r.groupingReview),
    B_name_review: rows.filter((r) => !r.confidentName),
    C_price_missing: rows.filter((r) => !r.hasPrice),
    D_inventory_missing: rows.filter((r) => !r.hasStock),
    E_multiple_missing: rows.filter((r) => !r.confidentName && !r.hasPrice && !r.hasStock),
    F_grouping_review: rows.filter((r) => r.groupingReview),
  };

  // Confident commercial name improvements from source (handbags + named kitchen)
  const nameUpdates = [];
  for (const r of rows) {
    if (r.categorySlug === "handbags" && r.color) {
      const suggested = `${r.color
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")} Handbag`;
      if (suggested !== r.name) {
        nameUpdates.push({ id: r.id, sku: r.sku, from: r.name, to: suggested, reason: "colorway from filename" });
      }
    }
  }

  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(
    join(ROOT, "docs/product-import-inspect.json"),
    JSON.stringify(
      {
        taxRules: taxRules.map((t) => ({
          id: t.id,
          name: t.name,
          country: t.country?.iso2 ?? null,
          priority: t.priority,
          rates: t.rates.map((r) => ({
            rateBps: r.rateBps,
            inclusive: r.inclusive,
            taxCode: r.taxCode,
          })),
        })),
        count: rows.length,
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.map((r) => r.sku)]),
        ),
        bucketCounts: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.length]),
        ),
        nameUpdates,
        rows,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        count: rows.length,
        taxRules: taxRules.map((t) => ({
          name: t.name,
          country: t.country?.iso2 ?? null,
          rates: t.rates.map((r) => ({
            rateBps: r.rateBps,
            inclusive: r.inclusive,
            taxCode: r.taxCode,
          })),
        })),
        bucketCounts: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.length]),
        ),
        nameUpdates: nameUpdates.length,
        confidentNames: rows.filter((r) => r.confidentName).map((r) => ({
          sku: r.sku,
          name: r.name,
          category: r.category,
        })),
        sample: rows.filter((r) => r.categorySlug === "handbags").slice(0, 3),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
