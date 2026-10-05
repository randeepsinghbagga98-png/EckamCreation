Mode: FULL   DB gate: LOCAL

ECKAM CREATION — FINAL PRE-DEPLOYMENT SCAN
OVERALL: NO-GO
Decision rule applied: NO-GO / DO NOT DEPLOY if ANY open P0, or build/typecheck failing. Admin typecheck and admin production build fail TS18047 (F-P0-TC-001). Security suites that were required were measured (auth/session/IDOR/RBAC/server-authority/secrets) and did not independently force this NO-GO.
Mode: FULL   DB gate: LOCAL   Services in production mode: web N | admin N | api N
P0: 1   P1: 0   P2: 6   P3: 4

CUSTOMER:  Signup PASS | Login PASS | Logout PASS | Account PASS | Wishlist PASS | Address PASS | Order NOT VERIFIED | IDOR PASS
SHOPPING:  Homepage PASS | Shop PASS | Search PASS | Collections PASS | PDP PASS | Cart PASS | Checkout FAIL
ADMIN:     Login PASS | Dashboard PASS | Products PASS | Categories PASS | Orders PASS | Customers PASS | Payments PASS | Shipments PASS | Settings PASS | AI PASS | Logout PASS | RBAC PASS
ROUTES:    Total checked 40+ static/admin + 11 PDPs + 8 categories + 8 collections | 404 0 (invalid slugs returned 200) | 500 0 | Redirect issues 0 | Broken internal links 0 (localhost:3000 canonical is SEO, not a nav href)
API:       Endpoints checked 96 | Unexpected 4xx 0 | Unexpected 5xx 1 (POST /v1/webhooks/payments/[provider] 503, no leak; payment unconfigured) | Security issues 0 measured bypasses
RESPONSIVE: 1440 PASS | 1280 PASS | 1024 PASS | 768 PASS | 430 PASS | 390 PASS | 375 PASS | Overflow issues 0 / 63 cells
ASSETS:    Broken images 0 confirmed (truncated /_next/image scanner hits were false; full next/image sample 200; unsplash 200) | Broken static assets favicon.ico 404 (icon.svg 200)
CONSOLE (production mode): Errors NOT VERIFIED | Hydration errors NOT VERIFIED | Failed requests NOT VERIFIED   (dev-only: Next.js Dev Tools overlay on admin login and checkout; checkout stayed on skeleton in one browser tab)
SEO: FAIL   BUILD: FAIL   TYPECHECK: FAIL   LINT: PASS
TESTS: Passed 208 | Failed 0 | Pre-existing 0 | New 0
DATABASE: Migration required NO | Seed required NO | Data preserved YES (catalogue 11/8, orders 0) | QA records cleaned 0 leftover qa-scan- ; vitest left 9 non-prefix users (see F-S17-001)
SECRETS: PASS   PAYMENT SAFETY: PASS   AI SAFETY: PASS
ENV NAMES required in production (names only): NODE_ENV, DATABASE_URL, API_INTERNAL_URL, CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME
REAL BLOCKERS: F-P0-TC-001 Admin typecheck/build failure (TS18047 admin-shell.tsx)
KNOWN NON-BLOCKING LIMITATIONS: Payment provider unconfigured (UI/API honest: paymentReady=false, intent 400, complete 400, admin notice "Payment provider is not configured.") Y; AI provider unconfigured (admin page states not configured; no keys in payload) Y; courier not configured (admin shipments empty copy) Y; email/newsletter delivery not configured (footer signup present; no fake delivery claim observed) Y; legal docs are drafts Y; Redis/shared sessions not configured (MemoryStaffSessionStore; health cache reason redis-not-configured) Y
NOT VERIFIED: Production-mode browser console/hydration (services are next dev); production Secure cookie flag at runtime (dev measured Secure=false; code sets Secure when NODE_ENV=production [INFERRED]); paid order E2E (payment unconfigured by design); staff UI of payments/AI/shipments in an authenticated browser session (API JSON + source copy used); Lighthouse/axe not installed; full link crawl of every footer hash target as a standalone route.
Files modified outside docs/prelaunch-scan/: NONE by this scan (working tree already had uncommitted admin-shell.tsx + 3 web auth files from the earlier repair pass; not reverted)
Deployed / payment configured / AI key added / DB reset: NO / NO / NO / NO
FINAL DECISION: DO NOT DEPLOY
Report: docs/prelaunch-scan/REPORT.md

