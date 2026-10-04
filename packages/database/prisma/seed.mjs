import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(import.meta.dirname, "../../../.env.local"),
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

loadEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the development catalogue.");
}

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "jewellery-accessories", name: "Jewellery & Accessories", sortOrder: 10 },
  { slug: "bags-lifestyle", name: "Bags & Lifestyle", sortOrder: 20 },
  { slug: "fashion", name: "Fashion", sortOrder: 30 },
  { slug: "home-decor", name: "Home & Decor", sortOrder: 40 },
  { slug: "kitchen-essentials", name: "Kitchen Essentials", sortOrder: 50 },
  { slug: "beauty-personal-care", name: "Beauty & Personal Care", sortOrder: 60 },
  { slug: "gifts-celebrations", name: "Gifts & Celebrations", sortOrder: 70 },
  { slug: "arts-crafts-spiritual", name: "Arts, Crafts & Spiritual", sortOrder: 80 },
];

const PRODUCTS = [
  {
    slug: "cream-structured-tote",
    name: "Cream Structured Tote",
    description: "A structured everyday tote with a quiet cream finish and considered proportions.",
    categorySlug: "bags-lifestyle",
    sku: "ECK-BAG-001",
    amountMinor: 249900n,
    mediaUrl: "/products/cream-tote.svg",
    mediaAlt: "Cream structured tote bag, front view",
  },
  {
    slug: "noir-compact-bag",
    name: "Noir Compact Bag",
    description: "A compact carry piece in a deep noir tone, sized for daily essentials.",
    categorySlug: "bags-lifestyle",
    sku: "ECK-BAG-002",
    amountMinor: 199900n,
    mediaUrl: "/products/noir-bag.svg",
    mediaAlt: "Black compact handbag, front view",
  },
  {
    slug: "tan-carryall",
    name: "Tan Carryall",
    description: "An open carryall in warm tan, made for unhurried days and simple errands.",
    categorySlug: "bags-lifestyle",
    sku: "ECK-BAG-003",
    amountMinor: 299900n,
    mediaUrl: "/products/tan-carryall.svg",
    mediaAlt: "Tan carryall bag, front view",
  },
  {
    slug: "everyday-tailored-layer",
    name: "Everyday Tailored Layer",
    description: "A tailored layer with a clean line, intended for everyday wear.",
    categorySlug: "fashion",
    sku: "ECK-FSH-001",
    amountMinor: 179900n,
    mediaUrl: "/products/fashion-layer.svg",
    mediaAlt: "Tailored fashion layer on a studio figure",
  },
  {
    slug: "daily-ritual-care",
    name: "Daily Ritual Care",
    description: "A simple care ritual for the daily shelf — quiet, useful, and considered.",
    categorySlug: "beauty-personal-care",
    sku: "ECK-BTY-001",
    amountMinor: 89900n,
    mediaUrl: "/products/beauty-ritual.svg",
    mediaAlt: "Beauty care bottle, front view",
  },
  {
    slug: "porcelain-table-setting",
    name: "Porcelain Table Setting",
    description: "A porcelain table setting for a more graceful everyday table.",
    categorySlug: "kitchen-essentials",
    sku: "ECK-KIT-001",
    amountMinor: 149900n,
    mediaUrl: "/products/kitchen-vessel.svg",
    mediaAlt: "Porcelain dinnerware setting, front view",
  },
  {
    slug: "pearl-drop-earrings",
    name: "Pearl Drop Earrings",
    description: "A pair of pearl drop earrings with a restrained, everyday silhouette.",
    categorySlug: "jewellery-accessories",
    sku: "ECK-JWL-001",
    amountMinor: 129900n,
  },
  {
    slug: "minimal-pendant-necklace",
    name: "Minimal Pendant Necklace",
    description: "A minimal pendant necklace with a quiet chain and a small, balanced drop.",
    categorySlug: "jewellery-accessories",
    sku: "ECK-JWL-002",
    amountMinor: 99900n,
  },
  {
    slug: "linen-accent-cushion",
    name: "Linen Accent Cushion",
    description: "A linen accent cushion for a considered living space.",
    categorySlug: "home-decor",
    sku: "ECK-HOM-001",
    amountMinor: 119900n,
  },
  {
    slug: "botanical-gift-box",
    name: "Botanical Gift Box",
    description: "A botanical gift box assembled for a quiet celebration.",
    categorySlug: "gifts-celebrations",
    sku: "ECK-GFT-001",
    amountMinor: 159900n,
  },
  {
    slug: "artisan-decorative-tray",
    name: "Artisan Decorative Tray",
    description: "A decorative tray with a handmade character for mindful spaces.",
    categorySlug: "arts-crafts-spiritual",
    sku: "ECK-ART-001",
    amountMinor: 189900n,
  },
];

