# Domain Model

- Purpose: Define the canonical domain entities, value objects, and invariants.
- Audience: Backend engineers and coding agents.
- Authority: Canonical contracts document.
- Owner: Project maintainers and implementation agents.
- In scope: Business entities and invariants.
- Out of scope: Redis serialization detail.
- Read with: `.ai/21-schema-contracts.md`, `.ai/23-state-management.md`.

## Entities

- `Confirmed`: `MediaRecord`
  - canonical media data served by the API
- `Confirmed`: `ProviderSnapshot`
  - validated provider-specific representation used for traceability and refresh comparison
- `Confirmed`: `SearchSnapshot`
  - cached provider-backed query result plus pagination metadata
- `Confirmed`: `AuthContext`
  - validated principal and tenant access information

## Value Objects

- `Confirmed`: `MediaId`
- `Confirmed`: `MediaKind`
- `Confirmed`: `ProviderName`
- `Confirmed`: `LocaleCode`
- `Confirmed`: `ContentHash`
- `Confirmed`: `RequestFingerprint`
- `Confirmed`: `TenantId`

## Invariants

- `Confirmed`: Every `MediaRecord` belongs to one tenant scope for storage and cache purposes.
- `Confirmed`: Every `MediaRecord` has at least one provider-backed identifier.
- `Confirmed`: Canonical records do not depend on raw provider payload structure after normalization.
- `Confirmed`: `SearchSnapshot` entries reference canonical record IDs or canonical search items only.
- `Proposed`: `channel` remains a legal domain enum value but is not used in MVP routes or jobs.
