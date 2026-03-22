> # DEPRECATED
> SUPERSEDED BY: `.ai/README.md`, `.ai/13-implementation-strategy.md`, `.ai/15-feature-implementation-order.md`, `.ai/30-testing-strategy.md`, `.ai/31-acceptance-criteria.md`, `.ai/35-production-readiness-checklist.md`, `.ai/40-agent-start-here.md`, `.ai/41-agent-task-execution-rules.md`, `.ai/42-agent-feature-delivery-template.md`, `.ai/43-agent-definition-of-done.md`
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/*` canonical docs instead
> NOTE: this file is preserved only for historical traceability.

# Detailed Task Breakdown - Media Metadata API Service

## Purpose

Define the implementation sequence, work packages, phase gates, and delivery expectations for the Media Metadata API Service.

## Audience

- Product owners
- Technical leads
- Backend engineers
- AI coding agents

## Authority Level

Implementation-planning document for the Media Metadata API Service project.

## Scope

- In scope: work breakdown, implementation phases, dependencies, exit criteria, and delivery notes
- Out of scope: low-level code samples and final route schemas

## Read With

- `Project Scope - Media Metadata API Service.md`
- `Technical Specifications - Media Metadata API Service.md`

---

## 1. Delivery Principles

- Build a production-grade metadata service, not a prototype crawler.
- Deliver complete vertical capabilities, not broad unfinished scaffolding.
- Keep external-provider code behind ports and adapters.
- Keep Redis, MongoDB, Express, BullMQ, and provider SDKs out of core domain logic.
- Prefer deterministic contracts and runtime validation over implicit conventions.
- Favor boring, observable, debuggable behavior over clever abstractions.

---

## 2. Delivery Phases

| Phase | Name | Primary Outcome | Blocking Dependencies |
| --- | --- | --- | --- |
| 1 | Foundation | Runnable service skeleton with config, logging, health, and storage connectivity | None |
| 2 | Domain and Contracts | Stable domain model, schemas, repository ports, provider ports | Phase 1 |
| 3 | Auth and Request Boundary | Auth validation, rate limiting, request validation, correlation IDs | Phase 2 |
| 4 | Persistence and Cache Core | Mongo collections, Redis cache layer, key strategy, freshness model | Phase 2 |
| 5 | Provider Retrieval Flow | TMDB provider, secondary IMDb-compatible provider, normalization pipeline | Phases 3-4 |
| 6 | Read API Flow | Media lookup, search, canonical response mapping, error taxonomy | Phases 3-5 |
| 7 | Background Revalidation | Queue-driven refresh, stale revalidation, cleanup, popularity-based warming | Phases 4-6 |
| 8 | Hardening and Operations | Metrics, readiness, resilience, performance testing, Docker deployment | Phases 1-7 |
| 9 | Finalization | Documentation truthfulness, release checklist, rollout artifacts | Phases 1-8 |

---

## 3. Phase Breakdown

### Phase 1. Foundation

#### Objectives

- Establish a modern Node.js + TypeScript service baseline.
- Make the service boot, validate configuration, and expose basic health.
- Create the project structure and composition root.

#### Tasks

- Initialize Node.js 24 LTS project with strict TypeScript.
- Configure SWC build + `tsc --noEmit` typecheck pipeline.
- Add Express 5 HTTP adapter bootstrap.
- Add structured logging bootstrap with Pino.
- Add environment loading and validation with Zod.
- Add MongoDB connection bootstrap using the official MongoDB driver.
- Add Redis connection bootstrap using ioredis.
- Add health and readiness endpoints:
  - `/health/live`
  - `/health/ready`
- Add Dockerfile and Docker Compose for local stack:
  - `api`
  - `worker`
  - `redis`
  - `mongo`

#### Deliverables

- Service boots locally and in Docker.
- Invalid configuration fails fast at startup.
- Health endpoints reflect dependency readiness.

#### Exit Criteria

- `npm run typecheck`, `npm run test`, and `docker compose up --build` pass.
- Logs are JSON structured and include request correlation support.

---

### Phase 2. Domain and Contracts

#### Objectives

- Lock the service language, entities, identifiers, and storage boundaries before provider code begins.

#### Tasks

- Define domain entities:
  - `MediaRecord`
  - `MediaIdentifierSet`
  - `ProviderSnapshot`
  - `FreshnessPolicy`
  - `SearchQuery`
  - `LocalizedTitle`
- Define value objects:
  - `MediaId`
  - `ExternalSource`
  - `MediaKind`
  - `LocaleCode`
  - `ContentHash`
- Define repository ports:
  - `MediaRepositoryPort`
  - `SearchRepositoryPort`
  - `MetadataCachePort`
  - `AuthContextPort`
- Define provider ports:
  - `MetadataProviderPort`
  - `ProviderHealthPort`
- Define job payload contracts:
  - `refresh_media_record`
  - `refresh_popular_media_batch`
  - `cleanup_expired_cache`
- Define HTTP request and response schemas with Zod.
- Define error taxonomy and API error envelope.

#### Deliverables

- Stable contracts for persistence, cache, providers, jobs, and HTTP boundaries.
- Shared schema package inside the repo for runtime and compile-time alignment.

#### Exit Criteria

- No handler or service uses ad hoc shapes for core entities.
- Core domain and port tests pass with no Express/Mongo/Redis imports in domain code.

---

### Phase 3. Auth and Request Boundary

#### Objectives

- Make the request boundary safe, observable, and abuse-resistant.

#### Tasks

- Implement auth service client adapter.
- Add auth-token validation cache in Redis using hashed token keys.
- Enforce bearer-token validation for protected routes.
- Add request correlation ID middleware.
- Add request timeout budget handling.
- Add API rate limiting:
  - per token
  - fallback per IP
- Add security middleware:
  - `helmet`
  - CORS policy
- Add validation middleware for query and path parameters.
- Add request and response logging rules with redaction.

#### Deliverables

- Authenticated request path with cache-backed validation.
- Safe and traceable error behavior at the edge.

#### Exit Criteria

- Invalid auth, invalid inputs, and rate-limit breaches return deterministic errors.
- Tokens and provider secrets are never logged.

---

### Phase 4. Persistence and Cache Core

#### Objectives

- Build the canonical storage and cache model before provider integration.

#### Tasks

- Create Mongo collections and repositories:
  - `media_records`
  - `provider_snapshots`
  - `search_projection` if needed
- Add Mongo indexes for:
  - `mediaKind + identifiers.imdbId`
  - `mediaKind + identifiers.tmdbId`
  - text/name lookups
  - freshness and popularity tracking
- Define Redis key design:
  - `md:v1:auth:token:{hash}`
  - `md:v1:media:{kind}:canonical:{mediaId}`
  - `md:v1:lookup:{kind}:{identifierType}:{identifierValue}`
  - `md:v1:search:{hash}`
  - `md:v1:singleflight:{cacheKey}`
- Implement cache-aside read path.
- Implement TTL policy by media kind and response class.
- Implement single-flight deduplication for concurrent identical cache misses.
- Implement content-hash comparison and freshness metadata.

#### Deliverables

- Persistent canonical store in MongoDB.
- Redis used as L1 cache and coordination layer, not as the source of truth.

#### Exit Criteria

- Cache hit, cache miss, and stale refresh paths are covered by integration tests.
- MongoDB remains authoritative for canonical metadata records.

---

### Phase 5. Provider Retrieval Flow

#### Objectives

- Build provider adapters and normalization logic for media retrieval.

#### Tasks

- Implement TMDB adapter for:
  - movie lookup
  - TV lookup
  - search
  - images/credits core fields
- Implement secondary IMDb-compatible adapter strategy.
  - Recommended MVP default: OMDb or licensed IMDb-compatible source keyed by IMDb ID.
  - Preserve an `ImdbProviderPort` boundary so provider choice can change later.
- Implement provider response validation.
- Implement normalization pipeline:
  - raw provider payload -> provider snapshot -> canonical record
- Implement provider precedence rules:
  - TMDB as primary enrichment source
  - IMDb-compatible source for alternate identifiers and selective enrichment
- Define hash fields per media kind for change detection.

#### Deliverables

- Provider adapters that return validated internal models only.
- Normalization rules for movies, TV shows, and channels.

#### Exit Criteria

- Provider failures and malformed payloads are handled without poisoning cache or persistence.
- Canonical records remain stable across repeated lookups.

---

### Phase 6. Read API Flow

#### Objectives

- Expose the first complete consumer-facing API set.

#### Tasks

- Implement lookup endpoints:
  - `GET /api/v1/media/movie`
  - `GET /api/v1/media/tv-show`
  - `GET /api/v1/media/channel`
- Implement search endpoint:
  - `GET /api/v1/media/search`
- Enforce mutually exclusive lookup identifiers where applicable.
- Add locale handling and default language fallback behavior.
- Add consistent response envelope:
  - `data`
  - `meta`
- Add error response envelope:
  - `error.code`
  - `error.message`
  - `error.retryable`
  - `error.requestId`
- Add OpenAPI 3.1 contract generation or hand-authored spec at the HTTP adapter edge.

#### Deliverables

- First production-like read APIs with documented contracts.

#### Exit Criteria

- Route tests cover success, validation error, auth failure, rate limiting, cache miss, and provider failure paths.

---

### Phase 7. Background Revalidation

#### Objectives

- Move refresh and maintenance work off the request path.

#### Tasks

- Add BullMQ queue and worker bootstrap.
- Implement refresh jobs for stale or expiring media records.
- Implement popularity-aware warming for frequently requested records.
- Implement failed-job retry with exponential backoff.
- Implement dead-letter / failed-job observability.
- Implement cleanup jobs for:
  - expired Redis entries
  - stale provider snapshots if retention policy requires it
- Add distributed coordination for scheduled refresh batching.

#### Deliverables

- Queue-driven refresh lifecycle.
- Request path stays fast on hot hits and bounded on stale misses.

#### Exit Criteria

- Worker shutdown is graceful.
- Jobs are idempotent and retry-safe.
- Failed jobs do not create duplicate canonical writes.

---

### Phase 8. Hardening and Operations

#### Objectives

- Make the service observable, resilient, and production-operable.

#### Tasks

- Add metrics:
  - cache hit rate
  - provider latency
  - Mongo query latency
  - Redis latency
  - refresh job success/failure
  - auth cache hit rate
- Add tracing hooks or OpenTelemetry integration points.
- Add readiness checks for MongoDB, Redis, and queue worker health.
- Add resilience controls:
  - provider timeout budgets
  - circuit breaker / temporary provider suppression
  - stale-read fallback policy
- Add performance tests:
  - hot-cache lookup
  - stale refresh under concurrency
  - search latency
- Add load-test harness for representative traffic patterns.

#### Deliverables

- Production-grade operational visibility and failure handling.

#### Exit Criteria

- Core SLOs are measurable and reported.
- Failure modes are documented and exercised in tests.

---

### Phase 9. Finalization

#### Objectives

- Close documentation, release readiness, and handoff gaps.

#### Tasks

- Update README and architecture docs to match the actual implementation.
- Generate or validate OpenAPI docs.
- Produce `.env.example`.
- Finalize Docker and deployment instructions.
- Produce rollout checklist and smoke-test instructions.
- Verify no stale assumptions remain in implementation docs.

#### Deliverables

- Release-ready repository and operator documentation.

#### Exit Criteria

- A new engineer or AI agent can bootstrap, run, test, and extend the service without hidden assumptions.

---

## 4. Cross-Cutting Workstreams

### Testing

- Unit tests for domain services and normalization.
- Contract tests for provider adapters.
- Integration tests for MongoDB + Redis repositories.
- Route tests for all public APIs.
- Worker/job tests for refresh and retry paths.
- Performance tests for hot-cache and stale-miss flows.

### Documentation

- Keep API docs and code aligned from the first route.
- Document provider quirks and fallback rules where they affect behavior.
- Record schema/versioning decisions as ADR-style notes if needed.

### Security

- Redact tokens, API keys, and upstream credentials.
- Enforce rate limits before provider calls.
- Validate all external payloads at runtime.
- Do not trust cached payloads without schema validation on deserialize.

---

## 5. Suggested Delivery Order Inside the Repo

1. Bootstrap and storage connectivity
2. Core models and repository ports
3. Auth boundary and error taxonomy
4. Mongo/Redis repositories
5. TMDB adapter and normalization
6. First movie lookup endpoint
7. Search endpoint
8. Secondary provider adapter
9. Background refresh jobs
10. Hardening, metrics, readiness, and docs

---

## 6. Definition of Done

A feature is complete when:

- Contracts are explicit and runtime-validated.
- Domain logic is isolated from frameworks and storage clients.
- Logs and metrics cover the new behavior.
- Errors are deterministic and documented.
- Tests cover happy path, validation failure, dependency failure, and cache behavior.
- Documentation is updated and consistent with the implementation.
- Docker build and local orchestration still work.

---

## 7. Non-Goals for This Task Plan

- Frontend or dashboard work
- Multi-region replication
- Recommender systems
- Editorial CMS workflows
- Full analytics warehouse exports
