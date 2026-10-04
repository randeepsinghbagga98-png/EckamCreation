'use client';

import { useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { HeartFilledIcon, HeartIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth/session';
import { hasLiveCatalogueIdentity } from '@/lib/wishlist/identity';
import { WISHLIST_UPDATE_ERROR_MESSAGE } from '@/lib/wishlist/messages';
import { toggleWishlistItem, useWishlist } from '@/lib/wishlist/store';
import { WishlistSignIn } from './wishlist-signin';

type WishlistButtonProps = {
  productId: string;
  productName: string;
  variantId?: string;
  appearance?: 'pdp' | 'card' | 'card-light';
};

export function WishlistButton({
  productId,
  productName,
  variantId,
  appearance = 'card',
}: WishlistButtonProps) {
  const auth = useAuth();
  const wishlist = useWishlist();
  const pathname = usePathname();
  const [promptOpen, setPromptOpen] = useState(false);
  const [returnTo, setReturnTo] = useState(pathname);
  const [notice, setNotice] = useState<string | null>(null);

  if (!hasLiveCatalogueIdentity(productId) && !hasLiveCatalogueIdentity(variantId)) {
    return null;
  }

  const saved = wishlist.items.some(
    (item) => item.productId === productId || (variantId ? item.variantId === variantId : false),
  );
  const pending = wishlist.pendingKeys.includes(productId);
  const label = saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`;
  const visibleLabel = pending ? (saved ? 'Removing' : 'Saving') : saved ? 'Saved' : 'Save';

  function openPrompt() {
    setReturnTo(`${window.location.pathname}${window.location.search}`);
    setPromptOpen(true);
  }

  async function onToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (pending) {
      return;
    }

    if (auth.status !== 'authenticated') {
      openPrompt();
      return;
    }

    setNotice(null);
    const result = await toggleWishlistItem({ productId, variantId });
    if (result.needsAuth) {
      openPrompt();
      return;
    }
    if (!result.ok && !result.alreadyPending) {
      setNotice(WISHLIST_UPDATE_ERROR_MESSAGE);
    }
  }

  return (
    <div className={appearance === 'pdp' ? 'pdp-wishlist' : 'product-wishlist-wrap'}>
      <button
        type="button"
        className={`${appearance === 'pdp' ? 'pdp-wishlist-button' : 'product-wishlist'} ${saved ? 'is-saved' : ''}`}
        aria-label={label}
        aria-pressed={saved}
        aria-busy={pending}
        disabled={pending}
        onClick={(event) => void onToggle(event)}
      >
        {saved ? (
          <HeartFilledIcon className="size-4" />
        ) : (
          <HeartIcon className="size-4" />
        )}
        {appearance === 'pdp' ? <span>{visibleLabel}</span> : <span className="sr-only">{visibleLabel}</span>}
      </button>
      {appearance === 'pdp' && notice ? (
        <p className="pdp-purchase-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {appearance !== 'pdp' && notice ? (
        <span className="sr-only" role="status" aria-live="polite">
          {notice}
        </span>
      ) : null}
      <WishlistSignIn
        open={promptOpen}
        returnTo={returnTo}
        onClose={() => setPromptOpen(false)}
      />
    </div>
  );
}
