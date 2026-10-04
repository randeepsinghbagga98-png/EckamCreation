import type { ProductCardData } from './product';

/**
 * Local shop catalogue presentation list.
 * Sourced from `apps/web/public/products` — no prices, stock, ratings, or discounts.
 * Placeholder cards link to /shop, not invented product slugs.
 */
export const CATALOGUE_PRODUCTS: ProductCardData[] = [
  {
    id: 'catalogue-cream-tote',
    slug: 'cream-structured-tote',
    name: 'Cream Structured Tote',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/cream-tote.svg',
    imageAlt: 'Cream structured tote bag, front view',
  },
  {
    id: 'catalogue-noir-bag',
    slug: 'noir-compact-bag',
    name: 'Noir Compact Bag',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/noir-bag.svg',
    imageAlt: 'Black compact handbag, front view',
  },
  {
    id: 'catalogue-fashion-layer',
    slug: 'everyday-tailored-layer',
    name: 'Everyday Tailored Layer',
    category: 'Fashion',
    href: '/shop',
    imageSrc: '/products/fashion-layer.svg',
    imageAlt: 'Tailored fashion layer on a studio figure',
  },
  {
    id: 'catalogue-beauty-ritual',
    slug: 'daily-ritual-care',
    name: 'Daily Ritual Care',
    category: 'Beauty & Personal Care',
    href: '/shop',
    imageSrc: '/products/beauty-ritual.svg',
    imageAlt: 'Beauty care bottle, front view',
  },
  {
    id: 'catalogue-kitchen-vessel',
    slug: 'porcelain-table-setting',
    name: 'Porcelain Table Setting',
    category: 'Kitchen Essentials',
    href: '/shop',
    imageSrc: '/products/kitchen-vessel.svg',
    imageAlt: 'Porcelain dinnerware setting, front view',
  },
  {
    id: 'catalogue-tan-carryall',
    slug: 'tan-carryall',
    name: 'Tan Carryall',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/tan-carryall.svg',
    imageAlt: 'Tan carryall bag, front view',
  },
];
