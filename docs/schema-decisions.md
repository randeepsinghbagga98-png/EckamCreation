# Schema decisions — Phase 1

## ID strategy

**Decision:** `cuid()` string primary keys everywhere (except `Currency.code` ISO PK).  
**Alternatives:** UUID v4, ULID, integer sequences.  
**Why:** Auth.js ecosystem fit, readable in logs, no sequential enumeration of resources.

## Money

**Decision:** `BigInt` minor units + ISO `Currency` table. Tax as integer basis points.  
**Alternatives:** `Decimal`, float, string amounts.  
**Why:** Exact arithmetic; no float error; portable across INR/USD/etc.

## Pricing

**Decision:** Separate `Price` model; no price on `ProductVariant`. Optional `countryId` for market overrides.  
**Alternatives:** JSON price map on variant; PriceList + PriceListEntry.  
**Why:** Queryable, indexable, effective dating, country-specific rows without JSON opacity. PriceList can be layered later if B2B lists appear.

## Auth vs staff

**Decision:** Customer `User` (Auth.js) separate from `StaffUser` + RBAC.  
**Alternatives:** Single User with roles.  
**Why:** Different lifecycles, invite flows, and blast radius; staff can exist without storefront accounts.

## Inventory

**Decision:** `InventoryItem` + `InventoryMovement` ledger; no `stock` int on variant.  
**Alternatives:** Single stock column; event sourcing only.  
**Why:** Multi-location and reservations without rewrite; movements enable audit.

## Orders

**Decision:** Snapshot fields on `Order` / `OrderItem` (+ address JSON snaps).  
**Alternatives:** Always join live product/price.  
**Why:** Legal/historical accuracy; catalogue changes must not rewrite past invoices.

## Payments

**Decision:** Generic `provider` string fields; no Razorpay/Stripe-specific tables.  
**Alternatives:** Per-provider models.  
**Why:** Matches payments package registry architecture; avoids schema churn per vendor.

## Webhooks / idempotency

**Decision:** `WebhookEvent` unique `(provider, eventId)`; `IdempotencyRecord` unique `(scope, key)`.  
**Why:** Duplicate delivery and retried POSTs must not double-charge or double-create orders.

## Cart merge

**Decision:** Cart has `guestToken`, optional `userId`, `mergedIntoId`, status `MERGED`.  
**Why:** Supports anonymous → authenticated merge without deleting audit of guest cart.

## CheckoutItem

**Decision:** Explicit `CheckoutItem` with locked unit prices, not only cart lines.  
**Why:** Checkout totals must freeze while payment is in flight even if cart edits race.

## Consent

**Decision:** Append-only `CustomerConsent` history + `NotificationPreference` projection.  
**Alternatives:** Preferences only.  
**Why:** Compliance needs who/when/source; preferences optimize reads.

## AI

**Decision:** Persist conversations, messages, tool calls with redaction rules in app layer.  
**Why:** Auditable ECKAM AI; debugging; no secrets in DB by policy.

## CMS

**Decision:** Include `SeoMetadata` + `Banner`; defer `CmsPage` / `CmsSection`.  
**Why:** Enough for launch SEO and hero merchandising; full CMS is a product of its own.

## Soft delete

**Decision:** `deletedAt` on User, Category, Brand, Collection, Product, ProductVariant.  
**Why:** Catalogue recovery and audit; hard delete still cascades where Auth.js accounts require it.

## ShippingZone ↔ Country

**Decision:** Explicit `ShippingZoneCountry` join (not implicit Prisma M2M alone).  
**Why:** Clear indexing and future zone metadata on the join if needed.

## Open follow-ups (non-blocking)

1. Whether `PaymentIntent.orderId` is required before provider redirect (app flow).  
2. Whether guest checkout creates a User immediately or only on account creation.  
3. Exact seed set for Currency/Country/TaxRule for India launch.
