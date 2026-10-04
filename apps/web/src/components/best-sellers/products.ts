import type { ProductCardData } from '@/lib/catalogue/product';

/**
 * Temporary visual placeholders from `apps/web/public/products`.
 * No prices, stock, ratings, or sales claims.
 * Links go to /shop until a live catalogue card is supplied.
 */
export const BEST_SELLER_PRODUCTS: ProductCardData[] = [
  {
    id: 'bestseller-noir-bag',
    slug: 'noir-compact-bag',
    name: 'Noir Compact Bag',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/noir-bag.svg',
    imageAlt: 'Black compact handbag, front view',
  },
  {
    id: 'bestseller-fashion-layer',
    slug: 'everyday-tailored-layer',
    name: 'Everyday Tailored Layer',
    category: 'Fashion',
    href: '/shop',
    imageSrc: '/products/fashion-layer.svg',
    imageAlt: 'Tailored fashion layer on a studio figure',
  },
  {
    id: 'bestseller-cream-tote',
    slug: 'cream-structured-tote',
    name: 'Cream Structured Tote',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/cream-tote.svg',
    imageAlt: 'Cream structured tote bag, front view',
  },
  {
    id: 'bestseller-kitchen-vessel',
    slug: 'porcelain-table-setting',
    name: 'Porcelain Table Setting',
    category: 'Kitchen Essentials',
    href: '/shop',
    imageSrc: '/products/kitchen-vessel.svg',
    imageAlt: 'Porcelain dinnerware setting, front view',
  },
  {
    id: 'bestseller-tan-carryall',
    slug: 'tan-carryall',
    name: 'Tan Carryall',
    category: 'Bags & Lifestyle',
    href: '/shop',
    imageSrc: '/products/tan-carryall.svg',
    imageAlt: 'Tan carryall bag, front view',
  },
  {
    id: 'bestseller-beauty-ritual',
    slug: 'daily-ritual-care',
    name: 'Daily Ritual Care',
    category: 'Beauty & Personal Care',
    href: '/shop',
    imageSrc: '/products/beauty-ritual.svg',
    imageAlt: 'Beauty care bottle, front view',
  },
];
