# Domain Boundaries

- Purpose: Define the service modules and what each one owns.
- Audience: Backend engineers, reviewers, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Domain ownership, integration boundaries, and cross-cutting concerns.
- Out of scope: Folder-level naming detail.
- Read with: `.ai/04-architecture-overview.md`, `.ai/20-domain-model.md`, `.ai/16-integration-rules.md`.

## Bounded Areas

- `Confirmed`: Auth and tenant context
  - Owns bearer-token validation result, tenant extraction, and request context.
- `Confirmed`: Metadata retrieval
  - Owns lookup orchestration, search orchestration, provider selection, and refresh policies.
- `Confirmed`: Canonical normalization
  - Owns media kind mapping, identifier mapping, and provider-to-canonical transformations.
- `Confirmed`: Snapshot storage and index state
  - Owns Redis persistence shapes, lookup caches, search snapshots, and fetched-record search acceleration.
- `Confirmed`: Background refresh
  - Owns stale refresh, cleanup, retry, and warmup job flows.
- `Confirmed`: Observability and runtime config
  - Owns logs, metrics, health, readiness, config validation, and shutdown behavior.

## Boundary Rules

- `Confirmed`: Provider adapters never decide API envelopes.
- `Confirmed`: HTTP handlers never decide storage formats.
- `Confirmed`: Auth adapter never writes metadata state.
- `Confirmed`: Redis adapter never performs provider-specific normalization.
- `Proposed`: Channel-specific logic remains outside current MVP boundaries.
