# EckamCreation — API Contracts & Runtime

**Status:** Phase 4.1 payment core ready (provider-neutral PaymentIntent + adapters + webhooks). Live PhonePe/Cashfree/Razorpay/Stripe credentials are **not** configured.  
**Base URL (dev):** `http://localhost:3002` · **Prefix:** `/v1`  
**Types:** `@eckamcreation/api-contracts` · **Domain:** Prisma Phase 1 schema

## Rules

1. Money DTO: `{ amountMinor: string, currencyCode: string }` (bigint as string).
2. Cursor pagination; optional `Idempotency-Key` on writes.
3. Success/error envelopes via `ok()` / `fail()` helpers.
4. Guest cart: `X-Cart-Token` header.
5. Request correlation: `X-Request-Id` (accepted inbound; always returned).
6. Auth cookies: `eckam_session` (customer), `eckam_staff_session` (staff) — HttpOnly, SameSite=Lax, Secure in production. Never return session tokens or password hashes in JSON.

## Envelope

Success: `{ ok: true, data, meta: { requestId, pagination? } }`  
Error: `{ ok: false, error: { code, message, details?, requestId } }`

| Code | HTTP |
| --- | ---: |
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| IDEMPOTENCY_REPLAY | 409 |
| RATE_LIMITED | 429 |
| NOT_IMPLEMENTED | 501 |
| INTERNAL_ERROR | 500 |

Scopes: `public` | `customer` | `staff` | `webhook`.

## Runtime foundation (Phase 3.1)

| Concern | Behavior |
| --- | --- |
| Port | `3002` |
| Env | `validateApiEnv` requires `DATABASE_URL`; provider keys optional |
| Health | `GET /v1/health` — API + PostgreSQL (`503` when DB down) |
| Errors | Central `ApiError` + `withApiHandler` |
| Proxy | Request ID, CORS, security headers, JSON size limit |
| Prisma | Shared singleton + `checkDatabaseHealth` |

## Authentication + RBAC (Phase 3.2)

| Concern | Behavior |
| --- | --- |
| Package | `@eckamcreation/auth` — provider-neutral services (credentials + DB/memory sessions) |
| Customer | `POST /v1/auth/register` · `POST /v1/auth/login` · `POST /v1/auth/logout` · `GET /v1/auth/session` |
| Staff | Invite-only accounts · `POST /v1/auth/staff/login` · `POST /v1/auth/staff/logout` · `GET /v1/auth/staff/session` |
| Passwords | scrypt hashes on `User.passwordHash` / `StaffUser.passwordHash` |
| Customer sessions | Prisma `Session` (Auth.js-compatible) |
| Staff sessions | In-memory store (single-instance). Multi-instance production needs `StaffSession` (or Redis) later — no schema change in 3.2 |
| RBAC | `Role` / `Permission` / `RolePermission` · helpers `requireStaff` / `requirePermission("products.read")` etc. |
| Audit | `AuditLog` for staff login/logout/failures (no secrets) |
| Rate limit | Stricter in-memory auth bucket (20 / 15 min / IP+route). Shared Redis later for multi-instance |
| Email verify | `EmailVerificationPort` interface + noop (no provider yet) |

