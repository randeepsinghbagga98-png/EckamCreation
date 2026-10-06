# Production environment variable names

Values are never recorded here. Names only.

## Required for production

- `NODE_ENV` (must be `production`)
- `DATABASE_URL`
- `API_INTERNAL_URL`
- `CORS_ORIGINS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (8–128 characters or bootstrap is skipped)
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (canonical site URL; never a secret)
- `NEXT_PUBLIC_APP_NAME`

## Optional (startup must succeed without these)

- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_BASE_URL`
- `PAYMENT_PROVIDER`
- `PAYMENT_PROVIDER_KEY`
- `PAYMENT_PROVIDER_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
- `ALLOW_TEST_PAYMENT_PROVIDER` — must remain unset in production
- `EMAIL_API_KEY` / `EMAIL_FROM`
- `WHATSAPP_API_KEY` / `WHATSAPP_PHONE_NUMBER_ID`
- `REDIS_URL`
- `STORAGE_*`
- `API_JSON_BODY_LIMIT_BYTES`

## Notes

- `.env.example` uses `ADMIN_PASSWORD=change-me-min-8-chars` (placeholder only).
- Local staff login stays blocked if the real local password is shorter than 8 characters. Do not copy that value here.
- Do not require a localhost URL at production build/run time. Set `NEXT_PUBLIC_APP_URL`, `API_INTERNAL_URL`, and `CORS_ORIGINS` to the real origins.
- `CORS_ORIGINS` must include every browser origin that talks to the API (comma-separated exact origins). For the split Render deploy this means both the customer/API public origin and the Admin origin (example shape only: `https://<customer-host>,https://<admin-host>`). Do not use `*`.
- Admin `API_INTERNAL_URL` must point at the live API origin (server-side only; never `NEXT_PUBLIC_`). Admin proxies browser `/v1/*` at **runtime** via that env (Route Handler); do not rely on build-time Next rewrites for the Admin→API hop.
- Staff sessions are stored in PostgreSQL (`StaffSession`). Apply Prisma migrations before relying on multi-instance staff login.
- `ALLOW_TEST_PAYMENT_PROVIDER` must stay unset in production.
