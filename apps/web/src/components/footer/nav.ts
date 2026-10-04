export type FooterNavItem = {
  label: string;
  /** In-page or real route only. Omit for forthcoming pages. */
  href?: string;
};

export type FooterNavGroup = {
  title: string;
  items: FooterNavItem[];
};

/**
 * Footer destinations.
 * `href` is set only for the homepage or existing section anchors.
 * Forthcoming pages stay unlabeled as links so they cannot 404.
 */
export const FOOTER_NAV_GROUPS: FooterNavGroup[] = [
  {
    title: 'Shop',
    items: [
      { label: 'Shop', href: '/shop' },
      { label: 'New Arrivals', href: '/#new-arrivals' },
      { label: 'Collections', href: '/collections' },
      { label: 'Best Sellers', href: '/#best-sellers' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { label: 'About', href: '/about' },
      { label: 'Why Eckam', href: '/#why-eckam' },
      { label: 'Customer Stories', href: '/#customer-stories' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Track Order' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ' },
      { label: 'Shipping & Returns' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Refund Policy', href: '/refund-policy' },
    ],
  },
];

export const FOOTER_LEGAL_BAR: FooterNavItem[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies' },
];
