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
| P3 | How long should old provider snapshots be retained? | Affects Redis memory, observability, and audit depth | `Proposed`: keep current and previous snapshot only in MVP | Longer retention increases storage and cleanup complexity |
| P4 | When should `channel` support enter scope? | Prevents silent contract expansion | `Proposed`: defer until a channel-capable provider is approved | Earlier channel support changes scope, provider strategy, and API contracts |
| P4 | Should IMDb override any fields beyond `rating` in a later slice? | Determines whether canonical precedence rules stay simple or widen into field-level merge policy | `Proposed`: keep the current rating-only override until clear product need exists | Broader field merges would increase normalization complexity and drift risk |
