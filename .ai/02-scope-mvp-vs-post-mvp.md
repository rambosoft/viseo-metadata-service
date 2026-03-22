# Scope: MVP vs Post-MVP

- Purpose: Define what is fixed for MVP and what is intentionally deferred.
- Audience: Product owners, technical leads, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Included features, deferred features, and scope boundaries.
- Out of scope: Detailed implementation tactics.
- Read with: `.ai/00-project-summary.md`, `.ai/14-feature-map.md`, `.ai/15-feature-implementation-order.md`.

## MVP In Scope

- `Confirmed`: Bearer-token validation through an external auth adapter.
- `Confirmed`: Tenant-aware Redis keying and auth-context propagation.
- `Confirmed`: TMDB provider adapter.
- `Confirmed`: IMDb-compatible provider adapter.
- `Confirmed`: Canonical lookup by `mediaId`, `tmdbId`, or `imdbId`.
- `Confirmed`: Provider-backed search with cached results.
- `Confirmed`: Redis-backed local index over previously fetched records only.
- `Confirmed`: Background refresh, stale-while-revalidate, and cache cleanup.
- `Confirmed`: OpenAPI-documented REST API.
- `Confirmed`: Health, readiness, logging, metrics, and Dockerized local stack.

## MVP Explicitly Out Of Scope

- `Confirmed`: Not in MVP: MongoDB-backed canonical persistence.
- `Confirmed`: Not in MVP: Xtream or M3U playlist ingestion.
- `Confirmed`: Not in MVP: full provider-catalog sync.
- `Confirmed`: Not in MVP: channel metadata implementation.
- `Confirmed`: Not in MVP: billing tiers, quota enforcement, and per-plan TTL policies.
- `Confirmed`: Not in MVP: GraphQL, dashboards, or editorial tooling.

## Post-MVP Candidates

- `Needs clarification`: Approved channel-capable provider and channel metadata support.
- `Needs clarification`: Vendor-specific IMDb-compatible provider binding.
- `Needs clarification`: Query warmup, broader prefetching, and ranking improvements.
- `Needs clarification`: Additional providers and override data.
