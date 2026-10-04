# EckamCreation architecture notes

**Blueprint:** [architecture-blueprint.md](./architecture-blueprint.md)  
**Domain:** [domain-model.md](./domain-model.md) · [schema-decisions.md](./schema-decisions.md)  
**API:** [api-contracts.md](./api-contracts.md)  
**Payments:** [payment-provider.md](./payment-provider.md)  
**Local DB:** [local-database.md](./local-database.md)

Status: Phase 2 API contracts ready. Phase 2.5 blocked on valid local DB credentials + disk space.

## Snapshot

- Apps: web, admin, api
- Schema: Phase 1 Prisma (migration prepared, not applied)
- API: contracts + 501 stubs
- DB: PostgreSQL 18 service present; auth to `eckamcreation` not yet valid

## Not started

UI, Admin MVP handlers, providers, deploy, migration apply.
