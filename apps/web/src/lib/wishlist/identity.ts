/**
 * Presentation-only catalogue cards use placeholder / local ids.
 * Wishlist mutations must use live catalogue product or variant ids.
 */
export function hasLiveCatalogueIdentity(id: string | undefined): boolean {
  if (!id) {
    return false;
  }

  return !id.startsWith('placeholder-') && !id.startsWith('catalogue-');
}
