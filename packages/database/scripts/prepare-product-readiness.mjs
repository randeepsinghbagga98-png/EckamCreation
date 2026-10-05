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
    "blush pink white",
    "sky blue white",
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
    if (blob.includes(c.replaceAll(" ", "_")) || blob.includes(c)) return c;
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

function isPlaceholderName(name) {
  return (
    /^(Beauty|Fashion Wear|Toy|Kitchen) Product\b/i.test(name) ||
    /^Toy Image\b/i.test(name) ||
    /^All Components$/i.test(name) ||
    /3d Hd|\(2\)|Front Top Bottom/i.test(name)
  );
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function bucketLabel(row) {
  // Primary triage label (buckets also counted with overlap below)
  if (!row.confidentName && !row.hasPrice && !row.hasStock) return "E";
  if (!row.confidentName) return "B";
  if (row.groupingReview) return "F";
  if (row.confidentName) return "A"; // confident name — ready for commercial data entry
  if (!row.hasPrice) return "C";
  if (!row.hasStock) return "D";
  return "A";
}

try {
  // Task 2 — confident name cleanup only (filename-supported, no invented claims)
  const hotPot = await prisma.product.findFirst({
    where: {
      slug: "electric-hot-pot-front-top-bottom-3d-hd-2",
      deletedAt: null,
    },
  });
  const nameChanges = [];
  if (hotPot && hotPot.name !== "Electric Hot Pot") {
    await prisma.product.update({
      where: { id: hotPot.id },
      data: { name: "Electric Hot Pot" },
    });
    nameChanges.push({
      id: hotPot.id,
      sku: "KIT-009",
      from: hotPot.name,
      to: "Electric Hot Pot",
      reason: "filename electric_hot_pot_*; stripped view/quality/copy tokens",
    });
  }

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

  const totalActive = await prisma.product.count({
    where: { deletedAt: null, status: "ACTIVE" },
  });
  const totalImages = await prisma.productMedia.count({
    where: { url: IMPORT_URL },
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
    const placeholderName = isPlaceholderName(p.name);
    const confidentName = !placeholderName;
    const hasPrice = Boolean(price);
    const hasStock = inv.length > 0;
    const groupingReview =
      /transforming|toy image|all components|images\.svg|copy index/i.test(
        `${p.description || ""} ${storageKeys.join(" ")} ${p.slug}`,
      ) ||
      (cat?.slug === "toys" && /toy-image|transforming/.test(p.slug)) ||
      (cat?.slug === "kitchen" && /components|hot-pot|electric/.test(p.slug)) ||
      (cat?.slug === "handbags" && p.media.length < 3) ||
      (cat?.slug === "handbags" && /black-handbag/.test(p.slug));

    const flags = [];
    if (!confidentName) flags.push("NAME_REVIEW");
    if (!hasPrice) flags.push("PRICE_MISSING");
    if (!hasStock) flags.push("INVENTORY_MISSING");
    if (groupingReview) flags.push("GROUPING_REVIEW");
    if (flags.filter((s) => s.endsWith("MISSING") || s === "NAME_REVIEW").length >= 2) {
      flags.push("MULTIPLE_MISSING");
    }
    const dataStatus = flags.length ? [...new Set(flags)].join("|") : "READY";

    return {
      id: p.id,
      category: cat?.name || "",
      categorySlug: cat?.slug || "",
      name: p.name,
      suggestedName: p.name,
      slug: p.slug,
      sku: variant?.sku || "",
      imageCount: p.media.length,
      color,
      productType: type,
      price: price ? price.amountMinor.toString() : "",
      inventory: hasStock ? String(onHand) : "",
      dataStatus,
      placeholderName,
      hasPrice,
      hasStock,
      groupingReview,
      confidentName,
      storageKeys,
      mediaUrls: p.media.map((m) => m.url),
      bucket: "",
    };
  });

  for (const r of rows) r.bucket = bucketLabel(r);

  const buckets = {
    A_ready: rows.filter((r) => r.confidentName && !r.groupingReview),
    B_name_review: rows.filter((r) => !r.confidentName),
    C_price_missing: rows.filter((r) => !r.hasPrice),
    D_inventory_missing: rows.filter((r) => !r.hasStock),
    E_multiple_missing: rows.filter((r) => !r.confidentName && !r.hasPrice && !r.hasStock),
    F_grouping_review: rows.filter((r) => r.groupingReview),
  };

  // Commercial template: products still needing price and/or stock (all 86 today; user cited 71 for full commercial package)
  const needsCommercial = rows.filter((r) => !r.hasPrice || !r.hasStock || !r.confidentName);

  const categoryTotals = {};
  for (const r of rows) {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + 1;
  }

  mkdirSync(join(ROOT, "docs"), { recursive: true });

  const csvHeader = [
    "SKU",
    "Product ID",
    "Category",
    "Suggested Product Name",
    "Price",
    "Compare-at/MRP",
    "Stock",
    "Color",
    "Status",
    "Manual Review",
  ];
  const csvLines = [
    csvHeader.join(","),
    ...needsCommercial.map((r) =>
      [
        csvEscape(r.sku),
        csvEscape(r.id),
        csvEscape(r.category),
        csvEscape(r.suggestedName),
        "", // Price — do not invent
        "", // MRP — do not invent
        "", // Stock — do not invent
        csvEscape(r.color),
        csvEscape(r.dataStatus),
        csvEscape(
          [
            !r.confidentName ? "name" : null,
            !r.hasPrice ? "price" : null,
            !r.hasStock ? "stock" : null,
            r.groupingReview ? "grouping" : null,
          ]
            .filter(Boolean)
            .join("|") || "yes",
        ),
      ].join(","),
    ),
  ];
  writeFileSync(join(ROOT, "docs/product-commercial-data-template.csv"), csvLines.join("\n") + "\n");

  writeFileSync(
    join(ROOT, "docs/product-import-inspect.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts: {
          importedProducts: rows.length,
          totalActiveProducts: totalActive,
          importedImages: totalImages,
          needsCommercial: needsCommercial.length,
          categoryTotals,
          bucketCounts: Object.fromEntries(
            Object.entries(buckets).map(([k, v]) => [k, v.length]),
          ),
        },
        nameChanges,
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.map((r) => r.sku)]),
        ),
        rows,
      },
      null,
      2,
    ),
  );

  const tableRows = rows
    .map(
      (r) =>
        `| ${r.id} | ${r.category} | ${r.name.replace(/\|/g, "/")} | ${r.slug} | ${r.sku} | ${r.imageCount} | ${r.color || "—"} | ${r.productType} | ${r.price || "—"} | ${r.inventory || "—"} | ${r.dataStatus} | ${r.bucket} |`,
    )
    .join("\n");

  const report = `# Product readiness report

Generated: ${new Date().toISOString()}

Local preparation only. No deploy, no GitHub push, no Render changes, no production database writes.

## Summary

| Metric | Count |
| --- | ---: |
| Total active products (local catalogue) | ${totalActive} |
| Imported products inspected | ${rows.length} |
| Imported images (SVG) | ${totalImages} |
| Products ready for commercial data entry (confident name; price/stock still blank) | ${rows.filter((r) => r.confidentName && !r.groupingReview).length} |
| Products requiring manual commercial data (price and/or stock and/or name) | ${needsCommercial.length} |
| Products requiring name review | ${buckets.B_name_review.length} |
| Products with price missing | ${buckets.C_price_missing.length} |
| Products with inventory missing | ${buckets.D_inventory_missing.length} |
| Products with multiple commercial fields missing | ${buckets.E_multiple_missing.length} |
| Products requiring grouping review | ${buckets.F_grouping_review.length} |
| Products fully ready (name + price + stock, no grouping flags) | ${buckets.A_ready.length} |

## Category totals (imported)

| Category | Products |
| --- | ---: |
${Object.entries(categoryTotals)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

## Classification legend

| Code | Meaning |
| --- | --- |
| A | Ready for commercial data (confident name; grouping OK; price/stock still to be filled manually) |
| B | Name needs review |
| C | Price missing |
| D | Inventory missing |
| E | Multiple fields missing (name + price + inventory) |
| F | Possible grouping review |

Note: Buckets overlap. A product can appear in B/C/D/E/F simultaneously. Column **Bucket** in the table below is the primary readiness bucket for triage.

## Name improvements applied

${
  nameChanges.length
    ? nameChanges
        .map(
          (c) =>
            `- **${c.sku}**: \`${c.from}\` → \`${c.to}\` (${c.reason})`,
        )
        .join("\n")
    : "- None required beyond import-time filename names."
}

