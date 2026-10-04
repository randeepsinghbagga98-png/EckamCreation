import type {
  CheckoutCreateInput,
  CheckoutPatchInput,
  CheckoutSessionDto,
} from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';

type CheckoutRequestContext = {
  cartToken?: string | null;
  idempotencyKey?: string;
};

export function createCheckoutSession(
  input: CheckoutCreateInput,
  context: CheckoutRequestContext = {},
) {
  return apiRequest<CheckoutSessionDto>(paths.checkout.sessions, {
    method: 'POST',
    body: input,
    cartToken: context.cartToken,
    idempotencyKey: context.idempotencyKey,
  });
}

export function getCheckoutSession(
  id: string,
  context: CheckoutRequestContext & { country?: string } = {},
) {
  return apiRequest<CheckoutSessionDto>(paths.checkout.session(id), {
    method: 'GET',
    cartToken: context.cartToken,
    search: { country: context.country },
  });
}

export function patchCheckoutSession(
  id: string,
  input: CheckoutPatchInput,
  context: CheckoutRequestContext = {},
) {
  return apiRequest<CheckoutSessionDto>(paths.checkout.session(id), {
    method: 'PATCH',
    body: input,
    cartToken: context.cartToken,
  });
}

/**
 * Advances an existing checkout session to READY_FOR_PAYMENT.
 * The existing CheckoutService.complete boundary does not create an order.
 */
export function completeCheckoutSession(
  id: string,
  context: Omit<CheckoutRequestContext, 'idempotencyKey'> = {},
) {
  return apiRequest<CheckoutSessionDto>(paths.checkout.complete(id), {
    method: 'POST',
    cartToken: context.cartToken,
  });
}
