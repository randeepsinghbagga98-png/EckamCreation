# EckamCreation — Domain Model (Phase 1)

Source schema: `packages/database/prisma/schema.prisma`  
Plan: `docs/schema-plan.md` · Decisions: `docs/schema-decisions.md`

## Domain overview

EckamCreation’s operational data model covers identity, catalogue, multi-currency pricing, inventory, cart/checkout, orders, payments, shipping, returns, promotions, reviews, support, AI audit trails, and communication/consent. Analytics is a thin event table only. Full CMS pages are deferred.

## Entity list (by area)

**Identity:** User, Account, Session, VerificationToken, CustomerProfile, Address  
**Admin:** StaffUser, Role, Permission, RolePermission, StaffUserRole, AuditLog  
**Geography:** Currency, Country, Region  
**Tax:** TaxRule, TaxRate  
**Catalogue:** Category, Brand, Collection, CollectionProduct, Product, ProductCategory, ProductVariant, ProductAttribute, ProductAttributeValue, VariantAttributeValue, ProductMedia, ProductTag, ProductTagAssignment, Price, ProductMarketAvailability  
**Inventory:** InventoryLocation, InventoryItem, InventoryMovement  
**Cart/Wishlist/Checkout:** Cart, CartItem, Wishlist, WishlistItem, CheckoutSession, CheckoutItem  
**Orders:** Order, OrderItem, OrderStatusHistory  
**Payments:** PaymentIntent, PaymentTransaction, Refund  
**Shipping:** ShippingZone, ShippingZoneCountry, ShippingMethod, ShippingRate, Shipment, ShipmentEvent  
**Returns:** Cancellation, ReturnRequest, ReturnItem  
**Promotions:** Promotion, Coupon, PromotionRule, PromotionUsage  
**Reviews:** Review  
**Support:** SupportTicket, SupportMessage  
**AI:** AiConversation, AiMessage, AiToolCall  
**Comms:** Notification, NotificationPreference, NotificationOutbox, NotificationAttempt, EmailTemplate, EmailLog, WhatsAppTemplate, WhatsAppLog, CustomerConsent  
**Infra:** WebhookEvent, IdempotencyRecord, AnalyticsEvent  
**SEO/CMS light:** SeoMetadata, Banner

## Important relationships

```text
User ──┬── CustomerProfile
       ├── Address[]
       ├── Cart[] ── CartItem[] ── ProductVariant
       ├── CheckoutSession ──► Order?
       ├── Order[] ── OrderItem[] (snapshots)
       │              ├── PaymentIntent[] ── PaymentTransaction[]
       │              ├── Shipment[] ── ShipmentEvent[]
       │              ├── Refund[]
       │              ├── Cancellation?
       │              └── ReturnRequest[] ── ReturnItem[]
       ├── Consent[] / NotificationPreference / Notifications
       └── AiConversation[] ── AiMessage[] / AiToolCall[]

Category (tree) ── ProductCategory ── Product ── ProductVariant
                                              ├── Price[] (currency ± country)
                                              ├── InventoryItem[] @ Location
                                              └── ProductMedia[]

Country / Currency configure Price, TaxRule, ShippingZone, Availability
StaffUser ── Roles ── Permissions ; AuditLog
```

## Lifecycle states (selected)

| Entity | States |
| --- | --- |
| Product | DRAFT → ACTIVE → ARCHIVED |
| Cart | ACTIVE → MERGED / CONVERTED / EXPIRED / ABANDONED |
| CheckoutSession | OPEN → ADDRESS → SHIPPING → PAYMENT → COMPLETED / EXPIRED / CANCELLED |
| Order | PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED (+ cancel/refund paths) |
| PaymentIntent | REQUIRES_PAYMENT → PROCESSING → SUCCEEDED / FAILED / CANCELLED |
| Shipment | PENDING → … → DELIVERED / FAILED / RETURNED / CANCELLED |
| ReturnRequest | REQUESTED → APPROVED → RECEIVED → REFUNDED → CLOSED |
| Outbox | PENDING → PROCESSING → SENT / FAILED → DEAD |
| Consent | GRANTED / REVOKED / PENDING |

## Money model

- All monetary amounts are `BigInt` **minor units** (e.g. paise, cents).
- ISO currency via `Currency.code` (string PK) and FKs such as `currencyCode`.
- Never `Float`/`Decimal` for money in this schema (tax rates use integer **basis points**).
- `Currency.minorUnits` documents scale (usually 2).

## Pricing model

- `ProductVariant` has **no** single price column.
- `Price` rows: `amountMinor`, optional `compareAtMinor`, `currencyCode`, optional `countryId`, `isActive`, `startsAt`/`endsAt`.
- Application selects the best active price for (variant, currency, country, now).

## Inventory model

- Stock lives on `InventoryItem` per `(variantId, locationId)`: `onHand`, `reserved`.
- Available ≈ `onHand - reserved` (computed in app).
- `InventoryMovement` is the append-only ledger (adjustments, sales, reserves, transfers).
- Designed for multi-location from day one.

## Order model

- Orders store **historical totals** (`subtotalMinor`, `discountMinor`, `taxMinor`, `shippingMinor`, `totalMinor`) and address snapshots (`shippingAddressSnap` / `billingAddressSnap`).
- `OrderItem` snapshots `productNameSnap`, `variantNameSnap`, `skuSnap`, unit/tax/discount/total minors.
- Never recompute past orders from live `Price` rows.
- `OrderStatusHistory` records transitions.

## Payment model

- Provider-agnostic: `provider` string + `providerIntentId` / `providerTxnId` / `providerRefundId`.
- `PaymentIntent` → `PaymentTransaction[]` → optional `Refund`.
- `metadata` Json must never contain PAN/CVV.
- `WebhookEvent` unique on `(provider, eventId)`; `IdempotencyRecord` unique on `(scope, key)`.

## International model

- `Country` + `Region` + `Currency` are configurable tables.
- Pricing: `Price.countryId` optional (global currency price vs country override).
- Availability: `ProductMarketAvailability`.
- Tax: `TaxRule` scoped by country/region + `TaxRate.rateBps` (GST etc. as data, not Product fields).
- Shipping: zones → countries → methods → rates (amount + currency + optional weight/subtotal bands).

## Consent model

- `CustomerConsent` history: `type`, `status`, `source`, `capturedAt`, `revokedAt`.
- `NotificationPreference` holds current channel toggles (transactional vs marketing email/WhatsApp).
- Prefer writing a consent row on every grant/revoke; preferences are the fast-read projection.

## Communication model

- Templates: `EmailTemplate`, `WhatsAppTemplate`.
- Delivery logs: `EmailLog`, `WhatsAppLog`.
- Reliable dispatch: `NotificationOutbox` (+ `dedupeKey`) → `NotificationAttempt`.
- In-app: `Notification`.

## AI persistence

- `AiConversation` / `AiMessage` / `AiToolCall`.
- Tool calls store `toolName`, redacted `argsJson`, `resultSummary`, success/duration.
- **Do not** persist API keys or payment secrets in AI tables.

## Indexing strategy

- Unique: slugs, SKUs, order numbers, coupon codes, Auth.js tokens, webhook `(provider, eventId)`, idempotency `(scope, key)`.
- Hot paths: order by user/status/date; cart by user/status; price by variant+currency+active; inventory by variant+location; outbox by status+schedule.

## Important constraints

- Guest cart: `guestToken` unique; user cart: `userId` + status indexes; merge via `mergedIntoId`.
- Checkout 1:1 with cart (`cartId` unique); conversion links `convertedOrderId`.
- Payment uniqueness on provider references when present.
- Review unique `(orderItemId, userId)` when both set (verified purchase path).

## Deferred

| Item | Why deferred |
| --- | --- |
| CmsPage / CmsSection | Needs editorial workflow; `SeoMetadata` + `Banner` cover launch merchandising |
| Dedicated search index tables | Start with Postgres; projections can be added in Search phase |
| Multi-warehouse transfer entity | Movements support TRANSFER_*; richer transfer docs later |
| Gift cards / store credit | Not in Phase 1 scope |
| Subscriptions | Not in Phase 1 scope |
