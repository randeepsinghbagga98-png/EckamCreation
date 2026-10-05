# Eckam pre-deployment blocker fix report

Mode: **FULL** (browser automation available). DB gate: **LOCAL** (`DATABASE_URL` host classified localhost:5432; value not printed).  
Production `next start` verified: web **Y** (`http://127.0.0.1:3050`) · admin **Y** (`http://127.0.0.1:3003`). Dev remained on 3047 / 3001 / 3002.  
Versions: Node 24.18.0 · pnpm 11.20.0 · Next 16.3.4 · Prisma 6.19.3.  
Deployed / payment configured / AI key added / DB reset: **NO / NO / NO / NO**.

## Decision

**FINAL DECISION: GO FOR DEPLOYMENT**

Rule applied: zero open P0/P1; F-P0-TC-001 and all four P2s fixed with [MEASURED]/[OBSERVED] evidence; typecheck, lint, tests (208/208 on the clean rerun), and admin/web production builds passed with no new failures; security-after vs baseline result IDs are identical (18/18 PASS); no secret values in client bundles; checkout browser flow left the skeleton. Intentional product limitations (provider, AI, courier, email, draft legal, Redis) remain, with honest UI.

A first `pnpm test` in this session failed 5 tests with `Can't reach database server at localhost:5432` while typecheck/lint/build were saturating the machine. Immediate rerun: **208 passed / 0 failed**. Those failures are treated as load flake, not a code regression from this pass.

## F-P0-TC-001 — admin TS18047

**Root cause [INFERRED]:** `AdminShell` stored `StaffSession | null` and rendered `session.name` / `session.email` after `if (!ready && !session)`, which does not narrow `session` when `ready` is true.  
**Fix:** `if (!ready || !session)` so staff name/email chrome renders only after a valid session. Loading chrome (confirming session) is unchanged. Middleware / RBAC / auth hook untouched.

- Before: `pnpm --filter @eckamcreation/admin typecheck` FAIL TS18047 on `admin-shell.tsx` name/email.  
- After: admin typecheck **PASS** [MEASURED]; admin `next build` **PASS** (15 routes) [MEASURED].  
- Unauthenticated `/admin` production: **307** `/admin/login` [MEASURED]. Login HTML has no staff name/email [MEASURED].  
- Valid staff name/email on the dashboard: **[NOT VERIFIED]** in the browser (credentials not typed). Display path is unchanged for a non-null session [INFERRED].  
- Staff logout replay: **200 auth=false** [MEASURED] (security-after).

## P2-1 — `/checkout` skeleton

**Root cause [INFERRED]:** `useSyncExternalStore(() => () => {}, () => true, () => false)` never notified, so `hydrated` stayed false and the page never left `CheckoutSkeleton`. The cart page had no such gate.  
**Fix:** `useSyncExternalStore` with a one-shot `setTimeout(0)` subscribe so the client snapshot becomes true after mount (lint-clean; no `setState` in `useEffect`). Empty and error terminals already existed.

**Reproduction after [OBSERVED] on `http://127.0.0.1:3050`:**
- Empty cart → “YOUR CART IS EMPTY.” (not a skeleton).  
- Add Tan Carryall → client-nav cart (1 item, ₹2,999) → Proceed to checkout → form + order summary, subtotal ₹2,999 INR from the server cart.  
- Honest copy: “Payment will be available once checkout and payment services are connected.”  
- `POST /v1/checkout/sessions` **201** `paymentReady=false` [MEASURED].  
- `POST .../complete` without a ready session **400** [MEASURED] (security-after).  
- After a filled address, complete returned **200** and a `REQUIRES_PAYMENT` intent was created [OBSERVED]. No “order confirmed” UI. `ALLOW_TEST_PAYMENT_PROVIDER=UNSET` [MEASURED]. This pass did not enable a provider or fake paid success.  
- Full document reload drops the in-memory guest cart token [OBSERVED] — existing `identity.ts` contract, not changed.  
- Authenticated browser checkout: **[NOT VERIFIED]**. Customer register/login via API in the security probe **PASS**.

## P2-2 — favicon

No `.ico` asset exists. `metadata.icons` points at `/icon.svg`. `next.config.ts` rewrites `/favicon.ico` → `/icon.svg` (web and admin; same one-line cause).

