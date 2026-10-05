# Product readiness report

Generated: 2026-10-05T09:22:40.642Z

Local preparation only. No deploy, no GitHub push, no Render changes, no production database writes.

## Summary

| Metric | Count |
| --- | ---: |
| Total active products (local catalogue) | 97 |
| Imported products inspected | 86 |
| Imported images (SVG) | 305 |
| Products ready for commercial data entry (confident name; grouping OK; price/stock still blank) | 17 |
| Products requiring manual commercial data (price and/or stock and/or name) | 86 |
| Products requiring name review | 64 |
| Products with price missing | 86 |
| Products with inventory missing | 86 |
| Products with multiple commercial fields missing | 64 |
| Products requiring grouping review | 21 |
| Products fully commercial-ready (name + price + stock, no grouping flags) | 0 |

Of the original **71** import-time “manual commercial data” rows, most still need names. **15 handbags + several named kitchen/toy items** now have usable names and are ready for price/stock entry only. The CSV includes **all 86** imported SKUs with blank Price / MRP / Stock so pricing can be filled without inventing values.

## Category totals (imported)

| Category | Products |
| --- | ---: |
| Beauty | 12 |
| Fashion Wear | 15 |
| Handbags | 15 |
| Kitchen | 14 |
| Toys | 30 |

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

- **KIT-009**: `Electric Hot Pot Front Top Bottom 3d Hd (2)` → `Electric Hot Pot` (filename electric_hot_pot_*; stripped view/quality/copy tokens)

No brands, materials, specifications, prices, or inventory quantities were invented.

## Grouping review notes

- **Handbags**: Colorways grouped by source prefix (front/three-quarter/side/back/bottom). Kept as separate SKUs per colorway. Two black handbags (`HAN-003` / `HAN-008`) remain separate (distinct source prefixes `02_Black` vs `04_Black`). `HAN-001` Ivory has only a bottom view in source — flagged for grouping/media completeness review. Dual-tone `*_White` colorways kept as named colorways, not merged into solid colors.
- **Beauty / Fashion Wear**: Grouped by Windows copy-index clusters; commercial names still placeholders.
- **Kitchen**: Named utensils kept as individual products. `KIT-008` All Components and `KIT-009` Electric Hot Pot flagged for possible set relationship review — not merged (would invent a commercial bundle).
- **Toys**: `TOY-015` Transforming Robot Car is a multi-view cluster; remaining `Toy Image *` / `Toy Product *` rows need manual identity and possible regrouping. No duplicate products created.

## Full product table (86 imported)

