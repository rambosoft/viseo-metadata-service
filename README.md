# Viseo Metadata Service

Redis-first multi-tenant metadata API for movie and TV lookup and search. The current baseline includes:
- validated config bootstrap
- Pino structured logging
- Prometheus metrics endpoint and request/provider/cache instrumentation
- Redis-backed auth validation cache
- Redis-backed canonical movie/TV snapshots, hot lookup pointers, search snapshots, and local fetched-record index
- TMDB-primary movie, TV, and mixed search flows
- official IMDb API lookup enrichment and fallback for `imdbId` requests
- BullMQ-backed stale refresh flow and worker runtime
- BullMQ-backed stale refresh, derived-cache cleanup, and hot-record warmup job flows
- stale-but-servable lookup fallback for movie and TV records
- Redis-backed cross-instance lookup miss coordination
- local auth fixture harness for dependency-light manual validation
- Docker Compose workflow for API, worker, Redis, and auth fixtures
- readiness reporting for Redis and BullMQ dependencies
- `GET /api/v1/media/movie`
- `GET /api/v1/media/tv`
- `GET /api/v1/media/search`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /openapi.json`
- `GET /docs`

## Provider Model

- TMDB is the primary provider for lookup normalization and the only active search provider.
- Official IMDb API is optional and is used for lookup enrichment and fallback only when configured.
- TMDB remains authoritative for titles, descriptions, dates, runtime, images, genres, counts, and status.
- IMDb overrides `rating` only when enrichment data is available.
- If a lookup by `imdbId` cannot be resolved through TMDB, the service may return an IMDb-backed canonical fallback record.

## Stack

- Node.js 24 LTS
- TypeScript strict mode
- Express 5
- Redis via ioredis
- BullMQ
- Zod validation
- Pino logging
- official IMDb API via AWS Data Exchange
- SWC build
- Vitest and Supertest

## Run

1. Install dependencies: `npm.cmd install`
2. Set required environment variables:
   - `REDIS_URL`
   - `AUTH_SERVICE_URL`
   - `TMDB_API_KEY`
   - or copy `.env.example` and adjust values
   - if you want IMDb fallback and `rating` enrichment, also set:
     - `IMDB_API_KEY`
     - `IMDB_DATA_SET_ID`
     - `IMDB_REVISION_ID`
     - `IMDB_ASSET_ID`
3. Optional overrides:
   - `PORT`
   - `REQUEST_BODY_LIMIT_BYTES`
   - `LOG_LEVEL`
   - `REDIS_KEY_PREFIX`
   - `RATE_LIMIT_WINDOW_SECONDS`
   - `RATE_LIMIT_MAX_REQUESTS`
   - `AUTH_TIMEOUT_MS`
   - `AUTH_CACHE_TTL_SECONDS`
   - `TMDB_BASE_URL`
   - `TMDB_IMAGE_BASE_URL`
   - `TMDB_TIMEOUT_MS`
   - `IMDB_API_URL`
   - `IMDB_TIMEOUT_MS`
   - `IMDB_AWS_REGION`
   - `AWS_PROFILE`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN`
   - `MOVIE_CACHE_TTL_SECONDS`
   - `TV_CACHE_TTL_SECONDS`
   - `MEDIA_STALE_SERVE_WINDOW_SECONDS`
   - `CANONICAL_RECORD_TTL_SECONDS`
   - `LOOKUP_SINGLEFLIGHT_TTL_SECONDS`
   - `LOOKUP_SINGLEFLIGHT_WAIT_MS`
   - `SEARCH_CACHE_TTL_SECONDS`
   - `SEARCH_INDEX_TTL_SECONDS`
   - `REFRESH_QUEUE_NAME`
   - `REFRESH_JOB_ATTEMPTS`
   - `REFRESH_JOB_BACKOFF_MS`
   - `REFRESH_WORKER_CONCURRENCY`
   - `REFRESH_DEDUP_TTL_SECONDS`
   - `WORKER_SHUTDOWN_TIMEOUT_MS`
