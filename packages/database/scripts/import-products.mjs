/**
 * Idempotent catalogue import from organized_products/.
 *
 * Usage (repo root):
 *   node packages/database/scripts/import-products.mjs
 *   node packages/database/scripts/import-products.mjs --dry-run
 *
 * Does not invent prices, stock, brands, or ratings.
 * Does not delete existing catalogue rows.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const SOURCE_ROOT = join(ROOT, "organized_products");
const PUBLIC_IMPORT = join(ROOT, "apps/web/public/products/import");
const SNAPSHOT_DIR = join(ROOT, "docs/product-import-snapshots");
const REPORT_PATH = join(ROOT, "docs/product-import-report.md");
const DRY_RUN = process.argv.includes("--dry-run");

const CATEGORY_MAP = {
  beauty: {
    folder: "beauty",
    slug: "beauty",
    name: "Beauty",
    skuPrefix: "BEA",
    sortOrder: 200,
  },
  fashion_wear: {
    folder: "fashion_wear",
    slug: "fashion-wear",
    name: "Fashion Wear",
    skuPrefix: "FAS",
    sortOrder: 210,
  },
  handbag: {
    folder: "handbag",
    slug: "handbags",
    name: "Handbags",
    skuPrefix: "HAN",
    sortOrder: 220,
  },
  kitchen: {
    folder: "kitchen",
    slug: "kitchen",
    name: "Kitchen",
    skuPrefix: "KIT",
    sortOrder: 230,
  },
  toys: {
    folder: "toys",
    slug: "toys",
    name: "Toys",
    skuPrefix: "TOY",
    sortOrder: 240,
  },
};

const VIEW_ORDER = [
  "front",
  "three_quarter",
  "angled",
  "side",
  "left",
  "right",
  "back",
  "rear",
  "top",
  "bottom",
  "lifestyle",
  "closeup",
  "accessories",
  "other",
];

function loadEnv() {
  const candidates = [
    join(ROOT, ".env.local"),
    join(process.cwd(), ".env.local"),
  ];
  for (const path of candidates) {
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
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

function slugify(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

function titleCase(input) {
  return String(input)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function viewRank(view) {
  const idx = VIEW_ORDER.indexOf(view);
  return idx === -1 ? VIEW_ORDER.length : idx;
}

function detectView(stem) {
  const s = stem.toLowerCase();
  if (/three[_-]?quarter|3q/.test(s)) return "three_quarter";
  if (/lifestyle/.test(s)) return "lifestyle";
  if (/another[_-]?angle|angled|angle/.test(s)) return "angled";
  if (/front/.test(s)) return "front";
  if (/back|rear/.test(s)) return "back";
  if (/left/.test(s)) return "left";
  if (/right/.test(s)) return "right";
  if (/side/.test(s)) return "side";
  if (/top/.test(s)) return "top";
  if (/bottom/.test(s)) return "bottom";
  if (/closeup|knob|spout/.test(s)) return "closeup";
  if (/accessor|batter|remote|propeller|cable|component/.test(s)) return "accessories";
  return "other";
}

function parseCopyIndex(stem) {
  const stamped = stem.match(/\((\d{8}-\d{6})\)$/);
  if (stamped) return { copyKey: `ts-${stamped[1]}`, label: stamped[1] };

  const paren = stem.match(/\((\d+)\)\s*$/) || stem.match(/\((\d+)\)(?!.*\()/);
  if (paren) return { copyKey: paren[1], label: paren[1] };

  // fashion style: name(1) without space
  const tight = stem.match(/\((\d+)\)$/);
  if (tight) return { copyKey: tight[1], label: tight[1] };

  return { copyKey: "0", label: "0" };
}

function stripCopySuffix(stem) {
  return stem
    .replace(/\(\d{8}-\d{6}\)$/, "")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/\(\d+\)$/, "")
    .replace(/\s+-\s*copy$/i, "")
    .replace(/\s+$/, "");
}

function listSourceImages(folder) {
  const dir = join(SOURCE_ROOT, folder);
  return walkFiles(dir)
    .filter((f) => extname(f).toLowerCase() === ".svg")
    .map((full) => {
      const filename = basename(full);
      const stem = filename.replace(/\.svg$/i, "");
      return {
        full,
        filename,
        stem,
        rel: relative(SOURCE_ROOT, full).replaceAll("\\", "/"),
      };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
}

function groupHandbags(files) {
  const groups = new Map();
  for (const file of files) {
    const stem = file.stem;
    const m = stem.match(
      /^(?:(\d+)_)?(.+?)_(0?\d+)_(Front|Three_Quarter|Side|Back|Bottom)$/i,
    );
    let colorKey;
    let series = "";
    let view;
    let viewNo = 99;
    if (m) {
      series = m[1] || "";
      colorKey = `${series ? `${series}_` : ""}${m[2]}`.toLowerCase();
      viewNo = Number(m[3]);
      view = detectView(m[4]);
    } else {
      colorKey = slugify(stem);
      view = detectView(stem);
    }
    if (!groups.has(colorKey)) groups.set(colorKey, []);
    groups.get(colorKey).push({
      ...file,
      view,
      viewNo,
      series,
      colorLabel: m ? m[2].replaceAll("_", " ") : stem,
      assumption: "Handbag colorway grouped from filename color + view tokens.",
    });
  }

  // Detect duplicate color labels across series so names stay unique (e.g. 02_Black vs 04_Black).
  const colorCounts = new Map();
  for (const [, images] of groups) {
    const label = (images[0]?.colorLabel || "").toLowerCase();
    colorCounts.set(label, (colorCounts.get(label) || 0) + 1);
  }

  const products = [];
  for (const [colorKey, images] of groups) {
    images.sort((a, b) => a.viewNo - b.viewNo || viewRank(a.view) - viewRank(b.view));
    const colorLabel = titleCase(images[0]?.colorLabel || colorKey.replace(/^\d+_/, "").replaceAll("_", " "));
    const series = images[0]?.series || "";
    const duplicateColor = (colorCounts.get(colorLabel.toLowerCase()) || 0) > 1 && series;
    const name = duplicateColor
      ? `${colorLabel} Handbag ${series}`
      : `${colorLabel} Handbag`;
    products.push({
      groupId: `handbag:${colorKey}`,
      name,
      slugBase: slugify(name),
      description:
        "Imported from organized handbag imagery. Color and views were taken from source filenames. Price and stock require manual entry.",
      images,
      assumptions: [
        "One product per colorway prefix in the handbag folder.",
        ...(duplicateColor
          ? [
              `Series prefix ${series} included in the title because the same color label appears more than once.`,
            ]
          : []),
        "No price or inventory invented.",
      ],
      missing: ["price", "stock", "brand", "size"],
      needsManualReview: images.length < 3,
    });
  }
  return products;
}

function groupByCopyIndex(files, { categoryLabel, namePrefix, extraAssumptions = [] }) {
  const groups = new Map();
  for (const file of files) {
    const copy = parseCopyIndex(file.stem);
    const baseStem = stripCopySuffix(file.stem);
    const orderMatch = baseStem.match(/^(\d+)_/);
    const order = orderMatch ? Number(orderMatch[1]) : 50;
    const view = detectView(baseStem);
    if (!groups.has(copy.copyKey)) groups.set(copy.copyKey, []);
    groups.get(copy.copyKey).push({
      ...file,
      view,
      order,
      assumption: `Grouped with copy index ${copy.label} within ${categoryLabel}.`,
    });
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "0") return -1;
    if (b === "0") return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return sortedKeys.map((key, idx) => {
    const images = groups.get(key);
    images.sort((a, b) => a.order - b.order || viewRank(a.view) - viewRank(b.view));
    const n = idx + 1;
    const pad = String(n).padStart(2, "0");
    return {
      groupId: `${slugify(categoryLabel)}:copy-${key}`,
      name: `${namePrefix} ${pad}`,
      slugBase: slugify(`${namePrefix} ${pad}`),
      description: `Imported from ${categoryLabel} source imagery (set ${pad}). Product title is a placeholder derived from folder grouping because source files do not include commercial names. Price and stock require manual entry.`,
      images,
      assumptions: [
        `Views sharing Windows-style copy index "${key}" were treated as one product.`,
        ...extraAssumptions,
        "No price or inventory invented.",
      ],
      missing: ["commercial name", "price", "stock", "brand", "size", "color"],
      needsManualReview: true,
    };
  });
}

function groupKitchen(files) {
  const utensil = [];
  const multi = [];
  for (const file of files) {
    const s = file.stem.toLowerCase();
    if (
      /slotted_spoon|wooden_spatula|spiral_whisk|whisk_top|slotted_spatula|all_components|electric_hot_pot/.test(
        s,
      )
    ) {
      utensil.push(file);
    } else {
      multi.push(file);
    }
  }

  const products = [];
  for (const file of utensil) {
    const raw = stripCopySuffix(file.stem)
      .replace(/^\d+_/, "")
      .replace(/_hd$/i, "")
      .replace(/_top$/i, "")
      .replace(/_front_top_bottom_3d$/i, "")
      .replace(/\s*-\s*copy$/i, "");
    let base = raw;
    let name;
    let needsManualReview = false;
    if (/electric_hot_pot/i.test(base)) {
      name = "Electric Hot Pot";
      base = "electric_hot_pot";
      needsManualReview = true; // possible relation to multi-view / components sets
    } else if (/all_components/i.test(base)) {
      name = "Kitchen Components";
      base = "all_components";
      needsManualReview = true;
    } else {
      name = titleCase(base.replaceAll("_", " "));
    }
    products.push({
      groupId: `kitchen:named:${slugify(base)}`,
      name,
      slugBase: slugify(name),
      description: `Imported kitchen item imagery (${file.filename}). Price and stock require manual entry.`,
      images: [{ ...file, view: detectView(file.stem), order: 1 }],
      assumptions: ["Named kitchen asset treated as its own product from the filename."],
      missing: ["price", "stock", "brand"],
      needsManualReview,
    });
  }

  products.push(
    ...groupByCopyIndex(multi, {
      categoryLabel: "kitchen",
      namePrefix: "Kitchen Product",
      extraAssumptions: [
        "Front/top/bottom/side view sets without commercial names were grouped by copy index.",
        "Knob/spout closeups sharing copy index 0 stay with that multi-view set pending manual remap to Electric Hot Pot if confirmed.",
      ],
    }),
  );
  return products;
}

function groupToys(files) {
  const transformer = [];
  const unnamed = [];
  const rest = [];

  for (const file of files) {
    const s = file.stem.toLowerCase();
    if (/^images(\s*\(\d+\))?$/i.test(file.stem) || /^images$/i.test(file.stem)) {
      unnamed.push(file);
    } else if (/robot|car_mode|transforming|batter|remote|propeller|accessories/.test(s)) {
      transformer.push(file);
    } else {
      rest.push(file);
    }
  }

  const products = [];

  if (transformer.length) {
    const images = transformer
      .map((file) => ({
        ...file,
        view: detectView(file.stem),
        order: Number((file.stem.match(/^(\d+)_/) || [])[1] || 50),
      }))
      .sort((a, b) => a.order - b.order || viewRank(a.view) - viewRank(b.view));
    products.push({
      groupId: "toys:transformer",
      name: "Transforming Robot Car",
      slugBase: "transforming-robot-car",
      description:
        "Imported toy imagery that references robot/car modes and accessories. Confirm whether all of these assets belong to one SKU. Price and stock require manual entry.",
      images,
      assumptions: [
        "Files mentioning robot/car modes or shared accessories were grouped as one transforming toy.",
      ],
      missing: ["price", "stock", "brand", "confirm single SKU"],
      needsManualReview: true,
    });
  }

  for (const file of unnamed) {
    const copy = parseCopyIndex(file.stem);
    const label = copy.copyKey === "0" ? "01" : String(copy.copyKey).padStart(2, "0");
    products.push({
      groupId: `toys:unnamed:${copy.copyKey}:${file.filename}`,
      name: `Toy Image ${label}`,
      slugBase: slugify(`toy-image-${label}-${createHash("sha1").update(file.filename).digest("hex").slice(0, 6)}`),
      description:
        "Imported from an untitled toys/images SVG. Commercial name is unknown. Price and stock require manual entry.",
      images: [{ ...file, view: "other", order: 1 }],
      assumptions: ["Untitled images.svg assets imported as individual products pending naming."],
      missing: ["commercial name", "price", "stock", "brand"],
      needsManualReview: true,
    });
  }

  products.push(
    ...groupByCopyIndex(rest, {
      categoryLabel: "toys",
      namePrefix: "Toy Product",
    }),
  );
  return products;
}

function detectProducts() {
  const all = [];
  for (const [key, meta] of Object.entries(CATEGORY_MAP)) {
    const files = listSourceImages(meta.folder);
    let products;
    if (key === "handbag") products = groupHandbags(files);
    else if (key === "kitchen") products = groupKitchen(files);
    else if (key === "toys") products = groupToys(files);
    else if (key === "beauty") {
      products = groupByCopyIndex(files, {
        categoryLabel: "beauty",
        namePrefix: "Beauty Product",
      });
    } else {
      products = groupByCopyIndex(files, {
        categoryLabel: "fashion wear",
        namePrefix: "Fashion Wear Product",
      });
    }

    for (const product of products) {
      all.push({ ...product, categoryKey: key, category: meta });
    }
  }
  return all;
}

function uniqueSlug(base, used) {
  let slug = base || "imported-product";
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function assignSkus(products) {
  const counters = {};
  for (const product of products) {
    const prefix = product.category.skuPrefix;
    counters[prefix] = (counters[prefix] || 0) + 1;
    product.sku = `${prefix}-${String(counters[prefix]).padStart(3, "0")}`;
  }
}

function webSafeName(filename, index, view) {
  const ext = extname(filename).toLowerCase() || ".svg";
  const safeView = slugify(view || "image") || "image";
  return `${String(index + 1).padStart(2, "0")}-${safeView}${ext}`;
}

async function snapshotCatalogue(prisma) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(SNAPSHOT_DIR, `catalogue-${stamp}.json`);
  const [categories, products, variants, media, prices] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, name: true, isActive: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        publishedAt: true,
        description: true,
      },
    }),
    prisma.productVariant.findMany({
      where: { deletedAt: null },
      select: { id: true, productId: true, sku: true, name: true, isDefault: true, isActive: true },
    }),
    prisma.productMedia.findMany({
      select: {
        id: true,
        productId: true,
        variantId: true,
        url: true,
        storageKey: true,
        isPrimary: true,
        sortOrder: true,
      },
    }),
    prisma.price.findMany({
      where: { isActive: true },
      select: {
        id: true,
        variantId: true,
        currencyCode: true,
        amountMinor: true,
        compareAtMinor: true,
      },
    }),
  ]);

  const payload = {
    createdAt: new Date().toISOString(),
    counts: {
      categories: categories.length,
      products: products.length,
      variants: variants.length,
      media: media.length,
      prices: prices.length,
    },
    categories,
    products,
    variants,
    media,
    prices: prices.map((p) => ({
      ...p,
      amountMinor: p.amountMinor.toString(),
      compareAtMinor: p.compareAtMinor?.toString() ?? null,
    })),
  };
  writeFileSync(path, JSON.stringify(payload, null, 2));
  return path;
}

function writeReport({ products, summary, snapshotPath, categoryStats }) {
  const lines = [];
  lines.push("# Product import report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Dry run: ${DRY_RUN ? "yes" : "no"}`);
  lines.push(`Logical snapshot: \`${relative(ROOT, snapshotPath).replaceAll("\\\\", "/")}\``);
  lines.push("");
  lines.push("## Source inventory");
  lines.push("");
  lines.push("| Category folder | Images | Detected products |");
  lines.push("| --- | ---: | ---: |");
  for (const [key, meta] of Object.entries(CATEGORY_MAP)) {
    const count = products.filter((p) => p.categoryKey === key).length;
    const images = products
      .filter((p) => p.categoryKey === key)
      .reduce((n, p) => n + p.images.length, 0);
    lines.push(`| ${meta.folder} → ${meta.name} | ${images} | ${count} |`);
  }
  lines.push("");
  lines.push("## Import summary");
  lines.push("");
  lines.push("```");
  lines.push(summary);
  lines.push("```");
  lines.push("");
  lines.push("## Groupings");
  lines.push("");
  for (const product of products) {
    lines.push(`### ${product.name} (\`${product.slug}\` / \`${product.sku}\`)`);
    lines.push("");
    lines.push(`- Category: ${product.category.name} (\`${product.category.slug}\`)`);
    lines.push(`- Source folder: \`organized_products/${product.category.folder}/\``);
    lines.push(`- Manual review: ${product.needsManualReview ? "YES" : "no"}`);
    lines.push(`- Missing: ${product.missing.join(", ") || "none listed"}`);
    lines.push("- Assumptions:");
    for (const a of product.assumptions) lines.push(`  - ${a}`);
    lines.push("- Source images:");
    for (const img of product.images) {
      lines.push(`  - \`${img.rel}\` → view \`${img.view}\``);
    }
    lines.push("");
  }
  writeFileSync(REPORT_PATH, lines.join("\n"));
}

function formatSummary(stats) {
  const lines = [];
  lines.push("CATEGORY SUMMARY");
  for (const row of stats.categories) {
    lines.push(`${row.name}: ${row.products} products / ${row.images} images`);
  }
  lines.push("");
  lines.push("TOTAL:");
  lines.push(`Products imported: ${stats.productsImported}`);
  lines.push(`Products updated: ${stats.productsUpdated}`);
  lines.push(`Products skipped: ${stats.productsSkipped}`);
  lines.push(`Images imported: ${stats.imagesImported}`);
  lines.push(`Images skipped: ${stats.imagesSkipped}`);
  lines.push(`Variants imported: ${stats.variantsImported}`);
  lines.push(`Duplicates detected: ${stats.duplicatesDetected}`);
  lines.push(`Products requiring manual data: ${stats.manualReview}`);
  return lines.join("\n");
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  let host = "UNKNOWN";
  try {
    host = new URL(process.env.DATABASE_URL).hostname;
  } catch {
    host = "UNKNOWN";
  }
  const allowRemote = process.argv.includes("--allow-remote");
  if (!/^(localhost|127\.0\.0\.1)$/i.test(host) && !allowRemote) {
    throw new Error(
      "Refusing import: DATABASE_URL host is not LOCAL (pass --allow-remote for one-time prod).",
    );
  }
  if (allowRemote && !/^(localhost|127\.0\.0\.1)$/i.test(host)) {
    const suffix = host.includes(".") ? host.split(".").slice(-2).join(".") : host;
    console.log(`Remote import target host suffix: ${suffix}`);
  }

  if (!existsSync(SOURCE_ROOT)) {
    throw new Error(`Missing source folder: ${SOURCE_ROOT}`);
  }

  const prisma = new PrismaClient();
  const stats = {
    categories: [],
    productsImported: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    imagesImported: 0,
    imagesSkipped: 0,
    variantsImported: 0,
    duplicatesDetected: 0,
    manualReview: 0,
  };

  try {
    const snapshotPath = DRY_RUN
      ? join(SNAPSHOT_DIR, "dry-run-skipped.json")
      : await snapshotCatalogue(prisma);
    if (DRY_RUN) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
      writeFileSync(snapshotPath, JSON.stringify({ dryRun: true }, null, 2));
    }

  const products = detectProducts();
  products.sort((a, b) => a.groupId.localeCompare(b.groupId));
  assignSkus(products);

    const usedSlugs = new Set(
      (
        await prisma.product.findMany({
          where: { deletedAt: null },
          select: { slug: true },
        })
      ).map((p) => p.slug),
    );

    for (const product of products) {
      // Prefer keeping an already-imported slug if this group was imported before.
      const existingBySku = await prisma.productVariant.findUnique({
        where: { sku: product.sku },
        include: { product: true },
      });
      if (existingBySku?.product?.slug) {
        product.slug = existingBySku.product.slug;
        usedSlugs.add(product.slug);
      } else {
        product.slug = uniqueSlug(product.slugBase, usedSlugs);
      }
      if (product.needsManualReview) stats.manualReview += 1;
    }

    const categoryRows = new Map();
    for (const meta of Object.values(CATEGORY_MAP)) {
      if (DRY_RUN) {
        categoryRows.set(meta.slug, { id: `dry-${meta.slug}`, ...meta });
        continue;
      }
      const row = await prisma.category.upsert({
        where: { slug: meta.slug },
        create: {
          slug: meta.slug,
          name: meta.name,
          path: `/${meta.slug}`,
          sortOrder: meta.sortOrder,
          isActive: true,
          deletedAt: null,
          description: `Imported catalogue category for ${meta.name}.`,
        },
        update: {
          name: meta.name,
          path: `/${meta.slug}`,
          sortOrder: meta.sortOrder,
          isActive: true,
          deletedAt: null,
        },
      });
      categoryRows.set(meta.slug, row);
    }

    for (const [key, meta] of Object.entries(CATEGORY_MAP)) {
      const subset = products.filter((p) => p.categoryKey === key);
      stats.categories.push({
        name: meta.name,
        products: subset.length,
        images: subset.reduce((n, p) => n + p.images.length, 0),
      });
    }

    for (const product of products) {
      const category = categoryRows.get(product.category.slug);
      const destDir = join(PUBLIC_IMPORT, product.category.slug, product.slug);
      if (!DRY_RUN) mkdirSync(destDir, { recursive: true });

      const mediaPlan = product.images.map((img, index) => {
        const destName = webSafeName(img.filename, index, img.view);
        const destFull = join(destDir, destName);
        const url = `/products/import/${product.category.slug}/${product.slug}/${destName}`;
        return { img, destFull, url, index, isPrimary: index === 0 };
      });

      if (DRY_RUN) {
        stats.productsImported += 1;
        stats.variantsImported += 1;
        stats.imagesImported += mediaPlan.length;
        continue;
      }

      const existingVariant = await prisma.productVariant.findUnique({
        where: { sku: product.sku },
        include: { product: true },
      });
      const existingBySlug = await prisma.product.findUnique({
        where: { slug: product.slug },
      });

      let productRow = existingVariant?.product || existingBySlug;
      let created = false;

      if (!productRow) {
        productRow = await prisma.product.create({
          data: {
            slug: product.slug,
            name: product.name,
            description: product.description,
            status: "ACTIVE",
            publishedAt: new Date(),
            deletedAt: null,
          },
        });
        created = true;
        stats.productsImported += 1;
      } else {
        const sameIdentity =
          existingVariant?.productId === productRow.id ||
          productRow.slug === product.slug;
        if (!sameIdentity) {
          stats.duplicatesDetected += 1;
          stats.productsSkipped += 1;
          continue;
        }
        await prisma.product.update({
          where: { id: productRow.id },
          data: {
            name: product.name,
            description: product.description,
            status: "ACTIVE",
            publishedAt: productRow.publishedAt ?? new Date(),
            deletedAt: null,
          },
        });
        stats.productsUpdated += 1;
      }

      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId: productRow.id,
            categoryId: category.id,
          },
        },
        create: {
          productId: productRow.id,
          categoryId: category.id,
          isPrimary: true,
        },
        update: { isPrimary: true },
      });

      let variant = existingVariant;
      if (!variant || variant.productId !== productRow.id) {
        const bySku = await prisma.productVariant.findUnique({ where: { sku: product.sku } });
        if (bySku && bySku.productId !== productRow.id) {
          stats.duplicatesDetected += 1;
          stats.productsSkipped += 1;
          continue;
        }
        variant =
          bySku ||
          (await prisma.productVariant.create({
            data: {
              productId: productRow.id,
              sku: product.sku,
              name: "Default",
              isDefault: true,
              isActive: true,
              deletedAt: null,
            },
          }));
        if (!bySku) stats.variantsImported += 1;
      } else {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            name: "Default",
            isDefault: true,
            isActive: true,
            deletedAt: null,
          },
        });
      }

      // Do not invent Price or InventoryItem rows.

      for (const item of mediaPlan) {
        if (!existsSync(item.destFull)) {
          copyFileSync(item.img.full, item.destFull);
        }
        const existingMedia = await prisma.productMedia.findFirst({
          where: {
            productId: productRow.id,
            url: item.url,
          },
        });
        if (existingMedia) {
          await prisma.productMedia.update({
            where: { id: existingMedia.id },
            data: {
              kind: "IMAGE",
              mimeType: "image/svg+xml",
              altText: `${product.name} — ${item.img.view}`,
              sortOrder: item.index,
              isPrimary: item.isPrimary,
              storageKey: item.img.rel,
            },
          });
          stats.imagesSkipped += 1;
        } else {
          await prisma.productMedia.create({
            data: {
              productId: productRow.id,
              kind: "IMAGE",
              url: item.url,
              mimeType: "image/svg+xml",
              altText: `${product.name} — ${item.img.view}`,
              sortOrder: item.index,
              isPrimary: item.isPrimary,
              storageKey: item.img.rel,
            },
          });
          stats.imagesImported += 1;
        }
      }

      // Ensure only one primary
      const mediaRows = await prisma.productMedia.findMany({
        where: { productId: productRow.id },
        orderBy: [{ sortOrder: "asc" }],
      });
      if (mediaRows.length) {
        for (const [i, row] of mediaRows.entries()) {
          await prisma.productMedia.update({
            where: { id: row.id },
            data: { isPrimary: i === 0 },
          });
        }
      }

      void created;
    }

    const summary = formatSummary(stats);
    writeReport({ products, summary, snapshotPath, categoryStats: stats.categories });
    console.log(summary);
    console.log(`\nReport: ${REPORT_PATH}`);
    console.log(`Snapshot: ${snapshotPath}`);
    console.log(`Detected products: ${products.length}`);
    console.log(
      `Detected images: ${products.reduce((n, p) => n + p.images.length, 0)}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
