# Feature Implementation Order

- Purpose: Give the exact recommended build order for the first implementation pass.
- Audience: Backend engineers and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Ordered feature delivery path.
- Out of scope: Detailed acceptance logic for each feature.
- Read with: `.ai/13-implementation-strategy.md`, `.ai/31-acceptance-criteria.md`, `.ai/40-agent-start-here.md`.

## Ordered Build Path

1. `Confirmed`: Config module, bootstrapping, logging, liveness, readiness shell
2. `Confirmed`: Core domain types, ports, error taxonomy, Zod schemas
3. `Confirmed`: Redis connection, key builder, repository interfaces, serializer/validator helpers
4. `Confirmed`: Auth adapter, auth cache, tenant context middleware, rate limiting
5. `Confirmed`: TMDB adapter and movie lookup normalization
6. `Confirmed`: Redis-backed lookup snapshot flow for movie records
7. `Confirmed`: Movie lookup endpoint and OpenAPI contract
8. `Confirmed`: TV-show provider flow and endpoint parity
9. `Confirmed`: Search provider flow, cached search snapshots, local fetched-record index updates
10. `Confirmed`: Search endpoint and paging contracts
11. `Confirmed`: Official IMDb adapter, identifier enrichment path, TMDB-primary precedence, and IMDb fallback by `imdbId`
12. `Confirmed`: Background refresh, cleanup, retry, and warmup jobs
13. `Confirmed`: Metrics, readiness detail, stale fallback logic, performance tests
14. `Confirmed`: Final documentation truth check, deployment polish, and performance closeout
15. `Confirmed`: Real-environment Redis and BullMQ validation, local auth fixture harness, and Compose-based local runtime
16. `Confirmed`: Complete OpenAPI 3.1 docs UI, official IMDb live validation workflow, and provider smoke scripts

## Sequencing Rules

- `Confirmed`: Build the movie lookup path as the first full vertical slice.
- `Confirmed`: Movie lookup, TV lookup, and search are now the implemented parity baseline.
- `Confirmed`: Search, stale fallback, and refresh flow are now the implemented parity baseline.
- `Confirmed`: Metrics, readiness detail, resilience, Docker packaging, and performance verification are now the implemented hardening baseline.
- `Confirmed`: The current parity baseline includes queue-backed refresh, cleanup, and warmup support.
- `Confirmed`: The current local-validation baseline includes Redis, BullMQ, API, worker, auth fixture orchestration via Compose, and live provider smoke scripts.
- `Confirmed`: The current provider baseline is TMDB-primary lookup and search plus official IMDb lookup enrichment and fallback.
- `Confirmed`: Search remains TMDB-only even though official IMDb lookup support is implemented.
- `Confirmed`: Do not build `channel` endpoints in MVP.
- `Confirmed`: Do not add new providers before the TMDB plus official IMDb provider model is stable.
