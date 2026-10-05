/**
 * Canonical public origin. NEXT_PUBLIC_APP_URL is inlined at build time.
 * Development may fall back to localhost. Production never emits localhost.
 */
export function siteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'NEXT_PUBLIC_APP_URL is unset. Absolute sitemap/canonical/Open Graph URLs are omitted in production.',
    );
    return null;
  }

  return 'http://localhost:3000';
}
