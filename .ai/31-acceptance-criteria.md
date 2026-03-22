# Acceptance Criteria

- Purpose: Define the implementation-ready criteria for calling the MVP complete.
- Audience: Technical leads, reviewers, and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Behavioral, operational, and documentation acceptance.
- Out of scope: Commercial launch process.
- Read with: `.ai/30-testing-strategy.md`, `.ai/35-production-readiness-checklist.md`, `.ai/43-agent-definition-of-done.md`.

## Functional Acceptance

- `Confirmed`: Movie lookup works by `mediaId`, `tmdbId`, and `imdbId`.
- `Confirmed`: TV-show lookup works by `mediaId`, `tmdbId`, and `imdbId`.
- `Confirmed`: Search returns deterministic paged results.
- `Confirmed`: Responses use the canonical envelope and error taxonomy.
- `Confirmed`: No `channel` implementation is required for MVP acceptance.

## Technical Acceptance

- `Confirmed`: Redis-first lookup and search flows work end to end.
- `Confirmed`: Duplicate concurrent misses are deduplicated.
- `Confirmed`: Provider responses cannot enter stored state unvalidated.
- `Confirmed`: Background refresh is idempotent and retry-safe.
- `Confirmed`: Tenant context is enforced across auth, keys, jobs, and logs.

## Documentation Acceptance

- `Confirmed`: `.ai/*` remains the active source of truth.
- `Confirmed`: `.ai/initial/*` is clearly deprecated and historical.
- `Confirmed`: OpenAPI matches implemented routes and envelopes.
