/**
 * Idempotent local-only finalization of HIGH-confidence product names
 * after grouping/name review. Does NOT invent prices, stock, brands, or merges.
 */
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

/** HIGH-confidence name updates keyed by SKU (source-filename supported). */
const NAME_UPDATES = {
  "HAN-003": {
    to: "Black Handbag 02",
    evidence: "Source series prefix 02_Black_* (distinct from 04_Black).",
  },
  "HAN-008": {
    to: "Black Handbag 04",
    evidence: "Source series prefix 04_Black_* (distinct artwork/viewBox from 02_Black).",
  },
  "KIT-008": {
    to: "Kitchen Components",
    evidence: "Filename 12_all_components_hd.svg → descriptive components label; no brand/claims.",
  },
};

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

try {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      media: { some: { url: { startsWith: "/products/import/" } } },
    },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { deletedAt: null },
        select: { id: true, sku: true, isDefault: true, name: true },
      },
      categories: { include: { category: true } },
    },
    orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
  });

  const nameDecisions = [];
  const applied = [];

  for (const p of products) {
    const cat = p.categories.find((c) => c.isPrimary)?.category ?? p.categories[0]?.category;
    const variant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    const sku = variant?.sku || "";
    const update = NAME_UPDATES[sku];
    const oldName = p.name;
    let finalName = oldName;
    let confidence = "LOW";
    let evidence = "No commercial name tokens in source filenames.";
    let appliedChange = false;

    if (update) {
      finalName = update.to;
      confidence = "HIGH";
      evidence = update.evidence;
      if (oldName !== finalName) {
        await prisma.product.update({
          where: { id: p.id },
          data: { name: finalName },
        });
        appliedChange = true;
        applied.push({ sku, id: p.id, from: oldName, to: finalName });
      } else {
        appliedChange = false; // already applied (idempotent)
      }
    } else if (
      /Handbag$/i.test(oldName) ||
      /^(Slotted Spatula|Slotted Spoon|Spiral Whisk|Whisk|Wooden Spatula|Electric Hot Pot|Transforming Robot Car|Kitchen Components)$/i.test(
        oldName,
      )
    ) {
      confidence = "HIGH";
      evidence = "Filename / colorway already yields a commercial-safe name.";
    } else if (/^(Beauty|Fashion Wear|Toy|Kitchen) Product\b|^Toy Image\b|^All Components$/i.test(oldName)) {
      confidence = "LOW";
      evidence =
        "Placeholder only. Source files use generic view tokens (front/side/back) or untitled images.svg — commercial identity unknown.";
    }

    nameDecisions.push({
      productId: p.id,
      sku,
      category: cat?.name || "",
      categorySlug: cat?.slug || "",
      oldName,
      finalName,
      evidence,
      confidence,
      applied: appliedChange,
      sourceImages: (p.media.map((m) => m.storageKey || m.url) || []).join("; "),
      sourceFolder: (p.media[0]?.storageKey || "").split("/")[0] || cat?.slug || "",
      slug: p.slug,
      imageCount: p.media.length,
    });
  }

  // Grouping decisions for the 21 flagged SKUs (+ document all)
  const GROUPING = {
    "HAN-001": {
      decision: "KEEP",
      confidence: "HIGH",
      evidence:
        "Only 01_Ivory_05_Bottom.svg exists in source — incomplete media set, not a mis-group. Do not merge into another colorway.",
      variant: "none",
      color: "ivory",
      manual: false,
      notes: "Missing front/side/back in source; leave SKU as-is.",
    },
    "HAN-003": {
      decision: "KEEP",
      confidence: "HIGH",
      evidence:
        "02_Black_* set (5 views). Distinct file size/viewBox from 04_Black; not a duplicate of HAN-008.",
      variant: "none — possible future color-variant under series 02 with Cream, but silhouette not proven identical enough to merge now",
      color: "black",
      manual: false,
      notes: "Renamed to Black Handbag 02 for display uniqueness.",
    },
    "HAN-008": {
      decision: "KEEP",
      confidence: "HIGH",
      evidence:
        "04_Black_* set (5 views). Different dimensions from 02_Black (1600×988 vs 1317×875).",
      variant: "none — possible future series-04 color variants with Beige",
      color: "black",
      manual: false,
      notes: "Renamed to Black Handbag 04 for display uniqueness.",
    },
    "KIT-008": {
      decision: "MANUAL_REVIEW",
      confidence: "MEDIUM",
      evidence:
        "12_all_components_hd.svg may depict the electric hot pot accessory layout, but merge with KIT-009 would invent a commercial bundle without confirmation.",
      variant: "none",
      color: "",
      manual: true,
      notes: "Renamed to Kitchen Components. Confirm whether this is hot-pot accessories or a standalone kit.",
    },
    "KIT-009": {
      decision: "MANUAL_REVIEW",
      confidence: "MEDIUM",
      evidence:
        "electric_hot_pot_* is a distinct asset from Kitchen Product 01 multi-views (different viewBoxes). Knob/spout closeups currently on KIT-001 may belong here — remap only after visual confirm.",
      variant: "none",
      color: "",
      manual: true,
      notes: "Name already Electric Hot Pot. Do not auto-merge KIT-001.",
    },
    "TOY-015": {
      decision: "KEEP",
      confidence: "HIGH",
      evidence:
        "Robot/car mode views + batteries/remote/propellers/accessories share transformer naming. Treated as one product with multi-view + accessory media.",
      variant: "none",
      color: "",
      manual: false,
      notes: "Name Transforming Robot Car retained.",
    },
  };

  for (let i = 16; i <= 30; i++) {
    const sku = `TOY-${String(i).padStart(3, "0")}`;
    GROUPING[sku] = {
      decision: "KEEP",
      confidence: "HIGH",
      evidence:
        "Each toys/images*.svg has unique content hash; no filename identity. Kept as separate products pending commercial naming.",
      variant: "none",
      color: "",
      manual: true,
      notes: "Name remains Toy Image placeholder — visual ID required.",
    };
  }

  const groupingRows = [];
  for (const p of products) {
    const variant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    const sku = variant?.sku || "";
    const cat = p.categories.find((c) => c.isPrimary)?.category ?? p.categories[0]?.category;
    const g = GROUPING[sku];
    if (!g) continue;
    const nameRow = nameDecisions.find((n) => n.sku === sku);
    groupingRows.push({
      productId: p.id,
      sku,
      category: cat?.name || "",
      currentGroup: p.name,
      decision: g.decision,
      evidence: g.evidence,
      confidence: g.confidence,
      variantDecision: g.variant,
      color: g.color,
      manualReview: g.manual,
      notes: g.notes,
      sourceFolder: (p.media[0]?.storageKey || "").split("/")[0] || "",
      sourceImages: p.media.map((m) => m.storageKey || m.url).join("; "),
      oldName: nameRow?.oldName || p.name,
      finalName: nameRow?.finalName || p.name,
    });
  }

  // Also add non-flagged products that still need name review into CSV
  const csvRows = products.map((p) => {
    const variant = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    const sku = variant?.sku || "";
    const cat = p.categories.find((c) => c.isPrimary)?.category ?? p.categories[0]?.category;
    const nameRow = nameDecisions.find((n) => n.sku === sku);
    const g = GROUPING[sku] || {
      decision: "KEEP",
      confidence: "HIGH",
      evidence: "Existing import grouping retained; not in the 21-item grouping-review set.",
      variant: "none",
      color: "",
      manual: /Product\b|Toy Image/i.test(p.name),
      notes: "",
    };
    return {
      product_id: p.id,
      sku,
      category: cat?.name || "",
      source_folder: (p.media[0]?.storageKey || "").split("/")[0] || "",
      source_images: p.media.map((m) => m.storageKey || m.url).join("; "),
      old_name: nameRow?.oldName || p.name,
      final_name: nameRow?.finalName || p.name,
      grouping_decision: g.decision,
      variant_decision: g.variant || "none",
      color: g.color || "",
      confidence: nameRow?.confidence === "HIGH" && g.confidence === "HIGH" ? "HIGH" : nameRow?.confidence || g.confidence,
      manual_review: g.manual || nameRow?.confidence === "LOW" ? "yes" : "no",
      notes: g.notes || nameRow?.evidence || "",
    };
  });

  mkdirSync(join(ROOT, "docs"), { recursive: true });

  const csvHeader = [
    "product_id",
    "sku",
    "category",
    "source_folder",
    "source_images",
    "old_name",
    "final_name",
    "grouping_decision",
    "variant_decision",
    "color",
    "confidence",
    "manual_review",
    "notes",
  ];
  writeFileSync(
    join(ROOT, "docs/product-name-grouping-review.csv"),
    [
      csvHeader.join(","),
      ...csvRows.map((r) => csvHeader.map((h) => csvEscape(r[h])).join(",")),
    ].join("\n") + "\n",
  );

  const namesFinalized = nameDecisions.filter(
    (n) =>
      n.confidence === "HIGH" &&
      !/^(Beauty|Fashion Wear|Toy|Kitchen) Product\b|^Toy Image\b/i.test(n.finalName),
  );
  const namesStillManual = nameDecisions.filter((n) =>
    /^(Beauty|Fashion Wear|Toy|Kitchen) Product\b|^Toy Image\b/i.test(n.finalName),
  );
  const groupingResolved = groupingRows.filter((g) => g.decision === "KEEP" && !g.manualReview);
  const groupingManual = groupingRows.filter((g) => g.decision === "MANUAL_REVIEW" || g.manualReview);

  const md = `# Product Grouping & Name Review

Generated: ${new Date().toISOString()}

Local-only. No deploy, push, Render, production DB, prices, MRP, stock, brands, or invented claims.

## Summary

| Metric | Count |
| --- | ---: |
| Total imported products reviewed | ${products.length} |
| Grouping reviewed (prior flag set) | ${groupingRows.length} |
| Grouping resolved (KEEP, no open merge/split) | ${groupingResolved.length} |
| Grouping left for manual review | ${groupingManual.length} |
| Name reviewed | ${nameDecisions.length} |
| Names finalized (HIGH confidence commercial-safe) | ${namesFinalized.length} |
| Names still requiring manual review | ${namesStillManual.length} |
| Products merged | 0 |
| Products split | 0 |
| Variants created/updated | 0 |
| Images remapped | 0 |
| Duplicate products found | 0 |
| Duplicate SKUs found | 0 |
| HIGH-confidence DB name updates this run | ${applied.length} |

### Name updates applied this run

${
  applied.length
    ? applied.map((a) => `- **${a.sku}**: \`${a.from}\` → \`${a.to}\``).join("\n")
    : "- None (already applied / idempotent)."
}

