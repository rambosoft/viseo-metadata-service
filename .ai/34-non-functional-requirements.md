# Non-Functional Requirements

- Purpose: State the production-facing quality requirements for the MVP system.
- Audience: Backend engineers, SREs, reviewers, and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Performance, reliability, security, observability, and scalability.
- Out of scope: Commercial SLAs and pricing tiers.
- Read with: `.ai/24-error-handling.md`, `.ai/30-testing-strategy.md`, `.ai/32-risk-register.md`.

## Performance

- `Confirmed`: Hot-cache lookup target is p95 under 100 ms.
- `Confirmed`: Cache-miss lookup target is bounded by configured provider timeouts and should remain under 2 s when providers are healthy.
- `Confirmed`: Search latency must remain bounded by cached snapshots or provider timeout budgets.

## Reliability

- `Confirmed`: Graceful shutdown is required for API and worker processes.
- `Confirmed`: Stale-while-revalidate is allowed only when the last known good record is marked servable.
- `Confirmed`: Failed refresh jobs must not corrupt existing canonical state.

## Security

- `Confirmed`: Token hashing before Redis storage.
- `Confirmed`: Runtime validation at all trust boundaries.
- `Confirmed`: Rate limiting and request size limits at the edge.
- `Confirmed`: No secret logging.

## Observability

- `Confirmed`: Structured logs, request IDs, tenant IDs, and dependency status.
- `Confirmed`: Metrics for request latency, cache status, provider latency, job outcomes, and auth cache hits.
- `Confirmed`: Liveness and readiness endpoints.

## Scalability

- `Confirmed`: API nodes remain stateless except for in-process single-flight state.
- `Confirmed`: Cross-instance coordination relies on Redis and BullMQ.
