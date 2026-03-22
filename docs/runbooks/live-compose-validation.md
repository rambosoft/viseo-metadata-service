# Live Compose Validation Runbook

Use this runbook on a machine with Docker installed to validate the full MVP stack against real Redis, BullMQ, TMDB, and the official IMDb API.

## Prerequisites

- Docker with Compose support
- Node.js 24
- Real TMDB credentials in `.env`
- Official IMDb API credentials in `.env`
- One of:
  - direct AWS credentials in `.env`
  - `AWS_PROFILE` in `.env` plus an `.aws` mount via `compose.aws-profile.yaml`

## Required Environment

Minimum `.env` values:

- `TMDB_API_KEY`
- `IMDB_API_KEY`
- `IMDB_DATA_SET_ID`
- `IMDB_REVISION_ID`
- `IMDB_ASSET_ID`
- `IMDB_AWS_REGION`

Recommended smoke IDs:

- `SMOKE_MOVIE_TMDB_ID=550`
- `SMOKE_MOVIE_IMDB_ID=tt0137523`
- `SMOKE_TV_TMDB_ID=1396`
- `SMOKE_TV_IMDB_ID=tt0903747`
- optional fallback IDs:
  - `SMOKE_IMDB_FALLBACK_MOVIE_ID`
  - `SMOKE_IMDB_FALLBACK_TV_ID`

## Start The Stack

Direct credential mode:

```bash
npm.cmd run compose:up
```

AWS profile mode:

```bash
docker compose -f compose.yaml -f compose.aws-profile.yaml up --build
```

## Validate

1. Check provider connectivity:

```bash
npm.cmd run test:providers:live
```

2. Check the running API and worker stack:

```bash
npm.cmd run compose:smoke
```

3. Optional real Redis/BullMQ suite:

```bash
set REDIS_URL=redis://127.0.0.1:6379
npm.cmd run test:infra
```

## Expected Results

- `GET /health/live` returns `200`
- `GET /health/ready` returns `200`
- `GET /metrics` returns Prometheus text
- `GET /openapi.json` returns OpenAPI 3.1
- `GET /docs` renders the interactive docs UI
- movie lookup by `tmdbId` succeeds
- movie lookup by `imdbId` succeeds
- TV lookup by `tmdbId` succeeds
- TV lookup by `imdbId` succeeds
- search succeeds through TMDB
- if fallback IDs are configured, IMDb-only fallback lookups succeed

## Capture Evidence

Fill out [live-compose-validation-report.md](/C:/workspace/viseo-metadata-service/docs/templates/live-compose-validation-report.md) with:

- machine/date
- exact commands run
- endpoint results
- queue behavior notes
- any operational hardening issues discovered

## Shutdown

```bash
npm.cmd run compose:down
```