- Web `/favicon.ico` **200** `image/svg+xml` [MEASURED]  
- Web `/icon.svg` **200** `image/svg+xml` [MEASURED]  
- Admin `/favicon.ico` **200** `image/svg+xml` after the same rewrite [MEASURED]  
- Admin `/icon.svg` **200** [MEASURED]

Limitation: the bytes are SVG, not a true ICO. No new art or dependencies.

## P2-3 — invalid slugs → HTTP 404

**Root cause [INFERRED]:** `notFound()` ran under `loading.tsx` streaming, so Next 16 committed **200** (docs: streamed not-found stays 200). API already returned 404 for unknown products [MEASURED].  
**Fix:** `apps/web/src/proxy.ts` looks up the catalogue **before** the page streams. Only API **404** (or a reserved missing slug) becomes an HTTP 404 wrapping the existing `ProductNotFound` / `CollectionNotFound` UI. Editorial collection slugs stay present without an API hit. Non-404 API results call `NextResponse.next()` so failures are not turned into 404. `getCatalogueProduct` rethrows non-404. Collection `notFound()` + `not-found.tsx` kept as a second line. `generateMetadata` sets `robots: noindex` when missing.

**Tradeoff:** one extra existence GET in proxy (and a short self-fetch of `/shop/eckam-missing` or `/collections/eckam-missing`). First-hit lookup uses a 10s timeout and one retry so a cold proxy fetch is not misclassified as an error (a 4s timeout produced a one-off 200 during load).

| Check | Result | Evidence |
| --- | --- | --- |
| Published product slugs | **11/11 200** | [MEASURED] catalogue list |
| Invalid products (unknown, encoded space, 80-char, `%3Cscript%3E`) | **404** | [MEASURED] |
| Editorial collections | **8/8 200** | [MEASURED] (API collection list was empty) |
| Invalid collections | **404** | [MEASURED] |
| API unknown product | **404** | [MEASURED] |
| API down / non-404 during lookup | must not become 404 | **[INFERRED]** `lookup === 'error' → next()`; page throws → `error.tsx` |

## P2-4 — SEO localhost fallback

Single helper: `apps/web/src/lib/site-url.ts`.  
- Env set → trimmed origin, no trailing slash.  
- Unset + not production → `http://localhost:3000` (dev keeps working).  
- Unset + `NODE_ENV=production` → `null` + `console.warn` naming `NEXT_PUBLIC_APP_URL`; sitemap empty; robots omits sitemap; `metadataBase` omitted. Chose omit-over-throw so local `pnpm build` still works.

| Mode | Result | Evidence |
| --- | --- | --- |
| Dev 3047, env unset | localhost in sitemap, 9 locs | [MEASURED] |
| Prod build, env unset | warn at build; sitemap locs **0**; no localhost | [MEASURED] |
| Prod build `NEXT_PUBLIC_APP_URL=https://example.invalid` (process env only, not written to `.env*`) | 9 locs all `https://example.invalid`; robots sitemap field set; home HTML contains that host; no localhost | [MEASURED] |
| Sitemap paths `/ /about /contact /privacy /terms /refund-policy /shop /search /collections` | **9/9 200** | [MEASURED] |
| admin / cart / checkout / account in sitemap | **absent** | [MEASURED] |

Admin does not share this URL helper (noindex staff app) [INFERRED].

## DATA-1 — `ai_*` users

Gate **LOCAL**. Inspect found **63** leftover users matching `ai_*@example.com`, all `orders=0` (not 9). IDs and counts: `docs/blocker-fixes/evidence/data1-users.json` (emails redacted to patterns; no hashes).  
Tests create `ai_a_`, `ai_b_`, `ai_com_*`, `ai_ord_*`, `ai_tools_`, `ai_hard_*` on `@example.com`. `afterAll` deletes AI conversations, **not users**. **No reusable cleanup helper/script/endpoint.**  
Condition (e) fails → **LEFT IN PLACE 63**. No SQL delete.

## Gates vs Phase 0

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | PASS [MEASURED] |
| `pnpm lint` | PASS (admin pre-existing font warning only) [MEASURED] |
| `pnpm test` | PASS 208/208 after flake rerun; first run 5 failed on DB unreachable [MEASURED] |
| `pnpm --filter @eckamcreation/web build` | PASS [MEASURED] |
| `pnpm --filter @eckamcreation/admin typecheck` | PASS [MEASURED] |
| `pnpm --filter @eckamcreation/admin build` | PASS [MEASURED] |

