import type { WishlistItemDto } from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';

export type WishlistDto = {
  id: string;
  name: string;
  items: WishlistItemDto[];
};

export type WishlistItemInput = {
  variantId?: string;
  productId?: string;
};

export function getCustomerWishlist() {
  return apiRequest<WishlistDto>(paths.me.wishlist);
}

export function addWishlistItem(input: WishlistItemInput) {
  return apiRequest<WishlistItemDto>(paths.me.wishlistItems, {
    method: 'POST',
    body: input,
  });
}

export function removeWishlistItem(variantOrProductId: string) {
  return apiRequest<{ deleted: true }>(paths.me.wishlistItem(variantOrProductId), {
    method: 'DELETE',
  });
}
