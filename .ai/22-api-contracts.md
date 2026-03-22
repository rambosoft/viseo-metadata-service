# API Contracts

- Purpose: Define the public HTTP surface and response behavior for MVP.
- Audience: Backend engineers, API consumers, and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Endpoints, parameters, envelopes, and HTTP behavior.
- Out of scope: Internal storage detail.
- Read with: `.ai/21-schema-contracts.md`, `.ai/24-error-handling.md`, `.ai/31-acceptance-criteria.md`.

## Authenticated Endpoints

- `Confirmed`: `GET /api/v1/media/movie`
- `Confirmed`: `GET /api/v1/media/tv`
- `Confirmed`: `GET /api/v1/media/search`

## Operational Endpoints

- `Confirmed`: `GET /health/live`
- `Confirmed`: `GET /health/ready`
- `Confirmed`: `GET /openapi.json`
- `Proposed`: `GET /docs`

## Lookup Rules

- `Confirmed`: Exactly one identifier mode is allowed:
  - `mediaId`
  - `tmdbId`
  - `imdbId`
- `Confirmed`: `lang` defaults to `en`.
- `Confirmed`: Lookup is tenant-scoped even when identifiers look globally unique.
- `Confirmed`: `channel` lookup endpoint is not part of MVP.

## Search Rules

- `Confirmed`: Parameters are `q`, `kind?`, `lang?`, `page?`, `pageSize?`.
- `Confirmed`: Omitted `kind` searches across movie and TV only.
- `Confirmed`: Search first checks cached query snapshots.
- `Confirmed`: Local index may accelerate results only for previously fetched records.

## Response Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "tenantId": "ten_123",
    "source": "cache",
    "stale": false
  }
}
```

## Error Envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Exactly one identifier must be provided",
    "retryable": false,
    "requestId": "req_123"
  }
}
```

## Status Codes

- `Confirmed`: `200` success
- `Confirmed`: `400` validation failure
- `Confirmed`: `401` authentication failure
- `Confirmed`: `403` authorization failure
- `Confirmed`: `404` not found
- `Confirmed`: `429` rate limited
- `Confirmed`: `502` provider dependency failure when no safe fallback exists
- `Confirmed`: `503` internal dependency unavailable
