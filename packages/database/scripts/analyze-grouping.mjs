import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
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

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (extname(full).toLowerCase() === ".svg") out.push(full);
  }
  return out;
}

function hashFile(path) {
  const buf = readFileSync(path);
  return {
    sha1: createHash("sha1").update(buf).digest("hex"),
    size: buf.length,
    // lightweight visual fingerprint: strip whitespace and take sample
    fingerprint: createHash("sha1")
      .update(buf.toString("utf8").replace(/\s+/g, " ").slice(0, 8000))
      .digest("hex")
      .slice(0, 12),
  };
}

const prisma = new PrismaClient();
try {
  const sourceFiles = walk(join(ROOT, "organized_products"));
  const byHash = new Map();
  const fileMeta = [];
  for (const full of sourceFiles) {
    const rel = full.replace(/\\/g, "/").split("/organized_products/")[1];
    const h = hashFile(full);
    if (!byHash.has(h.sha1)) byHash.set(h.sha1, []);
    byHash.get(h.sha1).push(rel);
    fileMeta.push({ rel, ...h, filename: basename(full) });
  }

  const duplicates = [...byHash.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([sha1, files]) => ({ sha1: sha1.slice(0, 12), files }));

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      media: { some: { url: { startsWith: "/products/import/" } } },
    },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      variants: { where: { deletedAt: null }, select: { id: true, sku: true, isDefault: true } },
      categories: { include: { category: true } },
    },
    orderBy: { slug: "asc" },
  });

  const rows = products.map((p) => {
    const cat = p.categories.find((c) => c.isPrimary)?.category ?? p.categories[0]?.category;
    const variant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: variant?.sku || "",
      category: cat?.name || "",
      categorySlug: cat?.slug || "",
      imageCount: p.media.length,
      storageKeys: p.media.map((m) => m.storageKey || ""),
      urls: p.media.map((m) => m.url),
      description: (p.description || "").slice(0, 200),
    };
  });

  // Kitchen copy-0 files vs hot pot
  const kitchen0 = fileMeta.filter((f) =>
    f.rel.startsWith("kitchen/") &&
    !/\(\d+\)/.test(f.filename) &&
    !/slotted|wooden|spiral|whisk_top|all_components|electric_hot/.test(f.filename.toLowerCase()),
  );

  // Sample SVG titles/text content for naming clues
  function extractTextHints(rel) {
    const full = join(ROOT, "organized_products", rel);
    if (!existsSync(full)) return [];
    const text = readFileSync(full, "utf8");
    const hints = [];
    const title = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title) hints.push(`title:${title[1].trim()}`);
    const texts = [...text.matchAll(/>([A-Za-z][A-Za-z0-9 &'\-]{3,40})</g)]
      .map((m) => m[1].trim())
      .filter((t) => !/^(svg|path|g|defs|clipPath|linearGradient)$/i.test(t));
    hints.push(...texts.slice(0, 8));
    return [...new Set(hints)].slice(0, 12);
  }

  const nameReview = rows.filter((r) =>
    /^(Beauty|Fashion Wear|Toy|Kitchen) Product\b|^Toy Image\b|^All Components$/i.test(r.name),
  );

  const groupingSkus = [
    "HAN-001", "HAN-003", "HAN-008", "KIT-008", "KIT-009", "TOY-015",
    "TOY-016", "TOY-017", "TOY-018", "TOY-019", "TOY-020", "TOY-021",
    "TOY-022", "TOY-023", "TOY-024", "TOY-025", "TOY-026", "TOY-027",
    "TOY-028", "TOY-029", "TOY-030",
  ];
  const groupingRows = rows.filter((r) => groupingSkus.includes(r.sku));

  // Compare HAN-003 vs HAN-008 front images
  const black02 = fileMeta.find((f) => f.filename === "02_Black_01_Front.svg");
  const black04 = fileMeta.find((f) => f.filename === "04_Black_01_Front.svg");

  // Toy images.svg content hashes - are they unique?
  const toyImages = fileMeta.filter((f) => f.rel.startsWith("toys/images"));
  const toyImageDupes = toyImages.filter((f) =>
    (byHash.get(f.sha1) || []).length > 1,
  );

  // Beauty: check if front_view_hd.svg duplicates a numbered one
  const beautyOrphans = fileMeta.filter((f) =>
    f.rel === "beauty/front_view_hd.svg" || f.rel === "beauty/bottom_view_hd.svg",
  );

  writeFileSync(
    join(ROOT, "docs/product-grouping-analysis.json"),
    JSON.stringify(
      {
        sourceCount: sourceFiles.length,
        duplicateExactContentGroups: duplicates.length,
        duplicateSamples: duplicates.slice(0, 20),
        blackHandbagCompare: {
          black02: black02 ? { sha1: black02.sha1.slice(0, 12), size: black02.size, fp: black02.fingerprint } : null,
          black04: black04 ? { sha1: black04.sha1.slice(0, 12), size: black04.size, fp: black04.fingerprint } : null,
          sameContent: black02 && black04 ? black02.sha1 === black04.sha1 : null,
        },
        kitchenCopy0: kitchen0.map((f) => f.filename),
        kitchenNamedHints: {
          hotPot: extractTextHints("kitchen/electric_hot_pot_front_top_bottom_3d_hd (2) - Copy.svg"),
          allComponents: extractTextHints("kitchen/12_all_components_hd.svg"),
          knob: extractTextHints("kitchen/09_knob_closeup_hd.svg"),
          spout: extractTextHints("kitchen/10_spout_closeup_hd.svg"),
          front0: extractTextHints("kitchen/01_front_view_hd.svg"),
        },
        beautyOrphans: beautyOrphans.map((f) => ({
          filename: f.filename,
          sha1: f.sha1.slice(0, 12),
          dupes: byHash.get(f.sha1),
          hints: extractTextHints(f.rel),
        })),
        toyImages: toyImages.map((f) => ({
          filename: f.filename,
          sha1: f.sha1.slice(0, 12),
          size: f.size,
          hints: extractTextHints(f.rel),
        })),
        toyImageExactDupes: toyImageDupes.map((f) => f.filename),
        groupingRows,
        nameReviewSample: nameReview.slice(0, 5).map((r) => ({
          sku: r.sku,
          name: r.name,
          images: r.storageKeys,
          hints: r.storageKeys.slice(0, 1).flatMap((k) => {
            const rel = k.includes("/") ? k : null;
            // storageKey is like beauty/01_front...
            return rel ? extractTextHints(rel) : [];
          }),
        })),
        nameReviewCount: nameReview.length,
        // Check beauty product 01 hints from first media
        beautyHints: rows
          .filter((r) => r.categorySlug === "beauty")
          .map((r) => ({
            sku: r.sku,
            name: r.name,
            keys: r.storageKeys,
            hints: r.storageKeys.slice(0, 2).flatMap((k) => extractTextHints(k)),
          })),
        fashionHints: rows
          .filter((r) => r.categorySlug === "fashion-wear")
          .map((r) => ({
            sku: r.sku,
            name: r.name,
            keys: r.storageKeys,
            hints: r.storageKeys.slice(0, 1).flatMap((k) => extractTextHints(k)),
          })),
        kitchenProducts: rows
          .filter((r) => r.categorySlug === "kitchen")
          .map((r) => ({ sku: r.sku, name: r.name, keys: r.storageKeys })),
        toyProducts: rows
          .filter((r) => r.categorySlug === "toys")
          .map((r) => ({ sku: r.sku, name: r.name, keys: r.storageKeys, imageCount: r.imageCount })),
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        duplicates: duplicates.length,
        blackSame: black02 && black04 ? black02.sha1 === black04.sha1 : null,
        kitchenCopy0: kitchen0.map((f) => f.filename),
        nameReview: nameReview.length,
        grouping: groupingRows.map((r) => ({ sku: r.sku, name: r.name, n: r.imageCount })),
        toyImageCount: toyImages.length,
        beautyOrphanDupes: beautyOrphans.map((f) => ({ f: f.filename, n: byHash.get(f.sha1)?.length })),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
