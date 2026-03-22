# Viseo Metadata Service

First implemented slice:
- validated config bootstrap
- Pino structured logging
- Redis-backed auth validation cache
- Redis-backed movie snapshot store
- TMDB movie lookup
- `GET /api/v1/media/movie`
- `GET /health/live`
- `GET /health/ready`

## Stack

- Node.js 22+ in this environment, with canonical docs targeting Node 24 LTS
- TypeScript strict mode
- Express 5
- Redis via ioredis
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
3. Optional overrides:
   - `PORT`
   - `LOG_LEVEL`
   - `REDIS_KEY_PREFIX`
   - `AUTH_TIMEOUT_MS`
   - `AUTH_CACHE_TTL_SECONDS`
   - `TMDB_BASE_URL`
   - `TMDB_IMAGE_BASE_URL`
   - `TMDB_TIMEOUT_MS`
   - `MOVIE_CACHE_TTL_SECONDS`
4. Build: `npm.cmd run build`
5. Test: `npm.cmd test`

## Current Endpoints

- `GET /health/live`
- `GET /health/ready`
- `GET /api/v1/media/movie?tmdbId=550`
- `GET /api/v1/media/movie?imdbId=tt0137523`
- `GET /api/v1/media/movie?mediaId=med_...`

## Current Limits

- Movie lookup only
- TMDB provider only
- Redis is the only state store in this slice
- No search, TV, channel, BullMQ, or background refresh yet
