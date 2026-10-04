export type EditorialCollection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  categorySlugs: string[];
  source: 'categories' | 'newest';
};

export const EDITORIAL_COLLECTIONS: EditorialCollection[] = [
  {
    slug: 'everyday-edit',
    title: 'The Everyday Edit',
    eyebrow: 'The Eckam Edit',
    description: 'Considered pieces for daily carry and quiet dressing.',
    categorySlugs: ['fashion', 'bags-lifestyle'],
    source: 'categories',
  },
  {
    slug: 'signature-accessories',
    title: 'Signature Accessories',
    eyebrow: 'The Eckam Edit',
    description: 'Jewellery and accessories composed for everyday ritual.',
    categorySlugs: ['jewellery-accessories'],
    source: 'categories',
  },
  {
    slug: 'home-objects',
    title: 'Home & Objects',
    eyebrow: 'The Eckam Edit',
    description: 'Objects chosen to settle a room with intention.',
    categorySlugs: ['home-decor'],
    source: 'categories',
  },
  {
    slug: 'kitchen-essentials',
    title: 'Kitchen Essentials',
    eyebrow: 'The Eckam Edit',
    description: 'Forms for a more graceful table.',
    categorySlugs: ['kitchen-essentials'],
    source: 'categories',
  },
  {
    slug: 'gifting-edit',
    title: 'Gifting Edit',
    eyebrow: 'The Eckam Edit',
    description: 'Pieces selected to be given.',
    categorySlugs: ['gifts-celebrations'],
    source: 'categories',
  },
  {
    slug: 'craft-soul',
    title: 'Craft & Soul',
    eyebrow: 'The Eckam Edit',
    description: 'Quiet objects for mindful spaces.',
    categorySlugs: ['arts-crafts-spiritual'],
    source: 'categories',
  },
  {
    slug: 'style-edit',
    title: 'Style Edit',
    eyebrow: 'The Eckam Edit',
    description: 'Fashion and care, gathered as one dressing ritual.',
    categorySlugs: ['fashion', 'beauty-personal-care'],
    source: 'categories',
  },
  {
    slug: 'the-new-edit',
    title: 'The New Edit',
    eyebrow: 'The Eckam Edit',
    description: 'The latest published pieces from the Eckam catalogue.',
    categorySlugs: [],
    source: 'newest',
  },
];

export function getEditorialCollection(slug: string): EditorialCollection | undefined {
  return EDITORIAL_COLLECTIONS.find((item) => item.slug === slug);
}
