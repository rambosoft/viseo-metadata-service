# State Management

- Purpose: Define where state lives and who owns it at runtime.
- Audience: Backend engineers and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Request state, Redis state, job state, and ownership boundaries.
- Out of scope: UI or client-side state.
- Read with: `.ai/04-architecture-overview.md`, `.ai/20-domain-model.md`, `.ai/21-schema-contracts.md`.

## State Ownership

- `Confirmed`: Request-scoped auth and tenant context belongs to the request boundary.
- `Confirmed`: Canonical media snapshots belong to the Redis store adapter.
- `Confirmed`: Search snapshots belong to the Redis store adapter.
- `Confirmed`: Local fetched-record index state belongs to the Redis store adapter.
- `Confirmed`: In-flight deduplication state exists in short-lived Redis coordination keys for cross-instance request suppression.
- `Confirmed`: Job execution state belongs to BullMQ and worker logic.

## Runtime Rules

- `Confirmed`: Use a request-context carrier equivalent to `res.locals` or AsyncLocalStorage for request ID and tenant context.
- `Confirmed`: Never derive tenant context from query or body data.
- `Confirmed`: Never let handler-local mutable objects become shared canonical state.
- `Confirmed`: Any state read from Redis must be validated before use.
