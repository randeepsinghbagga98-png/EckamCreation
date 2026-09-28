# Phase 1 — Schema Plan

Concise plan before Prisma implementation. Full narrative: `domain-model.md` / `schema-decisions.md`.

## Conventions

| Concern | Choice |
| --- | --- |
| IDs | `cuid()` strings |
| Money | `BigInt` minor units + `currencyCode` (ISO 4217) |
| Time | `DateTime` UTC via Prisma |
| Soft delete | `deletedAt` on catalogue + user where useful |
| Auth | Auth.js-compatible `User` / `Account` / `Session` / `VerificationToken` |

## Models

### Identity
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| User | Customer auth identity | email, emailVerified, name, image, deletedAt | Account[], Session[], CustomerProfile?, carts, orders… |
| Account | OAuth/credentials link | provider, providerAccountId, tokens | → User |
| Session | Auth.js session | sessionToken, expires | → User |
| VerificationToken | Email verify / magic | identifier, token, expires | — |
| CustomerProfile | CRM profile | phone, locale, defaultCurrencyCode, defaultCountryId | → User, → Country? |
| Address | Shipping/billing | line1–2, city, postal, type | → User?, → Country, → Region? |

### Admin / RBAC
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| StaffUser | Admin operator | email, name, status, passwordHash? | roles, auditLogs, tickets |
| Role | Named role | code, name | permissions, staff |
| Permission | Capability key | code, resource, action | roles |
| RolePermission | M2M | — | Role ↔ Permission |
| StaffUserRole | M2M | — | StaffUser ↔ Role |
| AuditLog | Immutable ops trail | action, entityType, entityId, metadata | → StaffUser? |

### Geography & money config
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| Currency | ISO currencies | code PK, name, minorUnits, isActive | prices, orders… |
| Country | Markets | iso2 PK, iso3, name, defaultCurrencyCode, isActive | regions, tax, shipping |
| Region | Subnational zone | code, name | → Country |

### Tax
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| TaxRule | When tax applies | name, countryId?, regionId?, priority | rates |
| TaxRate | Rate value | rateBps (basis points), taxCode, inclusive | → TaxRule |

### Catalogue
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| Category | Hierarchy | slug, name, parentId, path | parent/children, products |
| Brand | Brand | slug, name | products |
| Collection | Merch grouping | slug, name | products M2M |
| CollectionProduct | M2M | position | Collection ↔ Product |
| Product | Sellable parent | slug, status, brandId | variants, media, categories |
| ProductCategory | M2M + primary flag | isPrimary | Product ↔ Category |
| ProductVariant | SKU | sku, barcode, isDefault | prices, inventory, cart items |
| ProductAttribute | Attr definition | code, name | values |
| ProductAttributeValue | Attr option | value | → Attribute; variants M2M |
| VariantAttributeValue | M2M | — | Variant ↔ AttributeValue |
| ProductMedia | CDN refs | kind, url, storageKey, sort | → Product, → Variant? |
| ProductTag | Tag | slug | products M2M |
| ProductTagAssignment | M2M | — | Product ↔ Tag |
| Price | Variant price row | amountMinor, compareAtMinor, currencyCode, countryId?, startsAt, endsAt, isActive | → Variant, → Currency, → Country? |
| ProductMarketAvailability | Sell-to country | isAvailable | Product ↔ Country |

### Inventory
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| InventoryLocation | Warehouse/store | code, name, countryId? | items |
| InventoryItem | Stock per SKU/location | onHand, reserved | → Variant, → Location |
| InventoryMovement | Ledger | type, quantityDelta, reason | → Item, → StaffUser? |

### Cart / wishlist / checkout
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| Cart | Guest or user cart | guestToken?, userId?, currencyCode, expiresAt | items, checkout? |
| CartItem | Line | quantity, unitPriceMinor snapshot optional | → Cart, → Variant |
| Wishlist | User list | name | → User, items |
| WishlistItem | Wish line | — | → Wishlist, → Variant |
| CheckoutSession | Pre-order | status, addresses, shippingMethodId, totals, expiresAt | → Cart, → User?, → Order? |

