# Launch polish fix log

Append-only. Each entry records a ledger ID, files changed, what changed, and how it was verified.

## Phase 0

- Created branch `launch-polish` from dirty `main`.
- Baseline commit `a5ccd3a` — storefront, admin, API, packages (excluded `.env*` except `.env.example`, `node_modules`, `.next`, and untracked `organized_products/` asset dump).
- DB safety: `DATABASE_URL` host classified LOCAL. Existing data will not be deleted. QA rows, if created, use `qa-` prefix.
- Tooling: Node v24.18.0, pnpm 11.20.0, `@playwright/test` already in root `package.json`, Cursor browser MCP available → FULL mode.
- Hung storefront lock on 3047 (PID 856) was restarted on 3047. Configured script remains `--port 3000`.

## Batch A

### ENV-001

- Files: `.env.example`, `docs/launch/ENV.md`
- Change: bootstrap password placeholder is now 8+ characters; documented skip rule.
- Verified: [INFERRED] `staff-auth.ts` length check; example no longer `12345`.

### SEC-001

- Files: `apps/api/src/lib/checkout/checkout-service.ts`, `apps/api/src/checkout.test.ts`
- Change: guests may only reuse address IDs already attached to the current checkout session. New addresses stay on the inline-create path.
- Verified: [MEASURED] `checkout.test.ts` 6 passed after assertion fix.

### AUTH-001

- Files: moved `apps/admin/middleware.ts` → `apps/admin/src/middleware.ts`
- Change: Next.js src-dir apps ignore root `middleware.ts`. Middleware now lives under `src/`.
- Verified: [MEASURED] admin production build lists Proxy (Middleware). Live unauthenticated `/admin` 200 was observed **before** the move; post-move redirect [NOT VERIFIED] because the already-running admin process was not recycled.

## Batch B / C / E

### CONTENT-001, CONTENT-002, CONTENT-003, CONTENT-004, COMMERCE-001

- Files: header, hero, best-sellers, customer-stories, homepage, catalogue loaders, placeholder hrefs, checkout header, footer nav
- Change: removed shipping/payment promises; relabeled Best Sellers; homepage rails use live catalogue when present; placeholders link to `/shop`; related products from API; currency selector replaced with “Prices in INR”.
- Verified: [OBSERVED] home at 3047 shows live priced products, “Selected Pieces”, “Stories ahead”, “Prices in INR”; no complimentary shipping string. Shop lists 11 live products. PDP `/shop/tan-carryall` shows ₹2,999.

### ROUTES-001, AUTH-002, SEO-001, SEO-002

- Files: `/login` and `/signup` aliases, account gate return-to, sitemap/robots/metadataBase, admin noindex, branded `icon.svg`, root `error.tsx` / `not-found.tsx`
- Verified: [MEASURED] `/login` 307 → `/account/login`, `/signup` 307 → `/account/signup`, `/sitemap.xml` 200, `/robots.txt` 200. Invalid slug still HTTP 200 with not-found UI [MEASURED].

## Gates

- Sequential typecheck PASS. Per-app lint PASS (admin font warning pre-existing).
- Web/admin/api production builds PASS.
- Web `.next` grep for `AI_API_KEY`, `PAYMENT_PROVIDER_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`, `sk-`: no matches [MEASURED].
- Live API security probe recorded in `QA_MATRIX.md`.
