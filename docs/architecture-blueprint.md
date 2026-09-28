# EckamCreation — Master Architecture Blueprint

**Status:** Architecture defined. Implementation not started.  
**Date:** 2026-09-18  
**Prerequisite:** Environment foundation is READY (pnpm monorepo, Next.js 16, Prisma prepared, service boundaries stubbed).

This document is the single source of truth for system shape before UI, schema, or provider integration work begins.

---

## 1. Product framing

EckamCreation is a **premium multi-category e-commerce platform** for India and international buyers.

| Capability | Direction |
| --- | --- |
| Commerce | Catalogue, cart, checkout, orders, inventory, returns |
| Markets | India-first + multi-currency international |
| Experience | Cinematic storefront, glass-room visual language, motion, optional 3D |
| Intelligence | ECKAM AI — discovery, NL search, recommendations, Q&A, order/support help |
| Operations | Admin dashboard, CRM, inventory, analytics |
| Comms | Transactional email + WhatsApp Business events |
| Payments | India (UPI, cards, net banking, optional COD) + international cards/gateway |

**Non-goals for early phases:** rebuilding architecture later, hard-coding providers into UI, exposing secrets to the browser, shipping fake catalogue as production truth.

---

## 2. Guiding principles

1. **Apps own UX; packages own capability.** Storefront/admin/api never contain provider SDKs directly.
2. **Server-only secrets.** Anything privileged stays in `apps/api` or Next.js server modules. Never `NEXT_PUBLIC_*` for keys.
3. **Provider isolation.** Payments, email, WhatsApp, AI, and storage are swappable behind interfaces.
4. **India + international as first-class.** Currency, shipping eligibility, tax/GST hooks, and payment methods are domain concepts—not afterthoughts.
5. **Performance by construction.** Code-split 3D/motion; lazy media; CDN assets; Redis for hot reads later.
6. **Security by default.** Validated env (`@eckamcreation/config`), Auth.js sessions, RBAC in admin, webhook signature verification.
7. **Build in slices.** Domain → API contracts → admin ops → storefront → AI/comms → polish. Do not invent UI before contracts.

---

## 3. System context

```text
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  apps/web   │   │ apps/admin  │   │  apps/api   │
│ storefront  │   │ operations  │   │ headless API│
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └────────────┬────┴────┬────────────┘
                    ▼         ▼
            packages/* (domain + adapters)
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
  PostgreSQL      Redis     Object storage/CDN
       │
       └── webhooks → payments / WhatsApp / email / AI providers
```

| Actor | Talks to | Does not talk to |
| --- | --- | --- |
| Customer browser | `apps/web` (+ public CDN assets) | DB, Redis, payment secrets, AI keys |
| Staff browser | `apps/admin` | Payment provider dashboards via raw keys |
| External providers | `apps/api` webhooks | Storefront directly |
| ECKAM AI | Server-side AI package via API | Client-side keys |

---

## 4. Monorepo map (locked)

### Apps

| App | Port (dev) | Responsibility |
| --- | ---: | --- |
| `@eckamcreation/web` | 3000 | Customer storefront, SEO pages, cart UX, AI chat UI shell |
| `@eckamcreation/admin` | 3001 | Catalogue ops, inventory, orders, CRM, analytics |
| `@eckamcreation/api` | 3002 | Public/private HTTP API, webhooks, jobs entrypoints |

### Packages

| Package | Role |
| --- | --- |
| `@eckamcreation/config` | Zod env validation; public vs server-only keys |
| `@eckamcreation/database` | Prisma client + schema (PostgreSQL) |
| `@eckamcreation/auth` | Auth.js / session / RBAC helpers |
| `@eckamcreation/ui` | Shared design-system primitives (tokens later) |
| `@eckamcreation/search` | Keyword + filter + NL search orchestration |
| `@eckamcreation/ai` | ECKAM AI service boundary |
| `@eckamcreation/email` | Transactional email templates + provider adapter |
| `@eckamcreation/whatsapp` | WhatsApp Business event messaging |
| `@eckamcreation/payments` | Payment provider registry (India + international) |
| `@eckamcreation/storage` | Object storage / CDN uploads & URLs |