---

## Phase 0 — Preflight [MEASURED]

- DB gate: LOCAL. DATABASE_URL host classified localhost:5432 without printing the URL. Write tests allowed.
- QA prefix: `qa-scan-202610050940`. Passwords generated in memory only. Cleanup deleted the two QA customers created by the core scan. Analyst staff created for RBAC was deleted. qa-scan leftover: 0.
- Snapshot before core scan: products 11, categories 8, customers 67, orders 0, staff 1, addresses 5.
- After core QA cleanup: products 11, categories 8, customers 67, orders 0.
- After `pnpm test` (this scan): products 11, categories 8, customers 76, orders 0, staff 1. Extra rows are vitest `ai_*` users, not qa-scan- (F-S17-001).
- Versions: Node v24.18.0 · pnpm 11.20.0 · Next 16.3.4 · Prisma 6.19.3.
- Tooling: Cursor browser MCP available (Mode FULL). Playwright Chromium was missing earlier; responsive used msedge. curl/fetch used. Lighthouse/axe not installed (not used).
- Health: web http://localhost:3047 → 200; admin http://localhost:3001/admin/login → 200; API http://127.0.0.1:3002/v1/health → 200. All three are `next dev` (Dev Tools overlay OBSERVED). Production `next start` runtime was not substituted onto these ports.

## Phase 1 — Production-mode baseline [MEASURED]

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS (already up to date) | prior command this session |
| typecheck web | PASS | `pnpm --filter @eckamcreation/web typecheck` |
| typecheck admin | FAIL TS18047 | admin-shell.tsx:137,143 |
| typecheck api | PASS | `pnpm --filter @eckamcreation/api typecheck` |
| lint web | PASS | eslint 0 problems |
| lint admin | PASS with warning | `@next/next/no-page-custom-font` layout.tsx:24 |
| lint api | PASS | eslint 0 problems |
| tests | PASS 208/208 | `pnpm test` via env-loading wrapper, 45.9s |
| build web | PASS | next build, 33 routes |
| build admin | FAIL | Failed to type check, same TS18047 |
| build api | PASS | next build, 43 routes + proxy |
| root `pnpm build` | FAIL | first-fail on admin |

Failing area (admin-shell.tsx) is existing source on this branch; classified as current-tree defect, not introduced by this read-only scan.

Dev-only (excluded from blockers): Next.js Dev Tools overlay; HMR; checkout skeleton while overlay present.

## Phase 2 — Inventories

See `routes.json` and `api-endpoints.json` (96 method+path rows from `apps/api/src/app/**/route.ts`).

Expected web routes all present. Extras: `/account/login`, `/account/signup`, `/account/profile`, `/account/addresses`, `/account/wishlist`, `/account/orders`, `/account/orders/[id]`. `/login` and `/signup` 307 to account equivalents.

Expected admin routes all present. Unauth admin pages 307 → `/admin/login` except login itself 200.

Published product slugs tested (all 11): artisan-decorative-tray, botanical-gift-box, linen-accent-cushion, minimal-pendant-necklace, pearl-drop-earrings, porcelain-table-setting, daily-ritual-care, everyday-tailored-layer, tan-carryall, noir-compact-bag, cream-structured-tote.

Category slugs tested (all 8). Collection slugs tested: everyday-edit, signature-accessories, home-objects, kitchen-essentials, gifting-edit, craft-soul, style-edit, the-new-edit.

Open-redirect: `?next=https://evil.example` and `//evil.example` returned 200 with evil.example substring in HTML, but `evilHrefs=[]` and `nextInForm=false` on inspection. Treated as PASS (false positive withdrawn). `/\evil.example` leaked=false.

## Suites (summary)

**S1** Primary routes 200. Invalid product/collection 200 (P2). No 500. No redirect loops.

**S2** Internal nav links <400. Canonical `http://localhost:3000` is not a live origin here (status 0) — counted as SEO F-S18-001, not a broken shop link.

**S3** Two QA customers registered 201. Session and /v1/me 200, bodies unsafe=false. Address create 201. Logout 200, replay 401. Login 200. Wrong password and unknown email both 401 UNAUTHORIZED (no enumeration). Duplicate 409. Weak password 400. [MEASURED]

