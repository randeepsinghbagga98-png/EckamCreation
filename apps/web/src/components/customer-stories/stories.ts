import type { CustomerStory } from '@/lib/catalogue/story';

/**
 * Editorial slots for verified customer stories.
 * Status is forthcoming until CMS / review API content is available.
 * Do not invent names, quotes, ratings, or purchase claims here.
 */
export const CUSTOMER_STORIES: CustomerStory[] = [
  {
    id: 'story-lifestyle',
    slug: 'lifestyle',
    category: 'Lifestyle',
    title: 'A story from the edit',
    excerpt: 'Customer story coming soon.',
    href: '/stories/lifestyle',
    imageSrc:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Editorial fashion garments hanging in a refined studio',
    status: 'forthcoming',
    size: 'featured',
  },
  {
    id: 'story-home',
    slug: 'home',
    category: 'At home',
    title: 'A story of considered living',
    excerpt: 'Customer story coming soon.',
    href: '/stories/home',
    imageSrc:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Warm living room with sculptural furniture and soft textiles',
    status: 'forthcoming',
    size: 'standard',
  },
  {
    id: 'story-ritual',
    slug: 'ritual',
    category: 'Ritual',
    title: 'A story of daily care',
    excerpt: 'Customer story coming soon.',
    href: '/stories/ritual',
    imageSrc:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Soft-focus beauty still life with brushes and muted cosmetics',
    status: 'forthcoming',
    size: 'standard',
  },
];