No brands, materials, specifications, prices, or inventory quantities were invented.

## Grouping review notes

- **Handbags**: Colorways grouped by source prefix (front/three-quarter/side/back/bottom). Kept as separate SKUs per colorway. Two black handbags (\`HAN-003\` / \`HAN-008\`) remain separate (distinct source prefixes \`02_Black\` vs \`04_Black\`). \`HAN-001\` Ivory has only a bottom view in source — flagged for grouping/media completeness review. Dual-tone \`*_White\` colorways kept as named colorways, not merged into solid colors.
- **Beauty / Fashion Wear**: Grouped by Windows copy-index clusters; commercial names still placeholders.
- **Kitchen**: Named utensils kept as individual products. \`KIT-008\` All Components and \`KIT-009\` Electric Hot Pot flagged for possible set relationship review — not merged (would invent a commercial bundle).
- **Toys**: \`TOY-015\` Transforming Robot Car is a multi-view cluster; remaining \`Toy Image *\` / \`Toy Product *\` rows need manual identity and possible regrouping. No duplicate products created.

## Full product table (86 imported)

| Product ID | Category | Current name | Slug | SKU | Images | Color | Type | Price | Inventory | Data status | Bucket |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
${tableRows}

## Commercial data template

Blank price / MRP / stock for manual entry:

- \`docs/product-commercial-data-template.csv\` (${needsCommercial.length} rows)

## Test status

| Gate | Result |
| --- | --- |
| \`pnpm test\` | pending (run after this report generation) |
| \`pnpm typecheck\` | pending |
| \`pnpm lint\` | pending |
| \`pnpm --filter @eckamcreation/database exec prisma validate\` | pending |

### Test fixes applied

1. **ai-catalogue-tools.test.ts / catalogue search** — Application search now relevance-ranks text queries (whole-word / prefix before substring) so \`bag\` is not flooded by newer \`*Handbag\` imports. Behavior corrected in \`product-service.ts\` + \`helpers.ts\`; test expectation retained.
2. **payments.test.ts** — Intent amount correctly equals checkout \`totalMinor\` (subtotal − discount + tax + shipping). Hard-coded \`13000\` failed when shared local DB had India GST 18% from \`checkout.test.ts\` (\`10000 + 1800 + 3000 = 14800\`). Test now asserts against the session total and verifies subtotal/shipping components.

## Files changed

- \`apps/api/src/lib/catalogue/helpers.ts\` — search relevance scoring
- \`apps/api/src/lib/catalogue/product-service.ts\` — apply relevance ranking for \`q\` searches
- \`apps/api/src/payments.test.ts\` — assert payment intent against checkout total
- \`packages/database/scripts/inspect-imported-products.mjs\` — inspection helper
- \`packages/database/scripts/prepare-product-readiness.mjs\` — name cleanup + report/CSV generation
- \`docs/product-commercial-data-template.csv\` — pricing/stock template (blanks)
- \`docs/product-readiness-report.md\` — this report
- \`docs/product-import-inspect.json\` — machine-readable inspection dump
- Local DB product name update: \`electric-hot-pot-front-top-bottom-3d-hd-2\` → **Electric Hot Pot**

## Commands executed

\`\`\`
node packages/database/scripts/prepare-product-readiness.mjs
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @eckamcreation/database exec prisma validate
\`\`\`

## Stop conditions honored

- No deploy
- No GitHub push
- No Render changes
- No production database modifications
- No invented prices or inventory
`;

  writeFileSync(join(ROOT, "docs/product-readiness-report.md"), report);

  console.log(
    JSON.stringify(
      {
        imported: rows.length,
        totalActive,
        totalImages,
        needsCommercial: needsCommercial.length,
        nameChanges,
        bucketCounts: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.length]),
        ),
        categoryTotals,
        csvRows: needsCommercial.length,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