## Grouping Decisions

| Product ID | SKU | Category | Current Group | Decision | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
${groupingRows
  .map(
    (g) =>
      `| ${g.productId} | ${g.sku} | ${g.category} | ${g.currentGroup.replace(/\|/g, "/")} | ${g.decision} | ${g.evidence.replace(/\|/g, "/")} | ${g.confidence} |`,
  )
  .join("\n")}

Decision values used: **KEEP**, **MANUAL_REVIEW** (no MERGE / SPLIT / VARIANT applied — insufficient HIGH confidence).

## Name Decisions

HIGH-confidence finalized names (including pre-existing filename-derived names):

| Product ID | SKU | Category | Old Name | Final Name | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
${nameDecisions
  .filter((n) => n.confidence === "HIGH")
  .map(
    (n) =>
      `| ${n.productId} | ${n.sku} | ${n.category} | ${n.oldName.replace(/\|/g, "/")} | ${n.finalName.replace(/\|/g, "/")} | ${n.evidence.replace(/\|/g, "/")} | ${n.confidence} |`,
  )
  .join("\n")}

Placeholder names retained (LOW — not finalized):

| Product ID | SKU | Category | Old Name | Final Name | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
${namesStillManual
  .map(
    (n) =>
      `| ${n.productId} | ${n.sku} | ${n.category} | ${n.oldName.replace(/\|/g, "/")} | ${n.finalName.replace(/\|/g, "/")} | ${n.evidence.replace(/\|/g, "/")} | ${n.confidence} |`,
  )
  .join("\n")}

