# Integration Rules

- Purpose: Define the rules each subsystem must follow when integrating with another subsystem.
- Audience: Backend engineers and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Provider, auth, Redis, job, and HTTP integration constraints.
- Out of scope: Internal helper implementation detail.
- Read with: `.ai/05-domain-boundaries.md`, `.ai/21-schema-contracts.md`, `.ai/24-error-handling.md`.

## Provider Integration

- `Confirmed`: Every provider adapter validates raw responses before returning.
- `Confirmed`: Every provider adapter returns a normalized provider model plus snapshot metadata.
- `Confirmed`: Provider timeouts and retries are explicit and bounded.

## Redis Integration

- `Confirmed`: Every key includes version and tenant context.
- `Confirmed`: Cached payloads are validated on deserialize.
- `Confirmed`: Single-flight coordination uses short-lived keys only.
- `Confirmed`: Local index writes occur only after canonical record writes succeed.

## Auth Integration

- `Confirmed`: Tenant context comes from validated auth results, not request query or body fields.
- `Confirmed`: Token cache TTL never exceeds upstream token expiry.
- `Confirmed`: Missing or empty `principalId`, `tenantId`, `scopes`, or `expiresAt` in auth responses is treated as invalid auth data.
- `Confirmed`: Upstream `401` maps to authentication failure and upstream `403` maps to authorization failure.

## HTTP Integration

- `Confirmed`: Handlers map domain/application results into stable envelopes only.
- `Confirmed`: Validation happens before use-case execution.
- `Confirmed`: Request IDs, tenant IDs, and cache status appear in logs and response metadata where appropriate.

## Job Integration

- `Confirmed`: Job payloads are schema-validated on enqueue and execution.
- `Confirmed`: Jobs are idempotent and safe to retry.
- `Confirmed`: Refresh, cleanup, and warmup jobs share the same tenant-aware queue boundary.
