# Local infrastructure

## Status (Phase 2.5)

- **Docker:** not installed
- **PostgreSQL 18:** Windows service `postgresql-x64-18` is running
- **Compose file:** `docker-compose.dev.yml` kept for optional future container use
- **Full guide:** [docs/local-database.md](../docs/local-database.md)

## When Docker becomes available

```bash
docker compose -f infrastructure/docker-compose.dev.yml up -d
```

Change the compose password before any shared use. Development only — not production.
