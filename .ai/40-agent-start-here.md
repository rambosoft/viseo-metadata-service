# Agent Start Here

- Purpose: Give a coding agent the minimum required reading order and execution rules before implementation starts.
- Audience: Coding agents and new engineers.
- Authority: Canonical agent-enablement document.
- Owner: Project maintainers and implementation agents.
- In scope: Reading order, first tasks, and non-negotiable guardrails.
- Out of scope: Detailed feature behavior.
- Read with: `.ai/README.md`, `.ai/15-feature-implementation-order.md`, `.ai/41-agent-task-execution-rules.md`.

## Required Reading

1. `.ai/README.md`
2. `.ai/00-project-summary.md`
3. `.ai/02-scope-mvp-vs-post-mvp.md`
4. `.ai/04-architecture-overview.md`
5. `.ai/20-domain-model.md`
6. `.ai/21-schema-contracts.md`
7. `.ai/22-api-contracts.md`
8. `.ai/15-feature-implementation-order.md`
9. `.ai/41-agent-task-execution-rules.md`

## Current Baseline

- `Confirmed`: Build the movie lookup path first.
- `Confirmed`: Include config, auth boundary, Redis snapshot flow, TMDB adapter, route contract, and tests.
- `Confirmed`: Movie lookup, TV lookup, search, stale lookup fallback, refresh worker flow, cleanup and warmup job support, metrics, readiness detail, and Docker packaging are now implemented.
- `Confirmed`: The next implementation target is real-environment Redis and BullMQ validation plus any remaining operational hardening.
- `Confirmed`: IMDb-compatible provider work is deferred until a commercially approved provider is selected.

## Non-Negotiable Rules

- `Confirmed`: Ignore `.ai/initial/*` for implementation decisions unless tracing history.
- `Confirmed`: Do not reintroduce superseded non-metadata ingestion architecture.
- `Confirmed`: Do not implement `channel` in MVP.
