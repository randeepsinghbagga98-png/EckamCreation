# Local infrastructure readiness (Phase 2.5)

## Current machine findings

| Item | Status |
| --- | --- |
| Docker | Not installed |
| PostgreSQL Windows service | `postgresql-x64-18` **Running** |
| `psql` on PATH | No (binary exists under `C:\Program Files\PostgreSQL\18\bin\`) |
| Prisma | 6.19.3 — schema valid; client generate OK |
| Migration SQL | Prepared at `packages/database/prisma/migrations/20260918120000_phase1_init/` |
| Migration applied | **No** — local auth failed for configured user |
| C: free space | Critical (~45 MB) — free space before heavy work |

## Recommended local path (this machine)

Prefer the **already installed** PostgreSQL 18 service. Do not install Docker solely for Postgres unless you want containers later.

### One-time local setup (you run manually)

1. Free several GB on C: (see safe caches below).
2. Create a dedicated local role + database (use your own password; never commit it):

```bat
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE USER eckam WITH PASSWORD 'YOUR_LOCAL_PASSWORD';"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE eckamcreation OWNER eckam;"
```

3. Put the URL only in `.env.local` (gitignored), never in git:

```text
DATABASE_URL=postgresql://eckam:YOUR_LOCAL_PASSWORD@localhost:5432/eckamcreation?schema=public
```

4. From repo root:

```bash
pnpm --filter @eckamcreation/database exec prisma migrate deploy
pnpm --filter @eckamcreation/database exec prisma generate
```

Do **not** run `prisma migrate reset` unless you explicitly intend to wipe the local DB.

## Docker alternative (optional)

`infrastructure/docker-compose.dev.yml` remains the container plan when Docker Desktop is installed. It is not usable on this machine today.

## Safe regenerable caches (cleanup candidates)

Only with your approval later:

- `apps/*/.next` build outputs
- `node_modules/.cache` if present
- `npm cache clean --force`
- `pnpm store prune`

Do not delete source, lockfile, Prisma migrations, or `.cursor/skills` data further without a separate request.

## Secrets

Never commit `.env` / `.env.local`. Never paste real `DATABASE_URL` into docs or chat.
