/**
 * API-ready purchase intents.
 * Maps to the existing cart item input (`variantId`, `quantity`)
 * when the storefront cart is connected. This page does not persist.
 */
export type AddToCartIntent = {
  productId: string;
  slug: string;
  quantity: number;
  variantId?: string;
};

export const PENDING_CART_MESSAGE = 'Cart will be available soon.';
export const LOCAL_CART_ADDED_MESSAGE =
  'Added to your local selection. It is not saved to the server yet.';
export const ADDED_TO_CART_MESSAGE = 'Added to cart';
export const LIVE_CATALOGUE_UNAVAILABLE_MESSAGE =
  'This product is not yet available in the live catalogue.';
export const PRODUCT_UNAVAILABLE_MESSAGE =
  'This piece is currently unavailable.';
export const CART_ADD_ERROR_MESSAGE =
  'This piece could not be added. Please try again.';
export const PENDING_CHECKOUT_MESSAGE = 'Checkout will be available soon.';
export const CART_MAX_QUANTITY = 999;
