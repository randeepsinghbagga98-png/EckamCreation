/**
 * Presentation model for storefront customer stories.
 * Aligns with a future CMS / admin / review API payload.
 * A story is published only when verified content exists.
 */
export type CustomerStoryStatus = 'forthcoming' | 'published';

export type CustomerStorySize = 'featured' | 'standard';

export type CustomerStory = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  status: CustomerStoryStatus;
  size: CustomerStorySize;
};
