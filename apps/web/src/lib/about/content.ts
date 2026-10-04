import { CATEGORIES } from '@/components/shop-by-category/categories';
import { WHY_ECKAM_PILLARS } from '@/components/why-eckam/pillars';
import { WORLDWIDE_DESTINATIONS } from '@/components/worldwide-shopping/destinations';

export const ABOUT_NEW_ARRIVALS_HREF = '/#new-arrivals';

export const ABOUT_CATEGORIES = CATEGORIES.map((category) => ({
  slug: category.slug,
  name: category.name,
  descriptor: category.descriptor,
  href: category.href,
  imageSrc: category.imageSrc,
  imageAlt: category.imageAlt,
}));

export const ABOUT_DESTINATIONS = WORLDWIDE_DESTINATIONS;

export const ABOUT_PILLARS = WHY_ECKAM_PILLARS.map((pillar) => {
  switch (pillar.id) {
    case 'curated-with-intent':
      return {
        ...pillar,
        title: 'Curated with intent',
        description:
          'A considered edit. Each piece is chosen because it earns its place — through form, purpose, or the moment it is meant for.',
      };
    case 'designed-for-discovery':
      return {
        ...pillar,
        title: 'Designed for discovery',
        description:
          'Shop, collections, and categories are arranged so browsing feels like finding something, not scanning a list.',
      };
    case 'india-global-reach':
      return {
        ...pillar,
        title: 'India & global reach',
        description:
          'A storefront shaped for customers shopping from India and from international markets — one experience, many starting points.',
      };
    case 'details-that-matter':
      return {
        ...pillar,
        title: 'Details that matter',
        description:
          'Presentation, typography, and the path from first glance to checkout are treated as part of the product itself.',
      };
    default:
      return pillar;
  }
});
