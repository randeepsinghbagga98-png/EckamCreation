import Link from 'next/link';
import { safeInternalHref } from '@/lib/ai/safety';
import type { AiChatCommerce } from '@/lib/ai/types';

type AiCommerceResultProps = {
  commerce: AiChatCommerce;
};

export function AiCommerceResult({ commerce }: AiCommerceResultProps) {
  const success = commerce.success;
  const isWishlist = commerce.kind.startsWith('wishlist');
  const href = safeInternalHref(commerce.href, isWishlist ? '/account/wishlist' : '/cart');

  return (
    <div className="eckam-ai-commerce" role="status">
      <p>{copyFor(commerce)}</p>
      {success && commerce.product ? (
        <p className="eckam-ai-commerce-product">
          {commerce.product.name}
          {commerce.quantity ? ` · Qty ${commerce.quantity}` : ''}
        </p>
      ) : null}
      {success ? (
        <Link href={href} className="eckam-ai-commerce-cta">
          {isWishlist ? 'View Wishlist' : 'View Cart'}
        </Link>
      ) : null}
    </div>
  );
}

function copyFor(commerce: AiChatCommerce): string {
  if (commerce.success) {
    if (commerce.kind === 'wishlist_add') {
      return 'Saved to your wishlist.';
    }
    if (commerce.kind === 'wishlist_remove') {
      return 'Removed from your wishlist.';
    }
    if (commerce.kind === 'cart_remove') {
      return 'Removed from your cart.';
    }
    if (commerce.kind === 'cart_update') {
      return commerce.quantity
        ? `Quantity updated to ${commerce.quantity}.`
        : 'Cart quantity updated.';
    }
    return 'Added to your cart.';
  }

  if (commerce.message && !/prisma|stack|openai|api_key|secret/i.test(commerce.message)) {
    return commerce.message;
  }

  if (commerce.kind.startsWith('wishlist')) {
    return "I couldn't update your wishlist.";
  }
  return "I couldn't add that item to your cart.";
}