## Manual Review

### Grouping — open questions

1. **KIT-008 Kitchen Components vs KIT-009 Electric Hot Pot** — Confirm whether \`12_all_components_hd.svg\` is hot-pot accessories (possible media attach / bundle) or a separate kit. Missing: product merchandising intent.
2. **KIT-009 vs KIT-001 (Kitchen Product 01)** — KIT-001 holds unnumbered multi-views plus \`09_knob_closeup\` / \`10_spout_closeup\`. Those closeups may belong on the hot pot. Missing: visual confirmation before remapping media.
3. **Handbag series color variants** — Series pairs (e.g. \`02_Black\` + \`02_Cream\`, \`04_Beige\` + \`04_Black\`) *might* be color variants of one style. Missing: confirmed identical silhouette before collapsing into \`ProductVariant\` color attributes. Left as separate products.
4. **TOY-016…TOY-030 (\`toys/images*.svg\`)** — Unique images, no product identity in filenames or SVG titles. Missing: human visual naming / whether any belong to the transforming robot car.

### Names — open questions

All **Beauty Product \***, **Fashion Wear Product \***, **Kitchen Product \***, **Toy Product \***, and **Toy Image \*** rows lack commercial name tokens in source. Do not invent names.

## Evidence notes (source inspection)

- Exact duplicate SVG content groups across \`organized_products/\`: **0**
- Two black handbags differ in content and viewBox — not duplicates
- Copy-index grouping for beauty/fashion/kitchen multi-views remains the best deterministic rule (Windows \`(n)\` copies share a product set)
- No prices, MRP, stock, brands, or materials were written

## Files

- \`docs/product-grouping-name-review.md\` (this file)
- \`docs/product-name-grouping-review.csv\`
- \`packages/database/scripts/finalize-grouping-names.mjs\`
- \`packages/database/scripts/import-products.mjs\` (naming refinements for re-runs)

## Safety

- No product deletions
- No merges/splits applied to DB
- No variant attribute invention
- No commercial data invented
`;

  writeFileSync(join(ROOT, "docs/product-grouping-name-review.md"), md);
  writeFileSync(
    join(ROOT, "docs/product-grouping-name-review.json"),
    JSON.stringify({ applied, groupingRows, nameDecisions, generatedAt: new Date().toISOString() }, null, 2),
  );

  console.log(
    JSON.stringify(
      {
        imported: products.length,
        applied,
        namesFinalized: namesFinalized.length,
        namesManual: namesStillManual.length,
        groupingReviewed: groupingRows.length,
        groupingResolved: groupingResolved.length,
        groupingManual: groupingManual.length,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