### Infrastructure / docs / tests

- `infrastructure/` — local Postgres + Redis compose (dev only)
- `docs/` — architecture & runbooks
- `tests/` — Vitest smoke today; Playwright e2e later

**Do not** collapse packages into apps. **Do not** add a fourth app unless a hard isolation need appears (e.g. dedicated worker). Prefer job runners inside `api` first.

---

## 5. Domain model (logical)

Logical entities for the first schema design pass (names are architectural, not final Prisma):

### Catalogue

- `Category`, `Collection`, `Brand`
- `Product`, `ProductVariant` (SKU, price, currency, stock)
- `ProductMedia` (image, video, 360, 3D asset refs)
- `PriceList` / multi-currency price rows

### Commerce

- `Cart`, `CartItem`
- `CheckoutSession`
- `Order`, `OrderItem`, `OrderStatusHistory`
- `PaymentIntent`, `PaymentTransaction`, `Refund`
- `Shipment`, `ShipmentEvent`
- `Return` / `Cancellation`

### Identity & CRM

- `User`, `Account`, `Session` (Auth.js-compatible)
- `Address`, `CustomerProfile`
- `StaffUser`, `Role`, `Permission`
- `SupportTicket` (optional phase 2)

### Ops

- `InventoryReservation`
- `Warehouse` / stock location (phase 2 if needed)
- `AuditLog`
- `NotificationOutbox` (email + WhatsApp events)

### Search / AI

- Search index projection (product denormalized docs)
- `AiConversation`, `AiMessage` (optional persistence)

**Rules**

- Money stored as integer minor units + ISO currency code.
- Product “availability” is derived from stock + reservations, not a free-form string alone.
- Order state machine is authoritative; WhatsApp/email are side effects via outbox.

---

## 6. API architecture

### Style

- REST-ish JSON over App Router route handlers in `apps/api`
- Version prefix: `/v1/...`
- Idempotency keys on payment and order-create endpoints
- Cursor pagination for lists

### Surface groups

| Group | Examples |
| --- | --- |
| Catalogue | products, categories, collections, media |
| Cart / checkout | cart (`/v1/carts`), checkout sessions (`/v1/checkout/sessions`), shipping options on quote |
| Orders | create, get, cancel, track |
| Auth | session, credentials/OAuth callbacks (via Auth.js) |
| Search | keyword query, filters, NL query → search package |
| AI | chat turn, product Q&A (server-mediated) |
| Admin | CRUD + inventory + order ops (RBAC) |
| Webhooks | `/v1/webhooks/payments/*`, `/v1/webhooks/whatsapp` |

### Auth boundaries

- Public: catalogue read, search read
- Customer session: cart, checkout, orders, AI chat
- Guest cart token (`X-Cart-Token`): cart + guest checkout
- Staff session + RBAC: admin APIs
- Provider signatures: webhooks only

### Checkout boundary (Phase 3.6)

`Cart` → `CheckoutSession` + locked `CheckoutItem` prices → address/shipping/coupon → totals (tax/shipping/discount services) → status `PAYMENT` / `paymentStatus=READY_FOR_PAYMENT` → optional `PaymentIntent` (`REQUIRES_PAYMENT`, `provider=pending`).

### Order + shipment boundary (Phase 3.7)

Verified `PaymentIntent.status === SUCCEEDED` → `OrderService.createFromPaidCheckout` (idempotent) → immutable order/item/address snapshots → staff shipments + events. Does **not** call payment or courier providers. Cancellation does **not** auto-refund.

### Payment core (Phase 4.1)

`PaymentService` + `PaymentProviderAdapter` registry in `@eckamcreation/payments`. Checkout totals are the only amount source. Webhooks must verify signatures, record `WebhookEvent` uniquely, then transition intents and call `onPaymentSucceeded` → order create. Test adapter (`test`) is non-production only. No live provider credentials in this phase.

`apps/web` and `apps/admin` may call `apps/api` or use server actions that delegate into packages. Prefer **one write path** into domain packages to avoid divergent business rules.

---

## 7. Auth & authorization

