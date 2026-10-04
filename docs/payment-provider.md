# Payment provider readiness

**Status:** Provider-neutral Payment Core is ready.  
**Live provider:** none.  
**WAITING FOR CLIENT PROVIDER SELECTION**

This document describes how to plug a real provider into the existing Payment Core later. It does not choose a provider and does not contain credentials.

Related: [architecture-blueprint.md](./architecture-blueprint.md) · [api-contracts.md](./api-contracts.md)

## Current verified storefront state

```text
Checkout Session
  → PaymentIntent
  → REQUIRES_PAYMENT
  → WAITING FOR CLIENT PAYMENT PROVIDER
```

Creation leaves `provider: "pending"`, `orderId: null`. That is correct. PaymentIntent creation is not payment success.

The storefront must not call `POST /v1/payments/intents/:id/initiate` until a client-selected provider is configured.

## Architecture (do not replace)

```text
provider name
    ↓
PaymentProviderRegistry
    ↓
PaymentProviderAdapter
    ↓
PaymentService (state machine + amounts + ownership)
```

Package: `@eckamcreation/payments`  
Wiring: `apps/api/src/lib/payments/index.ts`

Adapter methods already required by Payment Core:

- `isConfigured()`
- `createPayment()` — initiate / create at the provider
- `getPaymentStatus()`
- `verifyWebhook()` — signature check + normalized event
- `refundPayment()`

Normalized result statuses: `REQUIRES_PAYMENT` | `PROCESSING` | `SUCCEEDED` | `FAILED` | `CANCELLED`.

Commerce code (`CheckoutService`, `OrderService`) must never import a provider SDK.

## 1. How to select a provider

**WAITING FOR CLIENT PROVIDER SELECTION**

When the client names a provider:

1. Implement one `PaymentProviderAdapter` with `id` matching that provider.
2. Register it in `getPaymentRegistry()` only when `isConfigured()` can be true from **server** env.
3. Set `PAYMENT_PROVIDER` to that adapter `id`.
4. Do not register unused providers.

Until then, leave `PAYMENT_PROVIDER` empty. An empty registry is valid. The app must boot. Initiate / webhook / refund return `PAYMENT_PROVIDER_NOT_CONFIGURED` (503).

## 2. Required server-side credentials

**WAITING FOR CLIENT PROVIDER SELECTION**

Reserved server-only variables (already in `.env.example`, all optional):

| Variable | Purpose |
| --- | --- |
| `PAYMENT_PROVIDER` | Adapter id to enable later. Empty = none. |
| `PAYMENT_PROVIDER_KEY` | Public/key-id style credential from the provider dashboard. |
| `PAYMENT_PROVIDER_SECRET` | Server secret. Never `NEXT_PUBLIC_*`. |
| `PAYMENT_WEBHOOK_SECRET` | Webhook signature secret. |
| `ALLOW_TEST_PAYMENT_PROVIDER` | `"1"` enables `TestPaymentAdapter` in non-production only. |

Do not invent extra names unless the chosen provider later requires them. Do not commit values. Do not put fake sandbox keys in git.

## 3. Where credentials belong

- Server process only: `apps/api` environment (`.env.local`, host secrets).
- Schema: `@eckamcreation/config` `envSchema` / `serverOnlyEnvKeys`.
- `readPaymentProviderEnv()` reports presence only. It never returns secret values.
- Never add `NEXT_PUBLIC_PAYMENT_*`.
- Never send keys in PaymentIntent DTOs or storefront props.

## 4. How to configure the webhook secret

**WAITING FOR CLIENT PROVIDER SELECTION**

1. Create the webhook in the provider dashboard pointing at:

   `POST /v1/webhooks/payments/:provider`

   `:provider` must equal the adapter `id`.

2. Store the signing secret in `PAYMENT_WEBHOOK_SECRET`.
3. The adapter `verifyWebhook()` must reject missing/invalid signatures (`PaymentUnauthorizedWebhookError` → 401).
4. Payment Core records `WebhookEvent` uniquely on `(provider, eventId)` and ignores duplicates.

Do not send unsigned or invented webhook bodies that mark `SUCCEEDED`.

## 5. How to enable the provider

1. Adapter implemented and registered.
2. Server env set (provider id + credentials + webhook secret).
3. `adapter.isConfigured()` returns true.
4. Process restart so `getPaymentRegistry()` rebuilds.
5. Confirm `hasLivePaymentProvider()` is true in the API process.
6. Confirm storefront still does not assume success from create.

`PAYMENT_PROVIDER` alone does not activate payment. An adapter must be registered and configured.

## 6. How to test sandbox mode

**WAITING FOR CLIENT PROVIDER SELECTION**

Use the provider’s official sandbox/test mode credentials in the **API** environment only.

`TestPaymentAdapter` (`id=test`) is **not** a sandbox for a real provider:

- Registered only when `NODE_ENV=test` or `ALLOW_TEST_PAYMENT_PROVIDER=1`
- **Blocked when `NODE_ENV=production`** (`assertTestProviderAllowed`)
- Must never be used as a production fallback

Do not set `ALLOW_TEST_PAYMENT_PROVIDER=1` in production.

## 7. How to verify webhook delivery

After the client provider is live in sandbox:

1. Initiate through `POST /v1/payments/intents/:id/initiate` (not from today’s storefront).
2. Expect `PROCESSING` (or provider pending). Not `SUCCEEDED` from HTTP 200 alone.
3. Deliver a **signed** provider webhook.
4. Confirm Payment Core transitions `PROCESSING` → `SUCCEEDED` or `FAILED`.
5. Replay the same event and confirm `duplicate: true` and no second order.

## 8. How to switch to production credentials

1. Replace sandbox values in the production secret store.
2. Point the production webhook at the same `/v1/webhooks/payments/:provider` path.
3. Confirm `ALLOW_TEST_PAYMENT_PROVIDER` is unset.
4. Confirm no test adapter is registered.
5. Re-verify signature checks, duplicates, success, and failure.

## State machine (do not weaken)

| Event | Allowed result |
| --- | --- |
| Create PaymentIntent | `REQUIRES_PAYMENT` |
| Initiate (provider configured) | typically `PROCESSING` |
| Verified success webhook | `SUCCEEDED` |
| Verified failure webhook | `FAILED` |

Invalid: `REQUIRES_PAYMENT` → `SUCCEEDED` in one step.  
Invalid: storefront button → `SUCCEEDED`.  
Invalid: initiate HTTP 200 → automatically `SUCCEEDED` (unless a **verified** adapter result is `SUCCEEDED`, which the test adapter may do only in non-prod tests).

## Order boundary (do not change)

`OrderService.createFromPaidCheckout` runs only from `PaymentService` `onPaymentSucceeded` after a verified `SUCCEEDED` transition.

No order while status is `REQUIRES_PAYMENT` or `PROCESSING`.

## Future provider integration checklist

Do not perform these steps until the client chooses a provider.

- [ ] Client chooses provider
- [ ] Sandbox account created
- [ ] Server credentials added
- [ ] Provider adapter implemented
- [ ] Registry enabled
- [ ] Initiate flow tested
- [ ] Provider checkout/payment UI integrated if required
- [ ] Webhook endpoint configured
- [ ] Signature verification tested
- [ ] Duplicate webhook tested
- [ ] Successful payment verified
- [ ] Failed payment verified
- [ ] Payment state transitions verified
- [ ] Paid checkout verified
- [ ] Order creation verified
- [ ] Refund flow verified if supported
- [ ] Production credentials added
- [ ] Production webhook configured
