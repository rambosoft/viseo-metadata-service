> # DEPRECATED
> SUPERSEDED BY: `.ai/README.md`, `.ai/00-project-summary.md`, `.ai/01-product-goals.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/05-domain-boundaries.md`, `.ai/22-api-contracts.md`, `.ai/33-assumptions-and-defaults.md`
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/*` canonical docs instead
> NOTE: this file is preserved only for historical traceability.

# Project Scope - Media Metadata API Service

## Executive Summary

The Media Metadata API Service is a production-grade Node.js + TypeScript backend that resolves, normalizes, caches, and serves media metadata for movies, TV shows, and channels from external metadata providers such as TMDB and an IMDb-compatible secondary source.

The service is designed to:

- reduce expensive upstream metadata calls
- serve low-latency read APIs
- provide a stable canonical metadata model
- support future provider expansion without major rewrites
- remain observable, secure, and easy to operate

This service is not a streaming platform and does not serve media content. It is a metadata retrieval, normalization, caching, and enrichment service.

---

## 1. Product Purpose

### Core Problem

Consumer applications and backend services often need fast, repeated access to media metadata, but direct integration with upstream metadata providers introduces:

- rate limits
- latency spikes
- schema inconsistency
- provider-specific edge cases
- duplicated caching and normalization logic across teams

### Product Goal

Provide one internal or external-facing metadata service that:

- resolves media by identifier or name
- normalizes provider-specific payloads into one canonical API
- caches hot results aggressively
- persists authoritative records for repeatable reads
- refreshes stale data asynchronously when practical

---

## 2. Primary Responsibilities

### In Scope

- Media metadata lookup by:
  - internal canonical media ID
  - TMDB ID
  - IMDb ID or equivalent secondary-provider ID
  - exact or partial name search
- Metadata normalization across providers
- Canonical metadata persistence in MongoDB
- Redis caching for hot reads and coordination
- Auth validation via external auth service
- Rate limiting and abuse protection
- Queue-driven refresh and revalidation
- OpenAPI-documented HTTP APIs
- Production-grade logging, metrics, and readiness

### Out of Scope

- Video streaming or transcoding
- subtitle delivery
- user watch history
- recommendation engines
- editorial CMS workflows
- auth service implementation
- provider account/key lifecycle management beyond consuming configured secrets

---

## 3. Intended Consumers

- Frontend applications that need movie or TV metadata
- Internal backend services that need canonical enrichment
- Catalog or ingestion pipelines that need resolved metadata by external IDs
- Operational teams that need a stable metadata API instead of calling providers directly

---

## 4. Core User Flows

### Flow A. Lookup by External ID

1. Client sends a request with a bearer token and a `tmdbId` or `imdbId`.
2. Service validates auth context.
3. Service checks Redis for the canonical lookup result.
4. On cache miss, service checks MongoDB.
5. If data is missing or stale, service calls the appropriate provider adapter.
6. Service normalizes, persists, caches, and returns the canonical response.

### Flow B. Lookup by Name

1. Client sends a name query plus optional locale and media kind.
2. Service validates request and auth context.
3. Service uses cached search results when available.
4. On stale or missing cache, service performs provider-backed search and ranking normalization.
5. Service returns canonical search results with pagination metadata.

### Flow C. Stale Data Revalidation

1. A record approaches or exceeds its freshness TTL.
2. A background worker re-fetches upstream metadata.
3. Content hash and provider snapshot are compared.
4. Canonical record is updated only if meaningful changes are detected.
5. Redis cache is refreshed or invalidated.

---

## 5. Product Goals

### Functional Goals

- Support movies, TV shows, and channels in MVP.
- Support lookup by TMDB ID, IMDb ID, canonical media ID, and name.
- Maintain one canonical response shape independent of provider quirks.
- Provide search results with deterministic paging and sorting rules.
- Reuse cached and persisted metadata whenever safe.

### Operational Goals

- Be safe for horizontal scaling.
- Be diagnosable in production from day one.
- Keep provider failures from cascading into full service unavailability.
- Keep the public contract stable while providers evolve.

### Engineering Goals

- Strict TypeScript correctness
- Clean modular architecture
- Explicit contracts and validation
- Future-proof provider expansion
- Clear separation of API, domain, persistence, caching, and job responsibilities

---

## 6. MVP Scope

### MVP Features

- Bearer-token validation via external auth service
- Redis-backed auth validation cache
- MongoDB-backed canonical media record persistence
- Redis L1 cache for lookup and search responses
- TMDB provider integration
- Secondary IMDb-compatible provider integration behind an adapter contract
- Endpoints for:
  - `GET /api/v1/media/movie`
  - `GET /api/v1/media/tv-show`
  - `GET /api/v1/media/channel`
  - `GET /api/v1/media/search`
- Background refresh and cleanup with BullMQ
- OpenAPI 3.1 documentation and Swagger UI
- Health, readiness, logging, and basic metrics

### Post-MVP Features

- Additional metadata providers
- richer popularity or ranking models
- webhook-based provider invalidation
- scheduled large-batch prewarming
- editorial override data
- recommendation and similarity APIs
- GraphQL API layer
- multi-region active-active deployment

---

## 7. Non-Goals

- Do not build a generic content platform.
- Do not create a provider-specific API surface.
- Do not expose raw upstream payloads as the main public contract.
- Do not depend on MongoDB ODM magic if it harms type clarity or performance.
- Do not put business logic inside Express handlers.

---

## 8. Product Constraints

### Technical Constraints

- Runtime baseline: Node.js 24 LTS
- Language: TypeScript strict mode
- Persistence: MongoDB as canonical store
- Cache and coordination: Redis
- HTTP framework: Express behind an adapter boundary
- Background processing: BullMQ

### Operational Constraints

- The service must run in Docker for local and production-like environments.
- The service must be configurable entirely from environment variables.
- The service must tolerate partial provider outages.

### Product Constraints

- Public contracts must remain stable even if provider payloads change.
- Auth validation cost must be bounded through caching.
- Metadata freshness must be explicit, not assumed.

---

## 9. Key Product Decisions

| Decision | Direction | Reason |
| --- | --- | --- |
| Canonical store | MongoDB | Persisted record history and flexible indexed lookup fit better than Redis-only storage |
| Hot cache | Redis | Fast repeated reads and distributed coordination |
| HTTP style | Resource-oriented REST | Best fit for internal and external consumers plus OpenAPI clarity |
| Primary provider | TMDB | Strong structured metadata and predictable API model |
| Secondary provider | IMDb-compatible adapter | Needed for alternate identifiers and cross-source enrichment, but kept abstract due provider variability |
| Validation | Zod | Shared runtime contracts at all boundaries |
| Logging | Pino JSON logs | Operationally friendly and fast |
| Queue | BullMQ | Natural fit with Redis and Node ecosystem |
| DI style | Composition root over heavy framework DI | Lower indirection, easier AI-agent execution, fewer runtime surprises |

---

## 10. API Shape

### Public Endpoint Set

- `GET /api/v1/media/movie`
- `GET /api/v1/media/tv-show`
- `GET /api/v1/media/channel`
- `GET /api/v1/media/search`
- `GET /health/live`
- `GET /health/ready`
- `GET /openapi.json`
- `GET /docs`

### Lookup Rules

- Exactly one identifier mode must be provided for type-specific lookup:
  - `id`
  - `tmdbId`
  - `imdbId`
  - `name`
- `lang` is optional and defaults to `en`.
- Search endpoint supports:
  - `q`
  - `kind`
  - `lang`
  - `page`
  - `pageSize`

---

## 11. Success Metrics

### Product Metrics

- p95 cache-hit lookup latency under 100 ms
- p95 cache-miss lookup latency under 2 s when provider latency is healthy
- high reuse rate for hot records
- low duplicate upstream request rate under concurrency

### Engineering Metrics

- deterministic auth and validation behavior
- test coverage across route, repository, provider, and job paths
- zero cross-provider contract drift in normalized API responses

### Operational Metrics

- readiness accurately reflects MongoDB, Redis, and worker state
- provider failure rates and latency are visible in metrics/logs
- failed jobs are visible and retry-safe

---

## 12. Risks and Product Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Provider rate limits | High | Cache aggressively, use background refresh, bounded retries |
| Provider schema drift | High | Validate every external payload and isolate provider mappers |
| Cache inconsistency | Medium | MongoDB remains source of truth; validate cache payloads on read |
| Poor auth dependency behavior | Medium | Cache validated auth context, fail closed, add readiness signals |
| Search ambiguity by name | Medium | Make query semantics explicit and deterministic in MVP |
| Over-expansion into a generic content hub | High | Keep scope to metadata retrieval, normalization, caching, and enrichment |

---

## 13. Delivery Milestones

### Milestone 1. Service Skeleton

- Service boots
- Health endpoints work
- Storage connectivity exists

### Milestone 2. Canonical Lookup Path

- Movie lookup by TMDB ID works end to end
- Mongo persistence and Redis caching both exercised

### Milestone 3. Search Path

- Search endpoint works
- Auth, validation, cache, and provider flow proven

### Milestone 4. Refresh and Resilience

- Background refresh works
- Failure and stale fallback paths tested

### Milestone 5. Production Readiness

- Docker deployment works
- OpenAPI docs are accurate
- Metrics, readiness, and operational docs are complete

---

## 14. Assumptions

- An external auth validation service exists and returns the access context required for this API.
- A licensed or operationally approved IMDb-compatible metadata source is available if direct IMDb API access is not.
- MongoDB and Redis are available in all target environments.
- The system is primarily read-heavy with bursty lookup/search traffic.

---

## 15. Final Scope Statement

The Media Metadata API Service should be delivered as a focused metadata retrieval and enrichment platform with explicit storage, caching, auth, and provider boundaries. It should optimize for correctness, repeatability, low-latency reads, and maintainable future extension, not for maximum feature breadth in the first release.
