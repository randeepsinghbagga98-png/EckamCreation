'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ApiClientError } from '@/lib/api/client';
import type { ProductCardData } from '@/lib/catalogue/product';
import { addCartItem, getCart, removeCartItem, updateCartItem } from './api';
import { hasGuestToken } from './identity';
import { mapCartDto } from './map';
import {
  CART_LOAD_ERROR_MESSAGE,
  CART_MUTATION_ERROR_MESSAGE,
  PREVIEW_UNAVAILABLE_MESSAGE,
  clampCartQuantity,
  createCartLine,
  lineTotalFor,
  toCartSnapshot,
} from './presentation';
import type { CartLine, CartSnapshot } from './types';

const STORAGE_KEY = 'eckam.presentation-cart.v1';
const emptyCart = toCartSnapshot([], 'presentation', 'ready');
const loadingCart: CartSnapshot = {
  ...toCartSnapshot([], 'api', 'loading'),
  status: 'loading',
};

function readStoredItems(): CartLine[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredItems(items: CartLine[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let snapshot: CartSnapshot = typeof window === 'undefined' ? emptyCart : loadingCart;
const listeners = new Set<() => void>();
let hydrateStarted = false;
let mutating = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setItems(items: CartLine[], status: CartSnapshot['status'] = 'ready') {
  writeStoredItems(items);
  snapshot = toCartSnapshot(items, 'presentation', status);
  emit();
}

function applyApiCart(cart: Parameters<typeof mapCartDto>[0], notice: string | null = null) {
  const previewItems = readStoredItems();
  snapshot = mapCartDto(cart, {
    notice:
      notice ??
      (previewItems.length > 0 ? PREVIEW_UNAVAILABLE_MESSAGE : null),
    hasUnavailablePreview: previewItems.length > 0,
    pending: false,
  });
  emit();
}

export function getCartSnapshot(): CartSnapshot {
  return snapshot;
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrateCart() {
  if (hydrateStarted) {
    return;
  }

  hydrateStarted = true;
  snapshot = { ...snapshot, status: 'loading', notice: null };
  emit();

  try {
    const cart = await getCart();
    applyApiCart(cart);
  } catch (error) {
    const missing =
      error instanceof ApiClientError &&
      (error.status === 404 || error.status === 401);

    if (missing && !hasGuestToken()) {
      snapshot = toCartSnapshot(readStoredItems(), 'presentation', 'ready');
      emit();
      return;
    }

    snapshot = {
      ...toCartSnapshot([], 'api', 'error'),
      status: 'error',
      notice: CART_LOAD_ERROR_MESSAGE,
    };
    emit();
  }
}

export async function retryCart() {
  hydrateStarted = false;
  await hydrateCart();
}

export function addPresentationItem(
  product: ProductCardData,
  quantity = 1,
  variant?: { id?: string; name?: string | null },
) {
  const existing = snapshot.items.find(
    (item) =>
      item.productId === product.id && (item.variantId ?? '') === (variant?.id ?? ''),
  );

  if (existing) {
    setPresentationQuantity(existing.id, existing.quantity + quantity);
    return;
  }

  setItems([...snapshot.items, createCartLine(product, quantity, variant)]);
}

export async function addServerCartItem(input: { variantId: string; quantity: number }) {
  const cart = await addCartItem({
    variantId: input.variantId,
    quantity: input.quantity,
  });
  applyApiCart(cart);
}

export function setPresentationQuantity(lineId: string, quantity: number) {
  setItems(
    snapshot.items.map((item) => {
      if (item.id !== lineId) {
        return item;
      }

      const nextQuantity = clampCartQuantity(quantity);
      return {
        ...item,
        quantity: nextQuantity,
        lineTotal: lineTotalFor(item.unitPrice, nextQuantity),
      };
    }),
  );
}

export async function setCartQuantity(lineId: string, quantity: number) {
  if (snapshot.source !== 'api') {
    setPresentationQuantity(lineId, quantity);
    return;
  }

  if (mutating) {
    return;
  }

  mutating = true;
  snapshot = { ...snapshot, pending: true, notice: null };
  emit();

  try {
    const cart = await updateCartItem(lineId, quantity);
    applyApiCart(cart);
  } catch {
    snapshot = {
      ...snapshot,
      pending: false,
      notice: CART_MUTATION_ERROR_MESSAGE,
    };
    emit();
  } finally {
    mutating = false;
  }
}

export function removePresentationItem(lineId: string) {
  setItems(snapshot.items.filter((item) => item.id !== lineId));
}

export async function removeCartLine(lineId: string) {
  if (snapshot.source !== 'api') {
    removePresentationItem(lineId);
    return;
  }

  if (mutating) {
    return;
  }

  mutating = true;
  snapshot = { ...snapshot, pending: true, notice: null };
  emit();

  try {
    const cart = await removeCartItem(lineId);
    applyApiCart(cart);
  } catch {
    snapshot = {
      ...snapshot,
      pending: false,
      notice: CART_MUTATION_ERROR_MESSAGE,
    };
    emit();
  } finally {
    mutating = false;
  }
}

export function markCartError() {
  snapshot = { ...snapshot, status: 'error', notice: CART_LOAD_ERROR_MESSAGE };
  emit();
}

export function retryPresentationCart() {
  void retryCart();
}

export function useCart(): CartSnapshot {
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, () => emptyCart);

  useEffect(() => {
    void hydrateCart();
  }, []);

  return cart;
}
