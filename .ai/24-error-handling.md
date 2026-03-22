# Error Handling

- Purpose: Define the canonical error taxonomy and fallback behavior.
- Audience: Backend engineers, reviewers, and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Error classes, HTTP mapping, retryability, and stale fallback.
- Out of scope: Provider-specific raw error details.
- Read with: `.ai/22-api-contracts.md`, `.ai/25-validation-rules.md`, `.ai/34-non-functional-requirements.md`.

## Error Taxonomy

- `Confirmed`: `validation_failed`
- `Confirmed`: `authentication_failed`
- `Confirmed`: `authorization_failed`
- `Confirmed`: `not_found`
- `Confirmed`: `rate_limited`
- `Confirmed`: `provider_unavailable`
- `Confirmed`: `dependency_unavailable`
- `Confirmed`: `internal_error`

## Fallback Rules

- `Confirmed`: If fresh cached data exists, return it.
- `Confirmed`: If stale-but-servable data exists and provider refresh is failing, return stale data with `meta.stale = true`.
- `Confirmed`: If no safe cached or canonical data exists, fail with a dependency/provider error instead of inventing partial data.
- `Confirmed`: Validation and auth errors are never retriable by the service itself.
- `Confirmed`: Background refresh failures do not mutate the last known good record.
- `Confirmed`: Upstream auth `403` is surfaced as `authorization_failed`, not collapsed into `authentication_failed`.

## Logging Rules

- `Confirmed`: Log structured error context with request ID, tenant ID, route, and dependency status.
- `Confirmed`: Never log raw bearer tokens, provider API keys, or secrets.
