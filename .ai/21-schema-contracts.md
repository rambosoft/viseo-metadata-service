# Schema Contracts

- Purpose: Define the authoritative data shapes that move between layers.
- Audience: Backend engineers and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Canonical record, auth, search, and job payload shapes.
- Out of scope: Full OpenAPI examples.
- Read with: `.ai/20-domain-model.md`, `.ai/22-api-contracts.md`, `.ai/25-validation-rules.md`.

## Canonical Media Record

- `Confirmed`: Required top-level fields
  - `mediaId`
  - `tenantId`
  - `kind`
  - `canonicalTitle`
  - `identifiers`
  - `providerRefs`
  - `contentHash`
  - `freshness`
  - `schemaVersion`
  - `createdAt`
  - `updatedAt`
- `Confirmed`: Optional content fields
  - `originalTitle`
  - `description`
  - `genres`
  - `releaseDate`
  - `releaseYear`
  - `runtimeMinutes`
  - `rating`
  - `cast`
  - `images`

## Provider Snapshot

- `Confirmed`: Fields
  - `provider`
  - `providerRecordId`
  - `normalizedAt`
  - `hash`
  - `payload`
- `Confirmed`: Snapshot payload remains provider-specific but validated.

## Search Snapshot

- `Confirmed`: Fields
  - `tenantId`
  - `query`
  - `kind?`
  - `lang`
  - `page`
  - `pageSize`
  - `total?`
  - `items`
  - `sourceProviders`
  - `generatedAt`
  - `expiresAt`

## Auth Context

- `Confirmed`: Fields
  - `principalId`
  - `tenantId`
  - `scopes`
  - `expiresAt`

## Job Payloads

- `Confirmed`: `refresh_media_record`
  - `jobType`, `tenantId`, `mediaId`, `kind`, `identifiers`, `language`, `source`, `requestedAt`
- `Confirmed`: `cleanup_expired_cache`
  - `jobType`, `tenantId`, `mediaId`, `kind`, `identifiers`, `source`, `requestedAt`
- `Confirmed`: `warm_hot_record`
  - `jobType`, `tenantId`, `mediaId`, `kind`, `identifiers`, `language`, `source`, `requestedAt`