async function main() {
  await prisma.currency.upsert({
    where: { code: "INR" },
    create: {
      code: "INR",
      name: "Indian Rupee",
      symbol: "₹",
      minorUnits: 2,
      isActive: true,
    },
    update: {
      name: "Indian Rupee",
      symbol: "₹",
      minorUnits: 2,
      isActive: true,
    },
  });

  await prisma.country.upsert({
    where: { iso2: "IN" },
    create: {
      iso2: "IN",
      iso3: "IND",
      name: "India",
      defaultCurrencyCode: "INR",
      phoneCode: "+91",
      isActive: true,
    },
    update: {
      iso3: "IND",
      name: "India",
      defaultCurrencyCode: "INR",
      isActive: true,
    },
  });

  const india = await prisma.country.findUniqueOrThrow({ where: { iso2: "IN" } });
  let shippingZone = await prisma.shippingZone.findFirst({
    where: {
      name: "India domestic",
      zoneCountries: { some: { countryId: india.id } },
    },
    include: { methods: { include: { rates: true } } },
  });
  if (!shippingZone) {
    shippingZone = await prisma.shippingZone.create({
      data: {
        name: "India domestic",
        isActive: true,
        zoneCountries: { create: { countryId: india.id } },
        methods: {
          create: {
            code: "standard",
            name: "Standard delivery",
            estimatedDaysMin: 3,
            estimatedDaysMax: 7,
            isActive: true,
            rates: {
              create: {
                currencyCode: "INR",
                amountMinor: 0n,
                isActive: true,
              },
            },
          },
        },
      },
      include: { methods: { include: { rates: true } } },
    });
  }

  const location = await prisma.inventoryLocation.upsert({
    where: { code: "DEFAULT" },
    create: {
      code: "DEFAULT",
      name: "Default Warehouse",
      isActive: true,
    },
    update: {
      name: "Default Warehouse",
      isActive: true,
    },
  });

  const categoryBySlug = new Map();
  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        path: `/${category.slug}`,
        sortOrder: category.sortOrder,
        isActive: true,
        deletedAt: null,
      },
      update: {
        name: category.name,
        path: `/${category.slug}`,
        sortOrder: category.sortOrder,
        isActive: true,
        deletedAt: null,
      },
    });
    categoryBySlug.set(category.slug, row);
  }

  for (const product of PRODUCTS) {
    const category = categoryBySlug.get(product.categorySlug);
    if (!category) {
      throw new Error(`Missing category ${product.categorySlug}`);
    }

    const publishedAt = new Date();
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        status: "ACTIVE",
        publishedAt,
        deletedAt: null,
      },
      update: {
        name: product.name,
        description: product.description,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (!row.publishedAt) {
      await prisma.product.update({
        where: { id: row.id },
        data: { publishedAt },
      });
    }

    await prisma.productCategory.upsert({
      where: {
        productId_categoryId: {
          productId: row.id,
          categoryId: category.id,
        },
      },
      create: {
        productId: row.id,
        categoryId: category.id,
        isPrimary: true,
      },
      update: {
        isPrimary: true,
      },
    });

    const variant = await prisma.productVariant.upsert({
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

    const existingPrice = await prisma.price.findFirst({
      where: {
        variantId: variant.id,
        currencyCode: "INR",
        countryId: null,
        isActive: true,
      },
    });

    if (existingPrice) {
      await prisma.price.update({
        where: { id: existingPrice.id },
        data: {
          amountMinor: product.amountMinor,
          isActive: true,
        },
      });
    } else {
      await prisma.price.create({
        data: {
          variantId: variant.id,
          currencyCode: "INR",
          countryId: null,
          amountMinor: product.amountMinor,
          isActive: true,
        },
      });
    }

    await prisma.inventoryItem.upsert({
      where: {
        variantId_locationId: {
          variantId: variant.id,
          locationId: location.id,
        },
      },
      create: {
        variantId: variant.id,
        locationId: location.id,
        onHand: 24,
        reserved: 0,
      },
      update: {
        onHand: 24,
        reserved: 0,
      },
    });

    if (product.mediaUrl) {
      const existingMedia = await prisma.productMedia.findFirst({
        where: {
          productId: row.id,
          url: product.mediaUrl,
          variantId: null,
        },
      });

      if (!existingMedia) {
        await prisma.productMedia.create({
          data: {
            productId: row.id,
            kind: "IMAGE",
            url: product.mediaUrl,
            altText: product.mediaAlt,
            mimeType: "image/svg+xml",
            sortOrder: 0,
            isPrimary: true,
          },
        });
      } else {
        await prisma.productMedia.update({
          where: { id: existingMedia.id },
          data: {
            kind: "IMAGE",
            altText: product.mediaAlt,
            isPrimary: true,
          },
        });
      }
    }
  }

  console.log(`Development catalogue seed complete (${PRODUCTS.length} products).`);
}

main()
  .catch((error) => {
    console.error("Development catalogue seed failed.");
    console.error(error instanceof Error ? error.message : "Unknown seed error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
