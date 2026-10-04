# Launch baseline

Recorded before polish fixes. Distinguish later failures from these results.

## Preflight

- Repo was dirty on `main` (`2ae8443 Initial ECKAM Creation backend foundation`) with a large uncommitted storefront/admin/API tree.
- Branch: `launch-polish`
- Baseline commit: `a5ccd3a chore: snapshot working storefront, admin, and API state`
- Excluded from commit: `.env*` except `.env.example`, `node_modules`, `.next`, untracked `organized_products/`
- DB host class: LOCAL [MEASURED]
- Node: v24.18.0 [MEASURED]
- pnpm: 11.20.0 [MEASURED]
- Configured ports (package.json, not changed): web 3000, admin 3001, api 3002
- Existing Next lock had storefront on **3047**. Ports were not changed. Hung 3047 process PID 856 was restarted on 3047 so QA could continue.

## Commands

### `pnpm install --frozen-lockfile` — PASS [MEASURED]

```
Scope: all 15 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 18.6s using pnpm v11.20.0
```

Lockfile drift: none.

### `pnpm typecheck` (parallel, default) — FAIL exit 134 [MEASURED]

JavaScript heap out of memory while several `tsc` processes ran together. Not a TypeScript error.

### `pnpm lint` (parallel, default) — FAIL exit 134 [MEASURED]

Same OOM while web/admin eslint ran together.

### Sequential re-run (used as the true baseline once memory was isolated)

- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -r --workspace-concurrency=1 typecheck` — PASS exit 0 [MEASURED]
- `pnpm --filter @eckamcreation/web lint` with 8GB heap — PASS [MEASURED]
- `pnpm --filter @eckamcreation/admin lint` — PASS with 1 pre-existing `@next/next/no-page-custom-font` warning [MEASURED]
- `pnpm --filter @eckamcreation/api lint` — PASS [MEASURED]

### `pnpm test` without env file — FAIL [MEASURED]

Prisma: `Environment variable not found: DATABASE_URL`. Auth tests expected 201/409/200/401 and received 500. Pre-existing: root `vitest.config.ts` does not load `.env.local`.

### `node --env-file=.env.local vitest run` — 201 passed, 1 failed, 6 skipped, 1 suite hook timeout [MEASURED]

- Failed: `checkout.test.ts` guest orphan assertion (expected 401, got 404). Fixed later; re-run 6/6 pass.
- `orders.test.ts` `beforeAll` hook timed out at 10s (flake / DB contention). Not re-run to completion after.

### `pnpm build` (per app, 8GB heap)

- web PASS [MEASURED]
- admin PASS [MEASURED]
- api PASS [MEASURED]
