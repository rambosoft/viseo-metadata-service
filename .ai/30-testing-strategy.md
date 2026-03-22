# Testing Strategy

- Purpose: Define the test layers required for implementation readiness.
- Audience: Backend engineers and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Unit, integration, contract, route, and performance testing.
- Out of scope: External team QA process.
- Read with: `.ai/31-acceptance-criteria.md`, `.ai/35-production-readiness-checklist.md`.

## Required Test Layers

- `Confirmed`: Unit tests for normalization, hashing, freshness, and key-building logic.
- `Confirmed`: Integration tests for Redis repositories, auth cache behavior, and BullMQ job flows.
- `Confirmed`: Contract tests for TMDB and IMDb-compatible adapters.
- `Confirmed`: Route tests for lookup, search, auth failure, rate limiting, and stale fallback.
- `Confirmed`: Performance tests for hot-cache lookup, concurrent deduplication, and stale-refresh behavior.

## Test Rules

- `Confirmed`: Tests must cover both happy path and failure path behavior.
- `Confirmed`: Provider adapters must be tested against representative provider payload fixtures.
- `Confirmed`: Any fallback that serves stale data must have direct tests.
