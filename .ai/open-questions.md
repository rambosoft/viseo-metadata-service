# Open Questions

- Purpose: Track the remaining non-blocking questions after the canonical documentation redesign.
- Audience: Product owners, technical leads, and coding agents.
- Authority: Canonical governance record.
- Owner: Project maintainers and implementation agents.
- In scope: Deferred questions, why they matter, defaults, and consequences.
- Out of scope: Already-resolved product decisions.
- Read with: `.ai/audit-report.md`, `.ai/33-assumptions-and-defaults.md`.

## Current Status

- `Confirmed`: No blocking clarification is required before coding can start.

| Priority | Question | Why It Matters | Recommended Default | Consequence If Chosen Differently |
| --- | --- | --- | --- | --- |
| P2 | Which IMDb-compatible provider is approved for MVP? | Determines adapter details, quotas, and field coverage | `Proposed`: implement an abstract IMDb-compatible port and bind it later to the approved vendor | A concrete vendor choice may require contract and rate-limit changes |
| P2 | What exact auth-service response shape is guaranteed? | Shapes cached auth context and tenant extraction | `Proposed`: require `principalId`, `tenantId`, `scopes`, and `expiresAt` | Different fields may require auth adapter remapping and new validation |
| P3 | How long should old provider snapshots be retained? | Affects Redis memory, observability, and audit depth | `Proposed`: keep current and previous snapshot only in MVP | Longer retention increases storage and cleanup complexity |
| P3 | Should warmup target only hot records or also frequent search queries? | Affects job volume and Redis footprint | `Proposed`: warm only hot records in MVP | Query warmup adds queue complexity and invalidation rules |
| P4 | When should `channel` support enter scope? | Prevents silent contract expansion | `Proposed`: defer until a channel-capable provider is approved | Earlier channel support changes scope, provider strategy, and API contracts |
