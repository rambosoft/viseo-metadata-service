# Implementation Strategy

- Purpose: Define the execution strategy for building the service from scratch.
- Audience: Backend engineers, leads, and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Delivery phases, sequencing logic, and phase exit criteria.
- Out of scope: Project management process outside engineering delivery.
- Read with: `.ai/14-feature-map.md`, `.ai/15-feature-implementation-order.md`, `.ai/35-production-readiness-checklist.md`.

## Delivery Phases

1. `Confirmed`: Foundation
   - bootstrap project, config, logging, Redis, health, OpenAPI shell
2. `Confirmed`: Domain and contracts
   - media entities, provider ports, auth port, Redis repository ports, error taxonomy
3. `Confirmed`: Request boundary
   - auth cache, tenant context, rate limiting, validation, request IDs
4. `Confirmed`: Redis snapshot and cache core
   - lookup keys, search snapshots, local index, single-flight, freshness rules
5. `Confirmed`: Provider flows
   - TMDB adapter, official IMDb adapter, normalization, and rating-only precedence rules
6. `Confirmed`: Public API
   - lookup and search endpoints, response envelopes, OpenAPI accuracy
7. `Confirmed`: Background refresh
   - BullMQ, cleanup, stale refresh, hot-record warmup
8. `Confirmed`: Hardening
   - metrics, readiness, resilience, performance tests, Docker polish

## Exit Criteria

- `Confirmed`: Do not start a later phase before the contracts from the earlier phase are stable.
- `Confirmed`: Each phase must land with tests, docs, and observability coverage for the new behavior.
