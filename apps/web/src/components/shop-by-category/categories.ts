export type CategoryCardSize = 'featured' | 'companion' | 'standard' | 'wide';

export type CategoryItem = {
  slug: string;
  name: string;
  descriptor: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  size: CategoryCardSize;
};

export const CATEGORIES: CategoryItem[] = [
  {
    slug: 'jewellery-accessories',
    name: 'Jewellery & Accessories',
    descriptor: 'Fine pieces composed for daily ritual.',
    href: '/shop?category=jewellery-accessories',
    imageSrc:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1800&q=80',
    imageAlt: 'Gold jewellery arranged on a dark surface — rings, necklace and bracelet',
    size: 'featured',
  },
  {
    slug: 'bags-lifestyle',
    name: 'Bags & Lifestyle',
    descriptor: 'Carried forms, considered details.',
    href: '/shop?category=bags-lifestyle',
    imageSrc:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Structured leather handbag in warm light',
    size: 'companion',
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    descriptor: 'Silhouettes with quiet presence.',
    href: '/shop?category=fashion',
    imageSrc:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Editorial fashion garments hanging in a refined studio',
    size: 'companion',
  },
  {
    slug: 'home-decor',
    name: 'Home & Decor',
    descriptor: 'Rooms composed with intention.',
    href: '/shop?category=home-decor',
    imageSrc:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Warm luxury living room with sculptural furniture and soft textiles',
    size: 'standard',
  },
  {
    slug: 'kitchen-essentials',
    name: 'Kitchen Essentials',
    descriptor: 'Tools for a more graceful table.',
    href: '/shop?category=kitchen-essentials',
    imageSrc:
      'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Refined kitchen interior with warm wood, stone and considered cookware',
    size: 'standard',
  },
  {
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    descriptor: 'Rituals of care, quietly refined.',
    href: '/shop?category=beauty-personal-care',
    imageSrc:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Soft-focus beauty still life with brushes and muted cosmetics',
    size: 'standard',
  },
  {
    slug: 'gifts-celebrations',
    name: 'Gifts & Celebrations',
    descriptor: 'Objects chosen to be given.',
    href: '/shop?category=gifts-celebrations',
    imageSrc:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Wrapped gifts with champagne ribbon on a warm table',
    size: 'wide',
  },
  {
    slug: 'arts-crafts-spiritual',
    name: 'Arts, Crafts & Spiritual',
    descriptor: 'Quiet objects for mindful spaces.',
    href: '/shop?category=arts-crafts-spiritual',
    imageSrc:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Art studio still life with brushes, pigments and handmade papers',
    size: 'wide',
  },
];
