# QA matrix

Evidence-backed checks. Status values: PASS | FAIL | LIMITATION | NOT VERIFIED.

## Phase 0 health

| Check | Result | Evidence |
| --- | --- | --- |
| DB host class | LOCAL | [MEASURED] node host classifier on `.env.local` |
| Baseline commit | `a5ccd3a` | [MEASURED] git log |
| Secrets staged | none except `.env.example` | [MEASURED] `git diff --cached --name-only` |
| API `:3002/v1/health` | 200 | [MEASURED] Invoke-WebRequest |
| Admin `:3001/admin/login` | 200 | [MEASURED] |
| Web configured `:3000` | down | [MEASURED] |
| Web lock `:3047` | 200 after restart | [MEASURED] |

## Batch A — Security

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| A1 | Auth cookies httpOnly / SameSite / Secure-in-prod | PASS (dev Secure=false) | [MEASURED] register Set-Cookie `httponly=true samesite=lax secure=false`. [INFERRED] Secure when `NODE_ENV===production` in `sessionCookieOptions` |
| A2 | IDOR two-customer ownership | PARTIAL | [MEASURED] two `qa-*` accounts registered; `/v1/me` for A returned A. Address create for B 400 (invalid country id). Customer A on `/v1/me/orders` 200 count=0. Deep order/address IDOR not fully exercised |
| A3 | Body-supplied identity ignored | PASS | [MEASURED] cart POST with userId/role/price/paymentStatus → 404 unknown variant, no stack/prisma leak |
| A4 | Admin separation + logout | PARTIAL | [MEASURED] customer cookie on `/v1/admin/dashboard` → 401; unauth admin API 401. Staff login 401 with short/wrong password, no cookie. Logout replay [NOT VERIFIED]. Admin UI redirect after middleware move [NOT VERIFIED] |
| A5 | Validation / limits | PASS | [MEASURED] negative qty 400; SQL-ish catalogue query 200 leaked=false |
| A6 | CORS | PASS | [MEASURED] evil origin NONE; localhost:3000 reflected; credentials true |
| A7 | Rate limits + audit logs | LIMITATION | [INFERRED] in-memory auth limiter; AI limits in Postgres. Audit writes in services. Not live-counted |
| A8 | Bootstrap admin from env only | LIMITATION | [INFERRED] no hardcoded staff password in app source. Local bootstrap skipped when password length < 8 |
| A9 | Secrets in bundles | PASS | [MEASURED] web `.next` grep of secret names: no matches |
| A10 | AI hardening | PASS / LIMITATION | [MEASURED] `POST /v1/ai/conversations` 201 in development (dev adapter). [INFERRED] production fail-closed without provider. Tests `ai-hardening.test.ts` passed in env run |
| A11 | Payment boundary | PASS | [MEASURED] `POST /v1/payments/intents` 400 validation (no client paid status). [INFERRED] no live adapter; test adapter blocked in production |

## E2E walkthrough

| Flow | Result | Status codes |
| --- | --- | --- |
| Storefront home | PASS | 200 [MEASURED]/[OBSERVED] live catalogue cards |
| Shop | PASS | 200, 11 products [OBSERVED] |
| Search / collections | HTTP only | 200 / 200 [MEASURED] |
| Product `/shop/tan-carryall` | PASS | 200 [OBSERVED] ₹2,999 |
| Invalid product slug | PARTIAL | 200 + not-found UI [MEASURED] (not HTTP 404) |
| Wishlist / cart / checkout | PARTIAL | cart/checkout HTTP 200. Checkout body still loading at 390px. Payment honesty [INFERRED] from existing copy |
| Signup/login/account/logout | PARTIAL | `/login` 307, `/account/login` 200. Full signup+logout [NOT VERIFIED] |
| Admin login page | PASS | 200 [OBSERVED] Staff sign in |
| Admin authenticated areas | NOT VERIFIED | local bootstrap password length blocks staff login |
| Admin logout | NOT VERIFIED | |

## Link audit

| Link | Result |
| --- | --- |
| Header Home/Shop/Collections/About/Account/Cart/Search | resolve [MEASURED]/[OBSERVED] |
| `/#new-arrivals` | present [OBSERVED] |
| `/new-arrivals` | 404 and not linked [MEASURED] |
| Footer Track Order / FAQ / Shipping / Cookies | coming-soon labels, no href [OBSERVED] |
| Legal privacy/terms/refund | 200 [MEASURED] |
