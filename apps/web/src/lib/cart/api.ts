import type { CartDto, CartItemInput } from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';
import { getGuestToken, rememberGuestToken } from './identity';

type CartContext = {
  currency?: string;
  country?: string;
};

function rememberCart(cart: CartDto): CartDto {
  rememberGuestToken(cart.guestToken);
  return cart;
}

function contextSearch(context: CartContext = {}) {
  return {
    currency: context.currency,
    country: context.country,
  };
}

export function getCart(context: CartContext = {}) {
  return apiRequest<CartDto>(paths.carts.current, {
    method: 'GET',
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}

export function createCart(context: CartContext = {}) {
  return apiRequest<CartDto>(paths.carts.create, {
    method: 'POST',
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}

export function addCartItem(input: CartItemInput, context: CartContext = {}) {
  return apiRequest<CartDto>(paths.carts.items, {
    method: 'POST',
    body: input,
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}

export function updateCartItem(
  itemId: string,
  quantity: number,
  context: CartContext = {},
) {
  return apiRequest<CartDto>(paths.carts.item(itemId), {
    method: 'PATCH',
    body: { quantity },
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}

export function removeCartItem(itemId: string, context: CartContext = {}) {
  return apiRequest<CartDto>(paths.carts.item(itemId), {
    method: 'DELETE',
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}

export function clearCart(context: CartContext = {}) {
  return apiRequest<CartDto>(paths.carts.current, {
    method: 'DELETE',
    cartToken: getGuestToken(),
    search: contextSearch(context),
  }).then(rememberCart);
}
