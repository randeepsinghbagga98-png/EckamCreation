'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { CloseIcon } from '@/components/icons';

type WishlistSignInProps = {
  open: boolean;
  onClose: () => void;
  returnTo: string;
};

export function WishlistSignIn({ open, onClose, returnTo }: WishlistSignInProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const next = encodeURIComponent(returnTo);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="wishlist-signin">
      <button
        type="button"
        className="wishlist-signin-scrim"
        aria-label="Close sign in prompt"
        onClick={onClose}
      />
      <div
        className="wishlist-signin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="wishlist-signin-kicker">Wishlist</p>
            <h2 id={titleId} className="wishlist-signin-title">
              Sign in to save
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="wishlist-signin-close"
            onClick={onClose}
          >
            <CloseIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <p className="wishlist-signin-copy">
          Sign in or create an account to save pieces to your wishlist.
        </p>
        <div className="wishlist-signin-actions">
          <Link href={`/account/login?next=${next}`} className="cart-cta cart-cta--primary">
            Sign in
          </Link>
          <Link href={`/account/signup?next=${next}`} className="cart-cta cart-cta--ghost">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
