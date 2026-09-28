# EckamCreation

Premium multi-category e-commerce monorepo (environment + domain schema + API contracts).

## Stack

Node 20+, pnpm, TypeScript, Next.js 16, React 19, Tailwind 4, Prisma/PostgreSQL, Vitest.

## Commands

```bash
pnpm install
pnpm dev          # web :3000
pnpm dev:admin    # :3001
pnpm dev:api      # :3002
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

Copy `.env.example` → `.env.local` (never commit secrets).

## Layout

`apps/{web,admin,api}` · `packages/{ui,database,auth,ai,email,whatsapp,payments,search,storage,config,api-contracts}` · `docs/` · `infrastructure/` · `tests/`

## Status

- Phase 0 env: done
- Phase 1 Prisma schema: done (migration not applied — no local Postgres)
- Phase 2 API contracts: done — see `docs/api-contracts.md` and `@eckamcreation/api-contracts`

No UI, providers, or deploy yet.