| Product ID | Category | Current name | Slug | SKU | Images | Color | Type | Price | Inventory | Data status | Bucket |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| cmuv10h6l0005utmcsh4h7i9w | Beauty | Beauty Product 01 | beauty-product-01 | BEA-001 | 5 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hah000iutmcfdmvi94j | Beauty | Beauty Product 10 | beauty-product-10 | BEA-002 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hbt000rutmcr2ewg93q | Beauty | Beauty Product 11 | beauty-product-11 | BEA-003 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hd90010utmcprbgu1ok | Beauty | Beauty Product 12 | beauty-product-12 | BEA-004 | 1 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10he00015utmcj5828yg2 | Beauty | Beauty Product 02 | beauty-product-02 | BEA-005 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hf7001eutmc1r0119c0 | Beauty | Beauty Product 03 | beauty-product-03 | BEA-006 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hgx001nutmc5h86miix | Beauty | Beauty Product 04 | beauty-product-04 | BEA-007 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hib001wutmcg2cn3wix | Beauty | Beauty Product 05 | beauty-product-05 | BEA-008 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hjl0025utmc6y6qudp9 | Beauty | Beauty Product 06 | beauty-product-06 | BEA-009 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hl7002eutmchkq3q3e2 | Beauty | Beauty Product 07 | beauty-product-07 | BEA-010 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hme002nutmc0cg0chc3 | Beauty | Beauty Product 08 | beauty-product-08 | BEA-011 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hnj002wutmckpes036h | Beauty | Beauty Product 09 | beauty-product-09 | BEA-012 | 3 | — | beauty product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hov0035utmc0xzvi0pk | Fashion Wear | Fashion Wear Product 01 | fashion-wear-product-01 | FAS-001 | 6 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hqz003kutmce538f1qr | Fashion Wear | Fashion Wear Product 02 | fashion-wear-product-02 | FAS-002 | 3 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hs5003tutmc2lio836a | Fashion Wear | Fashion Wear Product 11 | fashion-wear-product-11 | FAS-003 | 3 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hud0042utmcfp4ocyso | Fashion Wear | Fashion Wear Product 12 | fashion-wear-product-12 | FAS-004 | 2 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hvj0049utmc0y0prz7n | Fashion Wear | Fashion Wear Product 13 | fashion-wear-product-13 | FAS-005 | 1 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hwk004eutmcsk19yvmo | Fashion Wear | Fashion Wear Product 03 | fashion-wear-product-03 | FAS-006 | 6 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10hz0004tutmcxg021cs2 | Fashion Wear | Fashion Wear Product 04 | fashion-wear-product-04 | FAS-007 | 4 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10i190054utmchtxyx1ad | Fashion Wear | Fashion Wear Product 05 | fashion-wear-product-05 | FAS-008 | 4 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10i2y005futmc1kr3e722 | Fashion Wear | Fashion Wear Product 06 | fashion-wear-product-06 | FAS-009 | 4 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10i4f005qutmcjwu3fvz3 | Fashion Wear | Fashion Wear Product 07 | fashion-wear-product-07 | FAS-010 | 4 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10i8u0061utmchmrtyyvu | Fashion Wear | Fashion Wear Product 08 | fashion-wear-product-08 | FAS-011 | 4 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10ihb006cutmclyx09ey7 | Fashion Wear | Fashion Wear Product 09 | fashion-wear-product-09 | FAS-012 | 3 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10iiu006lutmciy0tw4tw | Fashion Wear | Fashion Wear Product 10 | fashion-wear-product-10 | FAS-013 | 3 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10il9006uutmc5la5kw83 | Fashion Wear | Fashion Wear Product 14 | fashion-wear-product-14 | FAS-014 | 1 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10im5006zutmcnh13rhxo | Fashion Wear | Fashion Wear Product 15 | fashion-wear-product-15 | FAS-015 | 1 | — | fashion wear | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10inf0074utmcqumdx699 | Handbags | Ivory Handbag | ivory-handbag | HAN-001 | 1 | ivory | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | F |
| cmuv10ioc0079utmc0vxxfmy3 | Handbags | Mint Green Handbag | mint-green-handbag | HAN-002 | 5 | mint green | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10ir4007mutmcpwj7x83j | Handbags | Black Handbag | black-handbag | HAN-003 | 5 | black | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | F |
| cmuv10itf007zutmcqej2twbv | Handbags | Cream Handbag | cream-handbag | HAN-004 | 5 | cream | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10ivv008cutmct3108q7k | Handbags | Blush Pink Handbag | blush-pink-handbag | HAN-005 | 5 | blush pink | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10izc008putmcymazmu9z | Handbags | Pink Handbag | pink-handbag | HAN-006 | 5 | pink | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10j0z0092utmc7frmnkud | Handbags | Beige Handbag | beige-handbag | HAN-007 | 5 | beige | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10j3k009futmcry6ciwyx | Handbags | Black Handbag | black-handbag-2 | HAN-008 | 5 | black | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | F |
| cmuv10j5j009sutmc9w0u5lsy | Handbags | Light Blue Handbag | light-blue-handbag | HAN-009 | 5 | light blue | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10j7h00a5utmcpbg5i5r0 | Handbags | Tan Handbag | tan-handbag | HAN-010 | 5 | tan | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10ja100aiutmc5cmxuaiy | Handbags | Beige White Handbag | beige-white-handbag | HAN-011 | 5 | beige white | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10jc900avutmcwk9fz8nw | Handbags | Black White Handbag | black-white-handbag | HAN-012 | 5 | black white | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10jee00b8utmcwwqnfubs | Handbags | Blush Pink White Handbag | blush-pink-white-handbag | HAN-013 | 5 | blush pink white | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10jgb00blutmcbynkbmze | Handbags | Mauve White Handbag | mauve-white-handbag | HAN-014 | 5 | mauve white | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10jif00byutmcemrfl1qy | Handbags | Sky Blue White Handbag | sky-blue-white-handbag | HAN-015 | 5 | sky blue white | handbag | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10jkg00cbutmcnv5j5z3l | Kitchen | Kitchen Product 01 | kitchen-product-01 | KIT-001 | 9 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10jnw00cwutmcrqa9z6te | Kitchen | Kitchen Product 02 | kitchen-product-02 | KIT-002 | 6 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10jro00dbutmcmpatp7by | Kitchen | Kitchen Product 03 | kitchen-product-03 | KIT-003 | 5 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10juh00doutmcokw7ct27 | Kitchen | Kitchen Product 04 | kitchen-product-04 | KIT-004 | 3 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10k3t00dxutmcr66jslm3 | Kitchen | Kitchen Product 05 | kitchen-product-05 | KIT-005 | 3 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10k5r00e6utmclkzbknzk | Kitchen | Kitchen Product 06 | kitchen-product-06 | KIT-006 | 2 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10k6z00edutmcqisgpgwd | Kitchen | Kitchen Product 07 | kitchen-product-07 | KIT-007 | 3 | — | kitchen product | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10k8k00emutmc640cu361 | Kitchen | All Components | all-components | KIT-008 | 1 | — | kitchen set / components | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10ka300erutmcz4r3h4xb | Kitchen | Electric Hot Pot | electric-hot-pot-front-top-bottom-3d-hd-2 | KIT-009 | 1 | — | electric hot pot | — | — | PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | F |
| cmuv10kaw00ewutmcz815iz1g | Kitchen | Slotted Spatula | slotted-spatula | KIT-010 | 1 | — | kitchen utensil | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10kbo00f1utmche9ghus4 | Kitchen | Slotted Spoon | slotted-spoon | KIT-011 | 1 | — | kitchen utensil | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10kcg00f6utmcqyh7zjkt | Kitchen | Spiral Whisk | spiral-whisk | KIT-012 | 1 | — | kitchen utensil | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10ke800fbutmcw0nc6s9x | Kitchen | Whisk | whisk | KIT-013 | 1 | — | kitchen utensil | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10kez00fgutmct3e5jktz | Kitchen | Wooden Spatula | wooden-spatula | KIT-014 | 1 | — | kitchen utensil | — | — | PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | A |
| cmuv10kfw00flutmc83e5ycp4 | Toys | Toy Product 01 | toy-product-01 | TOY-001 | 20 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kmo00gsutmcw9by93de | Toys | Toy Product 10 | toy-product-10 | TOY-002 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kn900gxutmc0nvhfvcd | Toys | Toy Product 11 | toy-product-11 | TOY-003 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10knz00h2utmcgclc00q4 | Toys | Toy Product 12 | toy-product-12 | TOY-004 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kor00h7utmcsv826nqe | Toys | Toy Product 13 | toy-product-13 | TOY-005 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kpl00hcutmcabsjrp6n | Toys | Toy Product 14 | toy-product-14 | TOY-006 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kqd00hhutmcy6ndnqc5 | Toys | Toy Product 02 | toy-product-02 | TOY-007 | 12 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kvh00i8utmcwk9twtyh | Toys | Toy Product 03 | toy-product-03 | TOY-008 | 8 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10kze00irutmc9omozwlu | Toys | Toy Product 04 | toy-product-04 | TOY-009 | 10 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10l3b00jeutmcs0oxx4h0 | Toys | Toy Product 05 | toy-product-05 | TOY-010 | 8 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10l8400jxutmc6btkx5af | Toys | Toy Product 06 | toy-product-06 | TOY-011 | 4 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10lc500k8utmct4cq4pi1 | Toys | Toy Product 07 | toy-product-07 | TOY-012 | 4 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10lpb00kjutmcgj0dimi4 | Toys | Toy Product 08 | toy-product-08 | TOY-013 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10lq800koutmcw15uycxq | Toys | Toy Product 09 | toy-product-09 | TOY-014 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|MULTIPLE_MISSING | E |
| cmuv10lrs00ktutmcouj6zg91 | Toys | Transforming Robot Car | transforming-robot-car | TOY-015 | 23 | — | transforming toy | — | — | PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | F |
| cmuv10m2500m6utmcxporv4z7 | Toys | Toy Image 01 | toy-image-01-b957b0 | TOY-016 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10m2w00mbutmcvaeydfqg | Toys | Toy Image 01 | toy-image-01-558a80 | TOY-017 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10m3j00mgutmcol15i5jp | Toys | Toy Image 10 | toy-image-10-04ddc1 | TOY-018 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10m6800mlutmc7geh7iu8 | Toys | Toy Image 11 | toy-image-11-d2289e | TOY-019 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mb200mqutmcj1vswgsn | Toys | Toy Image 12 | toy-image-12-34da07 | TOY-020 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mec00mvutmcve1i3jjx | Toys | Toy Image 13 | toy-image-13-371774 | TOY-021 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mff00n0utmc8xe9rskr | Toys | Toy Image 14 | toy-image-14-a88e98 | TOY-022 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mgd00n5utmcdyimgjqq | Toys | Toy Image 15 | toy-image-15-dbd28e | TOY-023 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mhc00nautmcdwuefhe7 | Toys | Toy Image 16 | toy-image-16-0c24e5 | TOY-024 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mis00nfutmc25ls8ugh | Toys | Toy Image 17 | toy-image-17-ed46c3 | TOY-025 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mju00nkutmcsv9rwhnc | Toys | Toy Image 02 | toy-image-02-791fe6 | TOY-026 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mlb00nputmckjxgrl3b | Toys | Toy Image 06 | toy-image-06-a981d5 | TOY-027 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mmi00nuutmc5n571pb2 | Toys | Toy Image 07 | toy-image-07-e76405 | TOY-028 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mod00nzutmcsgyli5kr | Toys | Toy Image 08 | toy-image-08-d53700 | TOY-029 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |
| cmuv10mpa00o4utmcnfndynh0 | Toys | Toy Image 09 | toy-image-09-7fce09 | TOY-030 | 1 | — | toy | — | — | NAME_REVIEW|PRICE_MISSING|INVENTORY_MISSING|GROUPING_REVIEW|MULTIPLE_MISSING | E |

