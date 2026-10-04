import type { PaymentIntentDto } from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';

type PaymentRequestContext = {
  cartToken?: string | null;
  idempotencyKey?: string;
};

/**
 * Creates a provider-neutral PaymentIntent.
 * Amount and currency are taken from the checkout session on the server.
 */
export function createPaymentIntent(
  input: { checkoutSessionId: string },
  context: PaymentRequestContext = {},
) {
  return apiRequest<PaymentIntentDto>(paths.payments.intents, {
    method: 'POST',
    body: { checkoutSessionId: input.checkoutSessionId },
    cartToken: context.cartToken,
    idempotencyKey: context.idempotencyKey,
  });
}

export function getPaymentIntent(
  id: string,
  context: Omit<PaymentRequestContext, 'idempotencyKey'> = {},
) {
  return apiRequest<PaymentIntentDto>(paths.payments.intent(id), {
    method: 'GET',
    cartToken: context.cartToken,
  });
}
