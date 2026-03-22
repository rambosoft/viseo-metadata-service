# Viseo Metadata Service

Current implemented slices:
- validated config bootstrap
- Pino structured logging
- Redis-backed auth validation cache
- Redis-backed canonical movie/TV snapshots, hot lookup pointers, search snapshots, and local fetched-record index
- TMDB movie, TV, and mixed search flows
- BullMQ-backed stale refresh flow and worker runtime
- stale-but-servable lookup fallback for movie and TV records
- Redis-backed cross-instance lookup miss coordination
- `GET /api/v1/media/movie`
- `GET /api/v1/media/tv`
- `GET /api/v1/media/search`
- `GET /health/live`
- `GET /health/ready`

## Stack

- Node.js 24 LTS
- TypeScript strict mode
- Express 5
- Redis via ioredis
- BullMQ
- Zod validation
- Pino logging
- SWC build
- Vitest and Supertest

## Run

1. Install dependencies: `npm.cmd install`
2. Set required environment variables:
   - `REDIS_URL`
   - `AUTH_SERVICE_URL`
   - `TMDB_API_KEY`
   - or copy `.env.example` and adjust values
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
6. Start API: `npm.cmd run start:api`
7. Start worker: `npm.cmd run start:worker`
8. Optional real Redis integration tests: `npm.cmd run test:redis`

## Current Endpoints

- `GET /health/live`
- `GET /health/ready`
- `GET /openapi.json`
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
- TMDB provider only
- Redis is the only state store in this slice
- Authenticated metadata lookup and search routes are tenant-aware and rate-limited
- Lookup routes support stale fallback and background refresh for movie and TV records
- IMDb-compatible enrichment is still deferred pending approved commercial provider choice
- No channel support yet