### Orders / payments / shipping
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| Order | Immutable commerce record | number, status, currency, total snapshots | items, payments, shipments |
| OrderItem | Line snapshot | name, sku, unitPriceMinor, taxMinor… | → Order, → Variant? |
| OrderStatusHistory | Status trail | from, to, note | → Order, → StaffUser? |
| PaymentIntent | Charge attempt | provider, amountMinor, status | → Order?, transactions |
| PaymentTransaction | Provider event | providerRef, status, rawMetadata safe | → Intent |
| Refund | Money back | amountMinor, status, providerRef | → Intent/Order |
| ShippingZone | Zone | name | countries, methods |
| ShippingZoneCountry | M2M | — | Zone ↔ Country |
| ShippingMethod | Carrier option | code, name | rates, zone |
| ShippingRate | Price rule | amountMinor, currencyCode, min/max weight/subtotal | → Method |
| Shipment | Fulfillment | trackingNumber, carrier, status | → Order, events |
| ShipmentEvent | Tracking events | status, occurredAt | → Shipment |

### Returns / cancels / promos / reviews
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| Cancellation | Order cancel | reason, status | → Order |
| ReturnRequest | RMA | status | → Order, items |
| ReturnItem | RMA line | quantity, reason | → Return, → OrderItem |
| Coupon | Code | code, promotionId | → Promotion |
| Promotion | Campaign | type, value, windows, limits | rules, usages |
| PromotionRule | Rule JSON-lite | ruleType, targetType, targetId?, minOrderMinor | → Promotion |
| PromotionUsage | Redemption | — | → Promotion, → User?, → Order? |
| Review | Product review | rating, title, body, status | → Product, → User, → OrderItem? |

### CRM / AI / comms / infra
| Model | Purpose | Key fields | Relations |
| --- | --- | --- | --- |
| SupportTicket | Case | status, subject | → User?, → Order?, messages |
| SupportMessage | Thread | body, authorType | → Ticket, → User?/Staff? |
| AiConversation | Chat session | channel, userId? | messages, toolCalls |
| AiMessage | Turn | role, content | → Conversation |
| AiToolCall | Auditable tool use | name, argsJson, resultSummary | → Conversation, → Message? |
| Notification | In-app/event | channel, type, status | → User? |
| NotificationPreference | Channel prefs | email/whatsapp/push flags | → User |
| NotificationOutbox | Reliable send queue | channel, payload, status | attempts |
| NotificationAttempt | Send try | status, error | → Outbox |
| EmailTemplate | Template registry | code, subject | logs |
| EmailLog | Sent email | to, status, providerRef | → User?, → Template? |
| WhatsAppTemplate | WA template | code, providerName | logs |
| WhatsAppLog | Sent WA | to, status, providerRef | → User?, → Template? |
| CustomerConsent | Opt-in history | type, status, source, capturedAt | → User |
| WebhookEvent | Inbound webhook | provider, eventId, payloadHash, status | — |
| IdempotencyRecord | API/webhook dedupe | key, scope, responseHash | — |
| AnalyticsEvent | Minimal ops events | name, propsJson | — |

### SEO / CMS (Phase 1 light)
| Model | Purpose | Notes |
| --- | --- | --- |
| SeoMetadata | Polymorphic SEO | entityType + entityId + title/description/canonical |
| Banner | Merch banner | title, imageUrl, link, schedule, placement |
| CmsPage / CmsSection | **Deferred** | Need content workflow; SeoMetadata + Banner cover launch |

## Explicit non-goals in schema

- No raw card/CVV fields
- No binary media blobs
- No hard-coded INR/USD/GST in Product
- No provider-specific payment tables (provider is a string + refs on Payment*)
