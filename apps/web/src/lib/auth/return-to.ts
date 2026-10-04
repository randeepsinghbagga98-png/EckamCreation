const ALLOWED_PREFIXES = ['/shop', '/account', '/search', '/collections', '/cart', '/checkout'];

export function safeReturnTo(value: string | string[] | null | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = raw?.trim();

  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return undefined;
  }

  const path = next.split(/[?#]/)[0] ?? next;
  if (path === '/' || ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return next;
  }

  return undefined;
}