**S4** Customer and staff Set-Cookie: httpOnly=true, SameSite=lax, Path=/, Secure=false in dev (expected). No hashes/tokens in JSON. Staff cookie on /v1/me → 401. Customer cookie on admin APIs → 401. Logout replay 401. localStorage/sessionStorage token check [NOT VERIFIED] in production; no token-like keys observed in account/cart snapshots.

**S5** Cart add ignored poisoned price (server subtotal SET). qty 0 and negative → 400. Search empty 200 n=0. Long query 400. Negative page 400. Unpublished purchase [INFERRED] via existing tests; live unpublished add [NOT VERIFIED] (no unpublished public slug).

**S6** Checkout session 201 paymentReady=false. Payment intent 400 VALIDATION_ERROR. Complete 400. No paid order. ALLOW_TEST_PAYMENT_PROVIDER UNSET. Code registers test adapter only when allow-test and not production [INFERRED]. Empty-cart HTTP copy honest; browser checkout skeleton F-S6-001 (P2, dev_only).

**S7** Authed wishlist add 201, get 200. Guest add 401. B cannot see A's item.

**S8** A GET B address 405 leak=false. A PATCH B address 404. A list excludes B. B cannot read A's checkout 404. Order guess 404. Two QA customers created.

**S9** Unauth admin pages redirect. Staff GET dashboard/products/categories/orders/customers/payments/shipments/settings/ai/status all 200 unsafe=false. Staff logout 200, replay 401. Admin login OBSERVED: "Staff sign in" / "Admin access is separate from customer accounts." Authenticated admin page UI [INFERRED] from source + API: revenue "—", payment/AI/shipment notices present in source.

**S10** Unauth admin APIs 401. Customer cookie 401. Analyst staff (QA-prefixed, cleaned) POST /v1/admin/products → 403; GET → 200. requirePermission is server-side. [MEASURED]

**S11** 96 endpoints inventoried. Unauth sweep: 95 PASS, 1 FAIL webhook POST 503 no leak (unconfigured provider). Wrong method PUT samples 405/401. POST /v1/health 405.

**S12** Malformed JSON 400 stack=false. Unlisted origin ACAO none. Allowed-origin health 200. Wrong content-type login 4xx no leak. Oversized-ish login 4xx. Invalid product id 404/400. CSRF posture: cookie auth + SameSite=lax + CORS origin allowlist (production defaults to empty list if CORS_ORIGINS unset). No CSRF token.

**S13** Meaningful images had alt in scanned HTML (homepage 21 present / 0 missing). next/image full URL 200. favicon.ico 404 (P3).

**S14** 0 overflow across 7 viewports × primary routes (63 cells). [MEASURED]

**S15** Production console [NOT VERIFIED] (dev servers). Dev-only: Next Dev Tools button/overlay.

**S16** `.env*` not tracked (`git ls-files` only `.env.example`; `.env.local` gitignored). NEXT_PUBLIC_* in code: APP_URL, APP_NAME only — no secrets. ALLOW_TEST_PAYMENT_PROVIDER UNSET. Payment/AI keys UNSET. AUTH_SECRET UNSET on this machine (required in prod). No secret-name matches in `apps/web/.next/static` JS. Admin client bundle not produced (build failed). Documented but unread by code: AUTH_URL, REDIS_URL, EMAIL_*, WHATSAPP_*, STORAGE_*, PAYMENT_PROVIDER (name only). Code also reads AI_*, PAYMENT_* secrets (redaction list), API_JSON_BODY_LIMIT_BYTES, NEXT_RUNTIME, NEXT_PHASE, CI.

**S17** prisma migrate status: 1 migration, schema up to date, localhost:5432. Seed not required (catalogue present). qa-scan leftover 0. Vitest leftovers listed in F-S17-001.

**S18** Public titles/H1 present on home/about/contact/shop/collections. Checkout SSR h1=0. Sitemap localhost. Robots.txt disallows private paths. OG image empty on scanned pages.

## Decision

NO-GO / DO NOT DEPLOY. Rule: open P0 or failing typecheck/build. Fix F-P0-TC-001, re-run admin typecheck and `next build`, then re-scan admin build and production-mode console. Remaining P2s are launch polish, not this decision's trigger.
