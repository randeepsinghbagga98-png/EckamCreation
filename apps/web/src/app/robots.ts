import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/account/', '/cart', '/checkout', '/login', '/signup'],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