## Commercial data template

Blank price / MRP / stock for manual entry:

- `docs/product-commercial-data-template.csv` (86 rows)

## Test status

| Gate | Result |
| --- | --- |
| `pnpm test` (via `node --env-file=.env.local vitest run`) | **PASS** — 208 passed / 0 failed |
| `pnpm typecheck` | **PASS** |
| `pnpm lint` | **PASS** (0 errors; 1 pre-existing admin font warning) |
| `pnpm --filter @eckamcreation/database exec prisma validate` | **PASS** |

### Test fixes applied

1. **ai-catalogue-tools.test.ts / catalogue search** — Application search now relevance-ranks text queries (whole-word / prefix before substring) so `bag` is not flooded by newer `*Handbag` imports. Behavior corrected in `product-service.ts` + `helpers.ts`; test expectation retained.
2. **payments.test.ts** — Intent amount correctly equals checkout `totalMinor` (subtotal − discount + tax + shipping). Hard-coded `13000` failed when shared local DB had India GST 18% from `checkout.test.ts` (`10000 + 1800 + 3000 = 14800`). Test now asserts against the session total and verifies subtotal/shipping components. Also imports `preload-env` first so `DATABASE_URL` is available.

## Files changed

- `apps/api/src/lib/catalogue/helpers.ts` — search relevance scoring
- `apps/api/src/lib/catalogue/product-service.ts` — apply relevance ranking for `q` searches
- `apps/api/src/payments.test.ts` — assert payment intent against checkout total
- `packages/database/scripts/inspect-imported-products.mjs` — inspection helper
- `packages/database/scripts/prepare-product-readiness.mjs` — name cleanup + report/CSV generation
- `docs/product-commercial-data-template.csv` — pricing/stock template (blanks)
- `docs/product-readiness-report.md` — this report
- `docs/product-import-inspect.json` — machine-readable inspection dump
- Local DB product name update: `electric-hot-pot-front-top-bottom-3d-hd-2` → **Electric Hot Pot**

## Commands executed

```
node packages/database/scripts/prepare-product-readiness.mjs
node --env-file=.env.local ./node_modules/vitest/vitest.mjs run
pnpm typecheck
pnpm lint
pnpm --filter @eckamcreation/database exec prisma validate
```

## Stop conditions honored

- No deploy
- No GitHub push
- No Render changes
- No production database modifications
- No invented prices or inventory