4. Build: `npm.cmd run build`
5. Test: `npm.cmd test`
6. Performance checks: `npm.cmd run test:performance`
7. Real infra checks with live Redis/BullMQ: `npm.cmd run test:infra`
8. Start local auth fixture only: `npm.cmd run fixtures:manual`
9. Start API: `npm.cmd run start:api`
10. Start worker: `npm.cmd run start:worker`
11. Optional local stack via Compose: `npm.cmd run compose:up`
12. Live provider smoke checks against TMDB and official IMDb: `npm.cmd run test:providers:live`
13. Live stack smoke checks against a running Compose stack: `npm.cmd run compose:smoke`

## Current Endpoints

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /openapi.json`
- `GET /docs`
- `GET /api/v1/media/movie?tmdbId=550`
- `GET /api/v1/media/movie?imdbId=tt0137523`
- `GET /api/v1/media/movie?mediaId=med_...`
- `GET /api/v1/media/tv?tmdbId=1396`
- `GET /api/v1/media/tv?imdbId=tt0903747`
- `GET /api/v1/media/tv?mediaId=med_...`
- `GET /api/v1/media/search?q=fight`
- `GET /api/v1/media/search?q=breaking&kind=tv&page=1&pageSize=20`

## Current Limits

- Lookup and provider-backed search only
- Search remains TMDB-only
- Redis is the only state store in this slice
- Authenticated metadata lookup and search routes are tenant-aware and rate-limited
- Lookup routes support stale fallback and background refresh for movie and TV records
- Authenticated routes may return `403` when the upstream auth service denies authorization
- Official IMDb integration is optional and limited to lookup enrichment and `imdbId` fallback
- Without IMDb credentials, the service runs in TMDB-only mode
- IMDb overrides only `rating`; no broader field merge policy exists in MVP
- No channel support yet
- Local manual testing uses a service-owned auth fixture; TMDB and IMDb remain real even in local Compose workflows

## Operations

- `GET /health/live` checks process liveness only.
- `GET /health/ready` reflects Redis and BullMQ dependency state for the API runtime.
- `GET /metrics` exposes Prometheus text metrics.
- `GET /openapi.json` exposes the live OpenAPI document.
- `GET /docs` serves the interactive OpenAPI UI.
- Run the worker alongside the API if you want stale refresh, cleanup, and warmup jobs to be processed.

## Startup And Shutdown

- API process: `npm.cmd run start:api`
- Worker process: `npm.cmd run start:worker`
- Both runtimes handle `SIGINT` and `SIGTERM` and perform bounded graceful shutdown.
- In production, stop routing traffic to the API before process termination and keep a worker running for background refresh continuity.

## Docker

Build the image:

```bash
docker build -t viseo-metadata-service .
```

Run the API process:

```bash
docker run --rm -p 3000:3000 --env-file .env viseo-metadata-service
```

Run the worker process:

```bash
docker run --rm --env-file .env viseo-metadata-service node dist/worker.js
```

The image is multi-stage, runs as non-root, and defaults to the API command. The worker uses the same image with an overridden command.

## Local Compose

The local Compose stack boots:

- `redis`
- `auth-fixtures`
- `api`
- `worker`

TMDB and official IMDb are intentionally not mocked. Set real provider credentials in `.env`, then run:

```bash
npm.cmd run compose:up
```

If you want to use a local AWS profile for IMDb access inside Compose, use:

```bash
docker compose -f compose.yaml -f compose.aws-profile.yaml up --build
```

The auth fixture defaults to `success` mode and can be switched with:

- `MANUAL_FIXTURE_AUTH_MODE=success`
- `MANUAL_FIXTURE_AUTH_MODE=401`
- `MANUAL_FIXTURE_AUTH_MODE=403`

Useful commands:

```bash
npm.cmd run compose:logs
npm.cmd run compose:smoke
npm.cmd run compose:down
```

For the full live-validation workflow, see [live-compose-validation.md](/C:/workspace/viseo-metadata-service/docs/runbooks/live-compose-validation.md).

## Manual Fixtures

`scripts/manual-test-fixtures/` contains a small local auth harness for running the real service without an external auth dependency.

- `POST /validate`
- `GET /health/live`

Run it directly with:

```bash
npm.cmd run fixtures:manual
```