### Auth routes

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/session`
- `POST /v1/auth/staff/login`
- `POST /v1/auth/staff/logout`
- `GET /v1/auth/staff/session`

## Catalogue (Phase 3.3)

Public (ACTIVE + not deleted only):

- `GET /v1/catalogue/products` — cursor pagination, filters: category, collection, brand, currency, country, price range, inStock, q, sort
- `GET /v1/catalogue/products/:idOrSlug`
- `GET /v1/catalogue/products/:idOrSlug/variants`
- `GET /v1/catalogue/products/:idOrSlug/media`
- `GET /v1/catalogue/variants/:id`
- `GET /v1/catalogue/variants/:id/price?currency=XXX&country=optional`
- `GET /v1/catalogue/categories` · `GET /v1/catalogue/categories/:idOrSlug` (includes children)
- `GET /v1/catalogue/brands` · `GET /v1/catalogue/brands/:idOrSlug`
- `GET /v1/catalogue/collections` · `GET /v1/catalogue/collections/:idOrSlug`

Money is always `{ amountMinor: string, currencyCode }` via `Price` (never product-level float prices). Public responses omit inventory quantities, storage keys, and other internals.

Admin (RBAC: `products.*` / `catalogue.*`):

- `GET|POST /v1/admin/products` · `GET|PATCH /v1/admin/products/:id`
- `POST /v1/admin/products/:id/variants`
- `PUT /v1/admin/variants/:id/prices`
- `GET|POST /v1/admin/categories` · `PATCH /v1/admin/categories/:id`
- `GET|POST /v1/admin/brands` · `PATCH /v1/admin/brands/:id`
- `GET|POST /v1/admin/collections` · `PATCH /v1/admin/collections/:id`
- `POST /v1/admin/collections/:id/products`

Admin mutations write `AuditLog` entries (no secrets).

## Customer account (Phase 3.4)

All routes require customer session (`requireAuthenticatedUser`). Identity is always derived from the session — never from a client-supplied `customerId` / `userId`. Cross-customer access returns **404** (no existence leak). Paths follow `paths.me` in `@eckamcreation/api-contracts` (not `/v1/customer/*`).

| Area | Routes | Notes |
| --- | --- | --- |
| Profile | `GET\|PATCH /v1/me` | Safe DTO only (no password hash, tokens, profile `notes`) |
| Addresses | `GET\|POST /v1/me/addresses` · `PATCH\|DELETE /v1/me/addresses/:id` | Ownership enforced; transactional single default per shipping/billing group (`isDefault` + `AddressType`) |
| Preferences | `GET\|PATCH /v1/me/notification-preferences` | Communication prefs from `NotificationPreference` |
| Consents | `GET\|POST /v1/me/consents` | Append-only consent records |
| Wishlist | `GET /v1/me/wishlist` · `POST /v1/me/wishlist/items` · `DELETE /v1/me/wishlist/items/:variantId` | Default wishlist; add via `variantId` or `productId`; only ACTIVE catalogue products; unpublished/deleted items omitted from list; delete accepts variantId or productId |
| Orders | `GET /v1/me/orders` · `GET /v1/me/orders/:idOrNumber` | Read-only history for session user; omits internal `notes`, payment secrets, staff data |

Sensitive mutations write `AuditLog` with `actorUserId` (no passwords/tokens/full PII dumps).

## Cart (Phase 3.5)

Paths follow `paths.carts` (`/v1/carts/*`). Guest carts use opaque `guestToken` via `X-Cart-Token` header (also returned on create/add). Customer carts derive ownership from the session cookie — never from a client `userId`/`customerId`.

| Route | Auth | Behavior |
| --- | --- | --- |
| `POST /v1/carts` | optional | Create guest cart, or return/create ACTIVE customer cart |
| `GET /v1/carts/current` | guest token **or** customer session | Retrieve ACTIVE cart |
| `DELETE /v1/carts/current` | guest token **or** customer session | Clear all lines (cart remains) |
| `POST /v1/carts/current/items` | guest token **or** customer session (auto-creates cart) | Add/increase quantity for `variantId` |
| `PATCH /v1/carts/current/items/:itemId` | same | Set quantity (`0` removes). `:itemId` accepts CartItem id **or** variantId |
| `DELETE /v1/carts/current/items/:itemId` | same | Remove line |
| `POST /v1/carts/merge` | **customer session required** | Body `{ guestToken }` merges guest → customer cart |

**Quantity:** integer 1–999 on add; 0–999 on patch; duplicates merge quantities and cap at 999.

**Pricing:** live `Price` resolution (variant + currency + optional `?country=`). Client-supplied prices ignored. Money is minor units. Optional `CartItem.unitPriceMinor` snapshot stored at write for future checkout; responses always use live price. Subtotal is sum of available line totals, or `null` if any line is `PRICE_UNAVAILABLE`. Tax/shipping/discounts are **not** computed in this phase.

**Stale catalogue:** unpublished/deleted products and inactive variants remain in the cart but are flagged (`availability`: `PRODUCT_UNAVAILABLE` / `VARIANT_UNAVAILABLE` / `PRICE_UNAVAILABLE`); they are not silently removed.

**Merge:** sums quantities for shared variants (cap 999); transfers unique lines; marks guest cart `MERGED`, clears its token/items. Empty guest is a no-op on customer contents. Unauthenticated merge → 401.

**Rate limit:** public cart mutations use existing in-memory limiter (`cart` bucket: 120 / 15 min / IP+route).

## Checkout (Phase 3.6)

Paths follow `paths.checkout` (`/v1/checkout/sessions/*`). Identity is session cookie **or** `X-Cart-Token` — never client `userId`/`customerId`.

| Route | Behavior |
| --- | --- |
| `POST /v1/checkout/sessions` | Start checkout from active cart; locks live prices into `CheckoutItem`; optional `Idempotency-Key` |
| `GET /v1/checkout/sessions/:id` | Retrieve owned session + shipping options when destination known |
| `PATCH /v1/checkout/sessions/:id` | Set address / shipping method / coupon. Customers use owned `*AddressId`; guests may pass inline `shippingAddress` / `billingAddress` (creates `Address` with `userId=null`) |
| `POST /v1/checkout/sessions/:id/quote` | Revalidate catalogue + **refresh** locked prices; emits `PRICE_CHANGED:…` warnings |
| `POST /v1/checkout/sessions/:id/complete` | Requires address + shipping; rejects if live prices ≠ snapshot (`409`); sets status `PAYMENT` + `paymentStatus=READY_FOR_PAYMENT` |
| `POST /v1/checkout/sessions/:id/payment-intent` | Creates provider-neutral `PaymentIntent` (`provider=pending`, `REQUIRES_PAYMENT`). Does **not** charge |

**Lifecycle:** `OPEN` → `ADDRESS` → `SHIPPING` → `PAYMENT` (ready for payment) → `COMPLETED` after verified paid order · or `EXPIRED` / `CANCELLED`. `PAYMENT` and terminal states are immutable for checkout edits.

**Totals (minor units):** `subtotal − discount + tax + shipping = total`. Currency must match cart; no float math.

**Shipping:** destination-aware via `ShippingZone` → `ShippingMethod` → `ShippingRate` (no hard-coded rates).

**Tax:** `TaxRule` / `TaxRate` (basis points). If no rule matches destination → `taxConfigured=false`, `tax=0` (not invented).

**Discounts:** coupon → `Promotion` validation (dates, limits, currency, rules). Client discount amounts ignored. `FREE_SHIPPING` zeroes shipping.

**Inventory:** validation only at checkout (`onHand − reserved`); sale decrement happens at paid-order creation when inventory rows exist.

**Payment / order boundary:** complete does **not** create `Order`. Create `PaymentIntent` via payments API; verified provider webhook → `SUCCEEDED` → `OrderService.createFromPaidCheckout`.

## Payments (Phase 4.1)

Provider-neutral core in `@eckamcreation/payments`. Live India/international gateways are **not** wired; adapters are pluggable.

| Route | Behavior |
| --- | --- |
| `POST /v1/payments/intents` | Body `{ checkoutSessionId }` — amount/currency from checkout only; optional `Idempotency-Key` |
| `GET /v1/payments/intents/:id` | Owner session/guest token (or staff); never cross-customer |
| `POST /v1/payments/intents/:id/initiate` | Calls configured `PaymentProviderAdapter`; `503 PAYMENT_PROVIDER_NOT_CONFIGURED` if none |
| `POST /v1/webhooks/payments/:provider` | Signature-verified, idempotent `WebhookEvent`; may mark intent `SUCCEEDED` and create order |

**Lifecycle:** `REQUIRES_PAYMENT` → `PROCESSING` → `SUCCEEDED` / `FAILED` / `CANCELLED` (`PaymentStateService`).

**Amount authority:** server checkout total only — client amounts ignored.

**Test provider:** id `test` — allowed only when `NODE_ENV=test` or `ALLOW_TEST_PAYMENT_PROVIDER=1`, never in production.

**Refunds:** `PaymentService.createRefund` boundary (idempotent amount cap); no automatic refunds on cancel.

## Orders + shipments (Phase 3.7)

**Creation:** `OrderService.createFromPaidCheckout({ paymentIntentId })` only when intent is `SUCCEEDED`, amount/currency match checkout, and checkout is `PAYMENT`. Idempotent on intent `orderId` + optional `Idempotency-Key`.

**Snapshots:** `OrderItem` stores `productNameSnap` / `variantNameSnap` / `skuSnap` / prices; `shippingAddressSnap` / `billingAddressSnap` JSON — catalogue/address edits do not rewrite history.

**Customer**

| Route | Notes |
| --- | --- |
| `GET /v1/me/orders` | Own orders only |
| `GET /v1/me/orders/:idOrNumber` | Safe DTO (no notes/secrets) |
| `GET /v1/me/orders/:idOrNumber/shipments` | Tracking-safe shipment view |
| `POST /v1/me/orders/:idOrNumber/cancellations` | Request only — **no auto-refund** |

**Staff** (`orders.read` / `orders.update`)

| Route | Notes |
| --- | --- |
| `GET /v1/admin/orders` · `GET /v1/admin/orders/:id` | List/detail |
| `PATCH /v1/admin/orders/:id/status` | Centralized transitions (`OrderStateService`) |
| `POST /v1/admin/orders/:id/cancellations` | Approve cancellation → `CANCELLED` (still no refund) |
| `GET\|POST /v1/admin/orders/:id/shipments` | Create shipment (carrier/tracking optional; no courier API) |
| `PATCH /v1/admin/shipments/:id/status` | Appends immutable `ShipmentEvent`; valid transitions only |

**Shipment lifecycle:** `PENDING` → `LABEL_CREATED` / `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED` (+ `FAILED` / `RETURNED` / `CANCELLED`). External courier adapters are out of scope.

## Service boundaries

| Group | Package |
| --- | --- |
| DTOs / paths / Zod | `@eckamcreation/api-contracts` |
| Auth / RBAC | `@eckamcreation/auth` |
| Search | `@eckamcreation/search` |
| AI | `@eckamcreation/ai` |
| Payments | `@eckamcreation/payments` |

## Out of scope (still)

Login UI, Admin UI, Storefront UI, OAuth/social, OTP/SMS, password-reset email provider, live payment gateway credentials, courier APIs, automatic refunds, schema migrations, deploy.

## Next

Phase 4.2+: configure real payment provider adapters (PhonePe/Cashfree/etc.) behind the same `PaymentProviderAdapter` interface.
