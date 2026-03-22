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
11. `Confirmed`: IMDb-compatible adapter and identifier enrichment path
12. `Confirmed`: Background refresh, cleanup, retry, and warmup jobs
13. `Confirmed`: Metrics, readiness detail, stale fallback logic, performance tests
14. `Confirmed`: Final documentation truth check against implemented behavior

## Sequencing Rules

- `Confirmed`: Build the movie lookup path as the first full vertical slice.
- `Confirmed`: Do not build `channel` endpoints in MVP.
- `Confirmed`: Do not add new providers before TMDB and the IMDb-compatible path are stable.
