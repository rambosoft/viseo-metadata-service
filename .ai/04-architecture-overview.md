# Architecture Overview

- Purpose: Describe the approved system architecture and the main request and refresh flows.
- Audience: Backend engineers, reviewers, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Layers, boundaries, core flows, and invariants.
- Out of scope: Field-level schemas and endpoint minutiae.
- Read with: `.ai/05-domain-boundaries.md`, `.ai/12-folder-structure.md`, `.ai/20-domain-model.md`, `.ai/23-state-management.md`.

## Architectural Style

- `Confirmed`: Ports-and-adapters.
- `Confirmed`: Domain-first modular layering.
- `Confirmed`: Request path is thin; refresh and maintenance work happen off the request path.

## Approved Layers

1. HTTP adapter
2. Application/use-case layer
3. Domain model and policies
4. Ports
5. Adapters:
   - auth service
   - TMDB
   - IMDb-compatible provider boundary reserved for a later approved binding
   - Redis
   - BullMQ
   - observability

## Core Invariants

- `Confirmed`: Domain code imports no Express, Redis, BullMQ, or provider client code.
- `Confirmed`: All external payloads are validated before entering domain logic.
- `Confirmed`: Every cache key, lock key, and job payload is tenant-aware.
- `Confirmed`: Canonical responses are built from internal normalized models only.

## Request Flow

1. Validate auth token and derive tenant context.
2. Build request fingerprint and tenant-aware Redis keys.
3. Check lookup cache or search snapshot.
4. If a fresh cached result exists, return it.
5. If stale-but-servable data exists, return it and enqueue refresh.
6. If no usable record exists, execute provider retrieval under single-flight.
7. Normalize, store snapshot state in Redis, update local fetched-record index, and respond.

## Refresh Flow

1. Worker receives a validated refresh job.
2. Provider adapter fetches and validates upstream data.
3. Normalizer builds provider snapshot and canonical record.
4. Hash comparison decides whether canonical content is rewritten or only freshness-derived state is refreshed.
5. Last-known-good canonical state is preserved when the provider fails.
6. Related hot lookup state and search index entries are refreshed or cleaned up by dedicated maintenance jobs.
