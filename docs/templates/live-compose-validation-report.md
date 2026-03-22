# Live Compose Validation Report

## Run Metadata

- Date:
- Machine:
- Operator:
- Node version:
- Docker version:
- Compose version:

## Commands Run

```text
npm.cmd run compose:up
npm.cmd run test:providers:live
npm.cmd run compose:smoke
set REDIS_URL=redis://127.0.0.1:6379
npm.cmd run test:infra
npm.cmd run compose:down
```

## Environment Notes

- TMDB credential path:
- IMDb credential path:
- AWS auth mode:
- Auth fixture mode:

## Endpoint Results

- `/health/live`:
- `/health/ready`:
- `/metrics`:
- `/openapi.json`:
- `/docs`:
- Movie lookup by `tmdbId`:
- Movie lookup by `imdbId`:
- TV lookup by `tmdbId`:
- TV lookup by `imdbId`:
- Search:
- Optional IMDb fallback movie lookup:
- Optional IMDb fallback TV lookup:

## Queue And Worker Notes

- Refresh behavior:
- Cleanup behavior:
- Warmup behavior:
- Graceful shutdown notes:

## Issues Found

- None / details:

## Follow-Up Actions

- None / details:
