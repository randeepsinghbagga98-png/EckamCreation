'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { WishlistItemDto } from '@eckamcreation/api-contracts';
import { ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/session';
import { addWishlistItem, getCustomerWishlist, removeWishlistItem } from './api';
import { WISHLIST_UNAVAILABLE_MESSAGE, WISHLIST_UPDATE_ERROR_MESSAGE } from './messages';

type WishlistStatus = 'idle' | 'loading' | 'ready' | 'error' | 'anonymous';

export type WishlistSnapshot = {
  status: WishlistStatus;
  items: WishlistItemDto[];
  notice: string | null;
  pendingKeys: string[];
};

const idleSnapshot: WishlistSnapshot = {
  status: 'idle',
  items: [],
  notice: null,
  pendingKeys: [],
};

let snapshot: WishlistSnapshot = idleSnapshot;
const listeners = new Set<() => void>();
let hydrateStarted = false;
let hydratePromise: Promise<WishlistSnapshot> | null = null;
let clientReady = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return clientReady ? snapshot : idleSnapshot;
}

function getServerSnapshot(): WishlistSnapshot {
  return idleSnapshot;
}

function setSnapshot(next: WishlistSnapshot) {
  snapshot = next;
  emit();
}

export function clearWishlist() {
  hydrateStarted = false;
  hydratePromise = null;
  setSnapshot(idleSnapshot);
}

function withPending(key: string, pending: boolean) {
  const pendingKeys = pending
    ? snapshot.pendingKeys.includes(key)
      ? snapshot.pendingKeys
      : [...snapshot.pendingKeys, key]
    : snapshot.pendingKeys.filter((item) => item !== key);

  setSnapshot({ ...snapshot, pendingKeys, notice: pending ? null : snapshot.notice });
}

export function hydrateWishlist(force = false) {
  if (!force && hydratePromise) {
    return hydratePromise;
  }

  if (hydrateStarted && !force && snapshot.status === 'ready') {
    return Promise.resolve(snapshot);
  }

  hydrateStarted = true;
  if (snapshot.status !== 'ready') {
    setSnapshot({ ...snapshot, status: 'loading', notice: null });
  }

  hydratePromise = (async () => {
    try {
      const data = await getCustomerWishlist();
      setSnapshot({
        status: 'ready',
        items: data.items,
        notice: null,
        pendingKeys: snapshot.pendingKeys,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setSnapshot({ ...idleSnapshot, status: 'anonymous' });
        return snapshot;
      }

      setSnapshot({
        status: 'error',
        items: [],
        notice: WISHLIST_UNAVAILABLE_MESSAGE,
        pendingKeys: [],
      });
    } finally {
      hydratePromise = null;
    }

    return snapshot;
  })();

  return hydratePromise;
}

export function isWishlistSaved(productId: string, variantId?: string) {
  return snapshot.items.some(
    (item) => item.productId === productId || (variantId ? item.variantId === variantId : false),
  );
}

export function isWishlistPending(productId: string) {
  return snapshot.pendingKeys.includes(productId);
}

export async function toggleWishlistItem(input: { productId: string; variantId?: string }) {
  const key = input.productId;
  if (snapshot.pendingKeys.includes(key)) {
    return { ok: false as const, needsAuth: false, alreadyPending: true };
  }

  const existing = snapshot.items.find(
    (item) => item.productId === input.productId || (input.variantId && item.variantId === input.variantId),
  );

  withPending(key, true);

  try {
    if (existing) {
      await removeWishlistItem(existing.variantId);
      setSnapshot({
        ...snapshot,
        status: 'ready',
        items: snapshot.items.filter((item) => item.id !== existing.id),
        notice: null,
        pendingKeys: snapshot.pendingKeys.filter((item) => item !== key),
      });
      return { ok: true as const, saved: false, needsAuth: false };
    }

    const created = await addWishlistItem(
      input.variantId ? { variantId: input.variantId } : { productId: input.productId },
    );
    setSnapshot({
      ...snapshot,
      status: 'ready',
      items: [created, ...snapshot.items.filter((item) => item.id !== created.id)],
      notice: null,
      pendingKeys: snapshot.pendingKeys.filter((item) => item !== key),
    });
    return { ok: true as const, saved: true, needsAuth: false };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      setSnapshot({
        ...idleSnapshot,
        status: 'anonymous',
      });
      return { ok: false as const, needsAuth: true, alreadyPending: false };
    }

    if (error instanceof ApiClientError && error.status === 409 && !existing) {
      await hydrateWishlist(true);
      setSnapshot({
        ...snapshot,
        pendingKeys: snapshot.pendingKeys.filter((item) => item !== key),
        notice: null,
      });
      return { ok: true as const, saved: true, needsAuth: false };
    }

    setSnapshot({
      ...snapshot,
      notice: WISHLIST_UPDATE_ERROR_MESSAGE,
      pendingKeys: snapshot.pendingKeys.filter((item) => item !== key),
    });
    return { ok: false as const, needsAuth: false, alreadyPending: false };
  }
}

export function useWishlist() {
  const auth = useAuth();

  useEffect(() => {
    if (!clientReady) {
      clientReady = true;
      emit();
    }

    if (auth.status === 'authenticated') {
      void hydrateWishlist();
      return;
    }

    if (auth.status === 'anonymous') {
      clearWishlist();
    }
  }, [auth.status]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
