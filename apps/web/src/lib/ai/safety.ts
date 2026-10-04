const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_HREF = /^\/(?!\/)[A-Za-z0-9/_-]*(?:\?[A-Za-z0-9._=&%-]*)?(?:#[A-Za-z0-9._-]*)?$/;
const SAFE_MEDIA = /^(?:\/(?!\/)[A-Za-z0-9/_.=?-]+|https:\/\/(?:images\.unsplash\.com|res\.cloudinary\.com)\/)/i;

export function isSafeInternalHref(href: string | undefined | null): href is string {
  return Boolean(href && INTERNAL_HREF.test(href) && !href.toLowerCase().startsWith("/\\"));
}

export function safeInternalHref(href: string | undefined | null, fallback: string): string {
  if (isSafeInternalHref(href)) {
    return href;
  }
  return isSafeInternalHref(fallback) ? fallback : "/";
}

export function isSafeProductSlug(slug: string | undefined | null): slug is string {
  return Boolean(slug && slug.length <= 160 && PRODUCT_SLUG.test(slug));
}

export function productHref(slug: string): string {
  return isSafeProductSlug(slug) ? `/shop/${slug}` : "/shop";
}

export function safeMediaUrl(url: string | undefined | null): string | null {
  if (!url || url.length > 500) {
    return null;
  }
  if (/^(javascript|data|blob|vbscript):/i.test(url)) {
    return null;
  }
  return SAFE_MEDIA.test(url) ? url : null;
}

export function isUnsafeAssistantMarkup(value: string): boolean {
  return /<\s*script|javascript:|data:text\/html/i.test(value);
}
