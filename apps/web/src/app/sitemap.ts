import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

const INDEXABLE = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/shop',
  '/search',
  '/collections',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) {
    return [];
  }

  return INDEXABLE.map((path) => ({
    url: path === '/' ? base : `${base}${path}`,
  }));
}
