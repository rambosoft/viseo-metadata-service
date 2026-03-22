# Validation Rules

- Purpose: Define the required runtime validation behavior at every boundary.
- Audience: Backend engineers and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Input, provider, cache, and job validation.
- Out of scope: Business ranking heuristics.
- Read with: `.ai/10-coding-standards.md`, `.ai/21-schema-contracts.md`, `.ai/24-error-handling.md`.

## Boundary Validation

- `Confirmed`: Validate all query, path, header, and job payload inputs with Zod.
- `Confirmed`: Validate all provider responses before normalization.
- `Confirmed`: Validate all Redis payloads before deserialize use.
- `Confirmed`: Reject unknown critical fields only where contract drift would create unsafe behavior.
- `Confirmed`: Auth payload fields required for tenant-scoped execution must be non-empty.

## Lookup Validation

- `Confirmed`: Exactly one lookup identifier is required.
- `Confirmed`: `mediaId`, `tmdbId`, and `imdbId` are strings.
- `Confirmed`: `lang` defaults to `en` and must match supported locale format.

## Search Validation

- `Confirmed`: `q` is required and trimmed.
- `Confirmed`: `page` and `pageSize` are bounded positive integers.
- `Confirmed`: `kind` is optional and limited to approved MVP kinds.

## Serialization Rules

- `Confirmed`: Schema version is explicit in stored canonical payloads and key namespaces.
- `Confirmed`: Validation failure on cached data must trigger cache eviction and safe fallback behavior.
- `Confirmed`: Job payload validation happens on both enqueue and worker execution for refresh, cleanup, and warmup flows.
