> # DEPRECATED
> SUPERSEDED BY: `.ai/README.md`, `.ai/03-tech-stack.md`, `.ai/04-architecture-overview.md`, `.ai/12-folder-structure.md`, `.ai/20-domain-model.md`, `.ai/21-schema-contracts.md`, `.ai/22-api-contracts.md`, `.ai/23-state-management.md`, `.ai/24-error-handling.md`, `.ai/25-validation-rules.md`, `.ai/30-testing-strategy.md`, `.ai/34-non-functional-requirements.md`
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/*` canonical docs instead
> NOTE: this file is preserved only for historical traceability.

# Technical Specifications - Media Metadata API Service

## Purpose

Define the canonical technical design, module boundaries, contracts, data model, runtime behavior, and operational standards for the Media Metadata API Service.

## Audience

- Backend engineers
- Technical reviewers
- AI coding agents
- SRE and platform engineers

## Authority Level

Implementation-grade technical reference for the Media Metadata API Service.

## Scope

- In scope: architecture, module structure, contracts, storage, caching, background jobs, observability, security, and deployment
- Out of scope: frontend concerns and business/commercial process details

## Read With

- `Project Scope - Media Metadata API Service.md`
- `Detailed Task Breakdown - Media Metadata API Service.md`

---

## 1. Technical Baseline

| Concern | Decision |
| --- | --- |
| Runtime | Node.js 24 LTS |
| Language | TypeScript 5.x strict mode |
| Build | SWC for transpilation, `tsc --noEmit` for type checking |
| HTTP | Express 5 behind adapter boundary |
| Cache | Redis 7 via ioredis |
| Canonical store | MongoDB 7 via official Node.js driver |
| Jobs | BullMQ 5 |
| Logging | Pino structured JSON |
| Validation | Zod |
| HTTP client | built-in `fetch` / Undici |
| Docs | OpenAPI 3.1 + Swagger UI |
| Containerization | Docker + Docker Compose |

### Rationale

- MongoDB is the canonical store because the service owns long-lived canonical records and indexed lookups, not just ephemeral query caches.
- Redis is a fast-path and coordination system, not the system of record.
- Official MongoDB driver is preferred over Mongoose for tighter control, less ODM magic, and easier type-boundary discipline.

---

## 2. Architecture Style

### Primary Style

- Ports and adapters
- Clean architecture
- Domain-oriented modularity

### Architectural Invariants

- Core domain must not import Express, Redis, BullMQ, MongoDB, or provider SDK code.
- All external payloads must be validated at runtime.
- All storage and provider behavior must be accessed through explicit ports.
- Public responses must be mapped from canonical internal models, not raw persistence or provider shapes.

---

## 3. Suggested Project Structure

```text
src/
  core/
    media/
      entities/
      value-objects/
      services/
    auth/
    shared/
  ports/
    auth/
    media/
    cache/
    jobs/
    observability/
  application/
    services/
      lookup/
      search/
      refresh/
  adapters/
    http-express/
    cache-redis/
    persistence-mongo/
    auth-http/
    provider-tmdb/
    provider-imdb/
    jobs-bullmq/
  config/
  bootstrap/
  tests/
```

### Folder Rules

- `core/` owns business semantics only.
- `ports/` defines interfaces and boundary contracts.
- `application/` orchestrates use cases.
- `adapters/` owns external system implementations.
- `bootstrap/` wires dependencies and runtime lifecycle.

---

## 4. Domain Model

### Core Entities

#### MediaRecord

Canonical metadata document.

Fields:

- `mediaId`
- `mediaKind`: `movie | tvShow | channel`
- `identifiers`
- `titles`
- `canonicalTitle`
- `description`
- `genres`
- `releaseDate`
- `releaseYear`
- `runtimeMinutes`
- `rating`
- `cast`
- `images`
- `providerPriority`
- `providerSnapshots`
- `contentHash`
- `freshness`
- `popularity`
- `schemaVersion`
- `createdAt`
- `updatedAt`

#### ProviderSnapshot

Provider-specific normalized capture for traceability and refresh comparison.

Fields:

- `provider`
- `providerRecordId`
- `normalizedAt`
- `hash`
- `payload`

#### MediaIdentifierSet

Fields:

- `canonicalId`
- `tmdbId?`
- `imdbId?`
- `slug?`

#### FreshnessState

Fields:

- `lastFetchedAt`
- `lastValidatedAt`
- `cacheTtlSeconds`
- `staleAfter`
- `refreshAfter`
- `sourceStatus`

### Value Objects

- `MediaId`
- `MediaKind`
- `ProviderName`
- `LocaleCode`
- `ContentHash`
- `RequestFingerprint`

---

## 5. Persistence Model

### MongoDB Collections

#### `media_records`

Primary canonical records.

Example shape:

```ts
type MediaRecordDocument = {
  _id: string;
  mediaId: string;
  mediaKind: "movie" | "tvShow" | "channel";
  identifiers: {
    tmdbId?: string;
    imdbId?: string;
    slug?: string;
  };
  canonicalTitle: string;
  titles: Array<{ locale: string; value: string; type: "display" | "original" }>;
  description?: string;
  genres: string[];
  releaseDate?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  rating?: number;
  cast: Array<{ name: string; role?: string }>;
  images: {
    posterUrl?: string;
    backdropUrl?: string;
    logoUrl?: string;
  };
  providerSnapshots: Array<{
    provider: string;
    providerRecordId: string;
    hash: string;
    normalizedAt: string;
    payload: Record<string, unknown>;
  }>;
  contentHash: string;
  freshness: {
    lastFetchedAt: string;
    lastValidatedAt: string;
    cacheTtlSeconds: number;
    staleAfter: string;
    refreshAfter: string;
  };
  popularity?: {
    lookupCount7d: number;
    lookupCount30d: number;
    lastRequestedAt?: string;
  };
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
};
```

#### Optional Supporting Collections

- `provider_lookup_index`
- `refresh_job_state`
- `search_analytics` if analytics are later required

### Mongo Indexes

- unique: `mediaId`
- unique sparse: `mediaKind + identifiers.tmdbId`
- unique sparse: `mediaKind + identifiers.imdbId`
- non-unique: `canonicalTitle`
- text or Atlas Search index for title/name fields if chosen
- `freshness.refreshAfter`
- `popularity.lastRequestedAt`

---

## 6. Redis Design

### Redis Responsibilities

- auth validation cache
- hot lookup cache
- hot search-result cache
- single-flight / short lock coordination
- job queue backing store
- lightweight popularity counters

### Redis Key Patterns

```text
md:v1:auth:token:{tokenHash}
md:v1:lookup:{mediaKind}:mediaId:{mediaId}
md:v1:lookup:{mediaKind}:tmdbId:{tmdbId}
md:v1:lookup:{mediaKind}:imdbId:{imdbId}
md:v1:lookup:{mediaKind}:name:{requestHash}
md:v1:search:{requestHash}
md:v1:singleflight:{requestHash}
md:v1:metrics:popularity:{mediaId}
```

### Cache Rules

- Cache entries must be versioned.
- Cache payloads must be validated when deserialized.
- Cache TTLs differ by endpoint class:
  - direct identifier lookup: longer TTL
  - text search: shorter TTL
  - auth validation: bounded by auth expiry
- TTL jitter is required for hot keys.

### Single-Flight Rules

- In-process deduplication prevents duplicate concurrent provider calls inside one instance.
- Redis short-lived coordination key prevents cross-instance stampede for the same lookup.
- If a lock exists, the request may:
  - wait briefly within a bounded timeout, or
  - return stale cached data if available, or
  - return a retriable upstream-unavailable error when no safe fallback exists

---

## 7. Caching and Freshness Strategy

### Read Flow

1. Validate auth token.
2. Build request fingerprint.
3. Check Redis cache.
4. On miss, check MongoDB canonical record.
5. If canonical record is fresh enough:
   - return it
   - hydrate Redis
6. If record is stale but usable:
   - return stale result
   - enqueue background refresh
7. If no usable record exists:
   - perform provider retrieval under single-flight
   - normalize
   - persist to Mongo
   - hydrate Redis
   - return response

### Freshness States

- `fresh`: safe to serve without refresh
- `stale_servable`: safe to serve with background refresh
- `expired_unservable`: must refresh before serving
- `provider_unavailable`: may serve last good record if policy allows

### Hash Strategy

- Build canonical content hash from normalized fields, not raw payload order.
- Compare provider snapshot hashes to avoid unnecessary full rewrites.
- Do not treat timestamp-only upstream changes as meaningful content updates unless explicitly configured.

---

## 8. Provider Integration Model

### Provider Port

```ts
interface MetadataProviderPort {
  providerName(): "tmdb" | "imdb";
  supports(kind: "movie" | "tvShow" | "channel"): boolean;
  lookupByIdentifier(args: LookupByIdentifierArgs): Promise<ProviderLookupResult | null>;
  search(args: ProviderSearchArgs): Promise<ProviderSearchResult>;
}
```

### Provider Rules

- Provider adapters must not expose raw provider payloads beyond the adapter boundary.
- Provider adapters validate raw responses with Zod.
- Provider adapters return normalized provider models plus snapshot payloads for persistence.
- Timeouts are explicit and per-provider configurable.
- Retries are bounded and only used for safe transient failures.

### Provider Strategy

- TMDB is the primary structured provider for movie and TV metadata.
- Secondary IMDb-compatible provider is used for alternate identifiers and selective enrichment.
- Channel metadata may use a channel-specific adapter later; in MVP it remains limited and explicitly documented.

---

## 9. HTTP API Contracts

### Authenticated Routes

- `GET /api/v1/media/movie`
- `GET /api/v1/media/tv-show`
- `GET /api/v1/media/channel`
- `GET /api/v1/media/search`

### Unauthenticated Operational Routes

- `GET /health/live`
- `GET /health/ready`
- `GET /openapi.json`
- `GET /docs`

### Lookup Endpoint Contract

Example:

`GET /api/v1/media/movie?tmdbId=550&lang=en`

Rules:

- Exactly one lookup identifier must be present.
- `lang` defaults to `en`.
- Response envelope:

```json
{
  "data": {
    "mediaId": "med_01hq...",
    "kind": "movie",
    "title": "Fight Club",
    "originalTitle": "Fight Club",
    "description": "....",
    "releaseDate": "1999-10-15",
    "releaseYear": 1999,
    "rating": 8.8,
    "genres": ["Drama", "Thriller"],
    "images": {
      "posterUrl": "https://...",
      "backdropUrl": "https://..."
    },
    "identifiers": {
      "tmdbId": "550",
      "imdbId": "tt0137523"
    }
  },
  "meta": {
    "requestId": "req_...",
    "source": "redis",
    "stale": false,
    "provider": "tmdb"
  }
}
```

### Search Endpoint Contract

`GET /api/v1/media/search?q=breaking+bad&kind=tvShow&lang=en&page=1&pageSize=20`

Response includes:

- `items`
- `page`
- `pageSize`
- `total`
- `hasMore`
- `source`
- `requestId`

### Error Envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Exactly one identifier must be provided",
    "retryable": false,
    "requestId": "req_..."
  }
}
```

### Error Codes

- `authentication_failed`
- `authorization_failed`
- `validation_failed`
- `not_found`
- `rate_limited`
- `provider_unavailable`
- `dependency_unavailable`
- `internal_error`

---

## 10. Auth Model

### Auth Rules

- All metadata routes require a bearer token.
- Token validation is delegated to an external auth service.
- Validated auth context is cached in Redis using a hashed token key.
- Cache TTL must never outlive the upstream token validity window.

### Auth Cache Shape

```ts
type CachedAuthContext = {
  principalId: string;
  tenantId?: string;
  scopes: string[];
  expiresAt: string;
};
```

---

## 11. Background Jobs

### Queue Set

- `metadata-refresh`
- `metadata-cleanup`
- `metadata-warmup`

### Job Contracts

#### `refresh_media_record`

Fields:

- `mediaId`
- `mediaKind`
- `reason`: `stale | forced | warmup`
- `requestedAt`

#### `cleanup_expired_cache`

Fields:

- `requestedAt`

### Job Rules

- Jobs must be validated on enqueue and on worker execution.
- Jobs must be idempotent.
- Workers must shut down gracefully.
- Failed jobs must emit structured logs and metrics.
- Retries use exponential backoff with bounded attempts.

---

## 12. Resilience Patterns

### Provider Failure Handling

- Per-provider timeout budgets
- Bounded retry for transient failures
- Optional circuit breaker per provider
- Serve stale canonical data when policy allows
- Fail fast when no safe data exists

### Dependency Failure Handling

- Redis unavailable:
  - bypass cache where possible
  - degrade readiness
- MongoDB unavailable:
  - fail readiness
  - only serve from cache if policy explicitly permits and consistency risk is acceptable
- Queue unavailable:
  - serve fresh data synchronously only where bounded and safe
  - otherwise degrade readiness and log refresh backlog risk

---

## 13. Observability

### Logging

Structured JSON with:

- `requestId`
- `route`
- `statusCode`
- `durationMs`
- `cacheStatus`
- `provider`
- `mediaKind`

Redact:

- bearer tokens
- provider keys
- auth service secrets

### Metrics

- request count and latency by route
- cache hit/miss rate
- Mongo lookup latency
- Redis latency
- provider latency and error rate
- job queue counts
- refresh success/failure rate

### Health

- `/health/live`: process alive
- `/health/ready`: Mongo, Redis, queue, worker, and auth dependency readiness summary

---

## 14. Security Controls

- Runtime validation for all inputs and external payloads
- Helmet headers
- explicit CORS policy
- token hashing before cache storage
- rate limiting
- request size limits
- no raw provider payload exposure by default
- secret management through environment variables or secret manager

---

## 15. Configuration Model

### Required Environment Variables

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

MONGO_URI=mongodb://mongo:27017/media-metadata
MONGO_DB_NAME=media_metadata

REDIS_URL=redis://redis:6379
REDIS_KEY_PREFIX=md

AUTH_SERVICE_URL=https://auth.example.com
AUTH_TIMEOUT_MS=3000
AUTH_CACHE_TTL_SECONDS=3600

TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_API_KEY=...
TMDB_TIMEOUT_MS=5000

IMDB_PROVIDER_BASE_URL=https://provider.example.com
IMDB_PROVIDER_API_KEY=...
IMDB_TIMEOUT_MS=5000

DEFAULT_LOCALE=en
LOOKUP_CACHE_TTL_SECONDS=3600
SEARCH_CACHE_TTL_SECONDS=300
STALE_WHILE_REVALIDATE_SECONDS=86400

BULLMQ_PREFIX=md:jobs
METADATA_REFRESH_QUEUE_NAME=metadata-refresh
METADATA_WORKER_CONCURRENCY=4

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

### Config Rules

- All config loads through one validated module.
- No direct `process.env` reads outside bootstrap/config.
- Timeouts, TTLs, and concurrency are configurable and bounded.

---

## 16. Deployment Model

### Local Stack

- `api`
- `worker`
- `redis`
- `mongo`

### Production Model

- API and worker as separate processes or containers
- MongoDB managed separately
- Redis managed separately
- reverse proxy / ingress in front of API

### Docker Rules

- multi-stage build
- non-root runtime
- healthcheck for API
- explicit startup command for `api` vs `worker`

---

## 17. Testing Strategy

### Unit Tests

- normalization logic
- freshness calculation
- content hashing
- identifier resolution rules

### Integration Tests

- Mongo repositories
- Redis cache adapters
- auth cache behavior
- BullMQ worker and queue contracts

### Route Tests

- lookup success and failure paths
- search behavior
- auth and rate limiting
- error mapping

### Contract Tests

- TMDB adapter schema validation
- secondary provider adapter validation
- OpenAPI route coverage

### Performance Tests

- hot-cache read latency
- concurrent identical-request deduplication
- stale-refresh under load

---

## 18. Versioning and Migration

### API Versioning

- Public HTTP routes start at `/api/v1`
- Breaking changes require `/v2`, not silent response drift

### Data Versioning

- Canonical documents include `schemaVersion`
- Redis keys include version namespace
- Migration jobs must be explicit if canonical model changes materially

---

## 19. Technical Acceptance Criteria

- Hot-cache lookup path meets latency targets in representative tests.
- Cache miss path remains bounded by configured provider timeouts.
- All public routes have runtime validation and OpenAPI documentation.
- Provider payloads cannot enter persistence unvalidated.
- MongoDB and Redis responsibilities are cleanly separated.
- Background refresh is idempotent and observable.
- Readiness accurately reflects dependency health.
- The service can be bootstrapped and tested from documented commands without hidden steps.
