/**
 * Presentation destinations for the storefront.
 * Aligns with ISO 3166-1 alpha-2 so shipping/locale config can replace this later.
 * No delivery times, costs, customs, or warehouse claims.
 */
export type DestinationItem = {
  countryCode: string;
  name: string;
  /** Optional ISO 4217 code for later locale wiring. Not shown as a pricing claim. */
  currencyCode?: string;
  href: string;
};

export const WORLDWIDE_DESTINATIONS: DestinationItem[] = [
  { countryCode: 'IN', name: 'India', currencyCode: 'INR', href: '/shop' },
  { countryCode: 'US', name: 'United States', currencyCode: 'USD', href: '/shop' },
  { countryCode: 'GB', name: 'United Kingdom', currencyCode: 'GBP', href: '/shop' },
  { countryCode: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', href: '/shop' },
  { countryCode: 'SG', name: 'Singapore', currencyCode: 'SGD', href: '/shop' },
  { countryCode: 'AU', name: 'Australia', currencyCode: 'AUD', href: '/shop' },
];
