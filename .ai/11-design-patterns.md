# Design Patterns

- Purpose: Normalize the approved patterns and reject ambiguous or conflicting ones.
- Audience: Backend engineers and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Approved patterns, rejected patterns, and where each applies.
- Out of scope: Line-by-line implementation recipes.
- Read with: `.ai/04-architecture-overview.md`, `.ai/10-coding-standards.md`, `.ai/16-integration-rules.md`.

## Approved Patterns

- `Confirmed`: Ports-and-adapters for all infrastructure and provider dependencies.
- `Confirmed`: Composition root for startup wiring.
- `Confirmed`: Repository pattern for Redis-backed snapshot and cache access.
- `Confirmed`: Mapper/normalizer pattern for provider-to-canonical transformations.
- `Confirmed`: Single-flight for duplicate in-flight lookups.
- `Confirmed`: Stale-while-revalidate for servable stale records.
- `Confirmed`: Idempotent background jobs with bounded retries.

## Pattern Rules

- `Confirmed`: Keep provider-specific branching inside provider adapters or normalizers.
- `Confirmed`: Keep freshness and caching policy in domain/application logic, not in route handlers.
- `Confirmed`: Use explicit policy objects or functions for TTL, refresh, and fallback decisions.

## Rejected Patterns

- `Confirmed`: Heavy framework DI containers as a default.
- `Confirmed`: ODM-driven domain modeling.
- `Confirmed`: Framework-specific domain services.
- `Confirmed`: In-place mutation of shared cached payloads.
