# @eckamcreation/api

JSON API for EckamCreation. Dev port **3002**.

```bash
pnpm --filter @eckamcreation/api dev
```

Foundation endpoints:

- `GET /`
- `GET /v1`
- `GET /v1/health` — API process + PostgreSQL connectivity

Requires repo-root `.env.local` with `DATABASE_URL`. See `docs/api-contracts.md`.