## Security regression

`security-baseline.md` vs `security-after.md`: **EMPTY** (same 18 IDs, all PASS). Probe prefixes differ (`qa-fix-202610050453` vs `qa-fix-202610050534`); those users were left in place (no delete helper). Cookie **values** not printed. Flags: httpOnly + SameSite=Lax.

## Secrets

`ALLOW_TEST_PAYMENT_PROVIDER=UNSET`, `NEXT_PUBLIC_APP_URL=UNSET` in `.env` load, `AI_API_KEY=UNSET` [MEASURED status].  
Client bundles: no `postgresql://`, `sk-proj-`, `AI_API_KEY=`, `DATABASE_URL=`, `ADMIN_PASSWORD=` [MEASURED]. A client **redaction regex** mentions `AI_API_KEY` / `sk-` as patterns, not values. `.env*` not staged (`.gitignore` covers `.env` / `.env.*`).

## Files changed (blocker map)

New dependencies: **NONE** (no `package.json` / lockfile edits).

| File | Blocker |
| --- | --- |
| `apps/admin/src/components/admin-shell.tsx` | F-P0-TC-001 |
| `apps/admin/next.config.ts` | P2-2 (same favicon rewrite) |
| `apps/web/src/components/checkout/checkout-view.tsx` | P2-1 |
| `apps/web/next.config.ts` | P2-2 |
| `apps/web/src/app/layout.tsx` | P2-2, P2-4 |
| `apps/web/src/lib/site-url.ts` | P2-4 |
| `apps/web/src/app/sitemap.ts` | P2-4 |
| `apps/web/src/app/robots.ts` | P2-4 |
| `apps/web/src/lib/catalogue/api.ts` | P2-3 |
| `apps/web/src/app/shop/[slug]/page.tsx` | P2-3 |
| `apps/web/src/app/collections/[slug]/page.tsx` | P2-3 |
| `apps/web/src/app/collections/[slug]/not-found.tsx` | P2-3 |
| `apps/web/src/proxy.ts` | P2-3 |
| `apps/web/src/app/shop/eckam-missing/page.tsx` | P2-3 |
| `apps/web/src/app/collections/eckam-missing/page.tsx` | P2-3 |
| `docs/blocker-fixes/**` | evidence |

Not committed (pre-existing dirty, out of scope): `account-login-form.tsx`, `account-signup-form.tsx`, `session.ts`, `docs/prelaunch-scan/`, `organized_products/`.

## New findings (not fixed)

| Severity | Finding | Evidence |
| --- | --- | --- |
| P3 | Guest cart identity is in-memory; full reload starts an empty cart | [OBSERVED] `identity.ts` contract |
| P3 | First unknown-slug request can return 200 if the proxy catalogue fetch times out | [MEASURED] 4254ms/200 during load; warm 404. Retry/10s added |
| P3 | `/shop/eckam-missing` is a reserved 404 shell | [MEASURED] |
| P3 | Cart/checkout `robots` still `index, follow` in root metadata | [INFERRED] prelaunch S18 |
| P3 | Account `next=` open-redirect findings from the scan | [MEASURED] earlier scan, not in this scope |
| P3 | 63 `ai_*` leftovers (scan said 9) and `qa-fix-*` probe users left in the LOCAL DB | [MEASURED] |
| P3 | Admin `middleware.ts` deprecation warning (proxy rename) | [MEASURED] build log |
| P3 | After address+shipping, complete can create a `REQUIRES_PAYMENT` intent even with `ALLOW_TEST_PAYMENT_PROVIDER=UNSET` | [OBSERVED] honest UI, no paid order |

## Remaining counts

- Remaining P0: **0**  
- Remaining P1: **0**  
- Remaining P2: **0** (listed blockers)  
- Remaining P3: **7** (table above)  

Intentional limitations: payment provider for a paid order, AI provider, courier, email delivery, draft legal pages, Redis/shared sessions.

**NOT VERIFIED:** staff dashboard name/email in a real browser login; authenticated customer checkout in the browser; HTTP status when the catalogue API is down during a slug lookup.
