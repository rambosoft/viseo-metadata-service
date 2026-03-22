# Manual Test Fixtures

## Purpose

This folder provides a small local-only auth fixture harness for manual validation of the metadata service.

It exists so maintainers can:

- boot a fake auth service quickly
- run the real API and worker against real Redis and BullMQ
- keep TMDB real, using a user-provided `TMDB_API_KEY`
- exercise `200`, `401`, and `403` auth paths without depending on an external auth server

TMDB and any future IMDb-compatible provider are intentionally **not** mocked here.

## Files

- `fixture-config.mjs`
  - reads local fixture settings from environment variables
- `fixture-data.mjs`
  - owns deterministic auth payload builders and printed instructions
- `run-fixtures.mjs`
  - starts the fake auth service

## Fixture Contract

- `GET /health/live`
  - returns fixture liveness and current mode
- `POST /validate`
  - `success` mode returns a deterministic auth context
  - `401` mode returns unauthorized
  - `403` mode returns forbidden

In `success` mode, both the bearer token and JSON body token must match `MANUAL_FIXTURE_TOKEN`.

## Configuration

- `MANUAL_FIXTURE_AUTH_PORT`
- `MANUAL_FIXTURE_BIND_HOST`
- `MANUAL_FIXTURE_TOKEN`
- `MANUAL_FIXTURE_AUTH_MODE`
  - `success`, `401`, or `403`
- `MANUAL_FIXTURE_TENANT_ID`
- `MANUAL_FIXTURE_PRINCIPAL_ID`
- `MANUAL_FIXTURE_SCOPES`
- `MANUAL_FIXTURE_EXPIRES_IN_SECONDS`

Defaults are documented in `.env.example`.

## How To Use

Local auth fixture only:

```bash
npm.cmd run fixtures:manual
```

Full local stack with Compose:

```bash
npm.cmd run compose:up
```

Then use the real service endpoints with:

- Redis running in Compose
- auth fixture running in Compose
- your real `TMDB_API_KEY`

## Guardrails

- Do not move production logic into this folder.
- Do not make the real app depend on these scripts.
- Keep the fixture focused on service-owned dependencies only.
- Treat this harness as a local operator tool, not as a substitute for automated negative-path tests.