| Concern | Decision |
| --- | --- |
| Library direction | Auth.js-compatible models; Phase 3.2 uses provider-neutral `@eckamcreation/auth` (credentials + sessions) |
| Customer sessions | Database `Session` rows + HttpOnly cookie `eckam_session` |
| Staff sessions | Opaque token + in-memory store (Phase 3.2). Prefer DB/Redis staff sessions before multi-instance prod |
| Customers | Email/password; OAuth later via `Account` |
| Staff | Invite-only `StaffUser`; RBAC via Role/Permission |
| Secrets | `AUTH_SECRET` reserved; password hashes never returned/logged |
| Email verification | Interface only (`EmailVerificationPort`) until email provider phase |

Roles (initial): `admin`, `ops`, `support`, `analyst` (seeded by `ensureRbacCatalog`).

Permission checks use centralized codes (`products.read`, `orders.update`, …) via `requirePermission` — not scattered `role === "ADMIN"` checks.

---

## 8. Payments architecture

`@eckamcreation/payments` is a **registry of providers**, not a single SDK wrapper.

```text
Checkout → PaymentIntent → ProviderAdapter.charge()
                ↓
         webhook → PaymentTransaction → Order status
```

| Region | Methods (target) | Adapter note |
| --- | --- | --- |
| India | UPI, cards, net banking, optional COD | Primary India gateway TBD at integration time |
| International | Cards + international gateway | Separate adapter; multi-currency |

**Rules**

- Never store raw card data; use provider tokens/redirects.
- COD is an order fulfillment mode, not a card charge.
- Refunds go through the same adapter interface.
- Currency conversion policy decided at checkout quote time.

---

## 9. Communications

### Email (`@eckamcreation/email`)

Templates: welcome, verification, order/payment/shipping/delivery, cancel, refund, password reset, cart reminder, review request, admin notify.

Provider: choose later (Resend / SES / etc.). Interface stays stable.

### WhatsApp (`@eckamcreation/whatsapp`)

Events: order/payment/shipping/delivery/cancel/refund/support.

Use approved templates; outbound only via server; respect opt-in.

### Outbox pattern

Domain writes `NotificationOutbox` → worker/API drains → email/WhatsApp adapters. Prevents lost messages on provider downtime.

---

## 10. AI architecture (ECKAM AI)

```text
UI chat → apps/api /v1/ai/* → @eckamcreation/ai
                                  ├─ tools: search, product, order, shipping
                                  ├─ policy: no secrets, grounded answers
                                  └─ provider: interchangeable LLM adapter
```

Capabilities: discovery, NL search, recommendations, comparison, product Q&A, order help, shipping info, support triage.

**Rules**

- AI never receives payment secrets or raw PII beyond need-to-know.
- Product answers must cite catalogue data from search/DB tools.
- Rate-limit per session; log tool calls for audit.

---

## 11. Search architecture

`@eckamcreation/search` owns query planning.

| Mode | Path |
| --- | --- |
| Keyword + filters | Index/DB query (Postgres full-text first; dedicated search engine if scale demands) |
| Natural language | AI interprets → structured filters → same search backend |
| Sort | price, rating, newest, relevance |

Filters: category, price, brand, rating, availability, ship-to country.

Admin mutations update product projections asynchronously (phase 2 if lag appears).

---

## 12. Storage & media

`@eckamcreation/storage` abstracts object storage.

Asset kinds: product images/angles, video, 360, 3D, category banners, collection art.

**Rules**

- Upload via signed URLs (server-minted).
- Public CDN URLs for storefront; private buckets for originals if needed.
- `ProductMedia` stores provider key + CDN URL + kind + sort order—not binary blobs in Postgres.

---

## 13. Caching & performance

| Layer | Use |
| --- | --- |
| Redis | Sessions (optional), rate limits, catalogue hot keys, checkout locks |
| Next.js | RSC, static where safe, `next/image`, dynamic import for Three/motion |
| CDN | Media + static assets |

**Storefront performance budget**

- No Three.js on first paint of catalogue list pages.
- Motion reduced when `prefers-reduced-motion`.
- Product 3D loaded only on PDP with explicit engagement.

---

## 14. UI / design-system architecture

Visual direction (product): premium cinematic, glass-room / glassmorphism, mobile-first.

Technical placement:

- Tokens & primitives → `@eckamcreation/ui`
- App shells & routes → `apps/web`, `apps/admin`
- Tailwind CSS variables for theme; no final palette locked in this blueprint

**Sequence:** tokens → layout primitives → storefront IA → motion → optional 3D.

Do not build homepage before catalogue/checkout contracts exist.

---

## 15. Admin & analytics

Admin modules (phased):

1. Auth + RBAC shell  
2. Catalogue & media  
3. Inventory  
4. Orders & refunds  
5. Customers / CRM  
6. Analytics dashboards  

Analytics: start with first-party order/product events in Postgres; warehouse later if needed.

---

## 16. Security architecture

- Env validation via `@eckamcreation/config`
- CSRF/session protections from Auth.js patterns
- Webhook HMAC verification per provider
- RBAC on every admin mutation
- No secrets in client bundles or git
- Dependency audit before production release
- Least-privilege DB roles in production

---

## 17. Observability (later, planned)

- Structured logs (request id, user id hash, order id)
- Error tracking (Sentry or equivalent)
- Metrics: checkout conversion, payment success, AI latency, webhook failures
- Uptime checks on `/v1` health

---

## 18. Deployment topology (target)

| Component | Target |
| --- | --- |
| `web`, `admin`, `api` | Separate deployments or same platform with path/host routing |
| PostgreSQL | Managed Postgres |
| Redis | Managed Redis |
| Storage | S3-compatible + CDN |
| Jobs | API cron / queue worker (phase 2) |

Environments: `development`, `staging`, `production`. No production credentials in repo.

Local: Docker Compose for Postgres + Redis when Docker is available.

---

## 19. Build phases

| Phase | Outcome | Explicitly out of scope |
| --- | --- | --- |
| **0 — Env** | Done | — |
| **1 — Domain & schema** | Prisma models, migrations, seed strategy | UI, providers |
| **2 — API contracts** | `/v1` catalogue/cart/order stubs + auth | Storefront design |
| **3 — Admin MVP** | Catalogue + inventory + orders ops | Fancy analytics |
| **4 — Storefront MVP** | Browse, PDP, cart, checkout shell | 3D, glass polish |
| **5 — Payments** | India + international adapters + webhooks | Multiple redundant gateways |
| **6 — Comms** | Email + WhatsApp outbox | Marketing blasts |
| **7 — Search + AI** | Filters + NL + ECKAM AI tools | Autonomous purchases |
| **8 — Experience** | Design system, motion, optional 3D | Rewrites |

Each phase ends with: typecheck, lint, tests green; no secrets committed.

---

## 20. Decision log

| Decision | Choice | Rationale |
| --- | --- | --- |
| Monorepo | pnpm workspaces | Shared types, isolated apps |
| Storefront/admin/api | Three Next.js apps | Clear blast radius |
| ORM | Prisma + PostgreSQL | Type-safe schema evolution |
| Cache | Redis | Sessions, rate limits, hot reads |
| Auth | Auth.js direction | Ecosystem fit with Next |
| Payments | Multi-adapter registry | India + international without rewrite |
| AI | Package boundary + tools | Grounded commerce answers |
| Comms | Outbox → email/WhatsApp | Reliability |
| Search | Package + progressive backend | Start Postgres; scale later |
| UI libs | Custom `@eckamcreation/ui` | Brand control; motion/3D optional |

---

## 21. Open decisions (do not block Phase 1)

1. Exact India payment gateway vs international gateway brands  
2. Email vendor  
3. WhatsApp BSP / Meta setup details  
4. LLM vendor for ECKAM AI  
5. Whether customer sessions are JWT or database  
6. Dedicated search engine timing (Meilisearch/Typesense/OpenSearch)  
7. Hosting provider  

Record choices in this file when made.

---

## 22. Immediate next instruction

**Phase 1 — Domain & schema design** (Prisma models only; no UI; no provider credentials).

Await explicit go-ahead before creating schema or UI.
