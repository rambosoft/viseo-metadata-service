# Agent Task Execution Rules

- Purpose: Define how agents should execute feature work without reintroducing ambiguity.
- Audience: Coding agents and maintainers.
- Authority: Canonical agent-enablement document.
- Owner: Project maintainers and implementation agents.
- In scope: Task execution rules, documentation update rules, and conflict handling.
- Out of scope: Product scope negotiation.
- Read with: `.ai/40-agent-start-here.md`, `.ai/42-agent-feature-delivery-template.md`.

## Execution Rules

- `Confirmed`: Start from `.ai/*`, never from `.ai/initial/*`.
- `Confirmed`: Treat unresolved questions in `.ai/open-questions.md` as defaults unless the task explicitly depends on them.
- `Confirmed`: Preserve tenant-aware behavior in every cache key, job payload, and request log.
- `Confirmed`: Keep provider-specific logic behind adapters.
- `Confirmed`: Update the relevant canonical docs when implementation materially changes behavior.

## Conflict Handling

- `Confirmed`: If code or instructions conflict with `.ai/*`, raise the conflict instead of guessing.
- `Confirmed`: If `.ai/initial/*` conflicts with `.ai/*`, follow `.ai/*`.
- `Confirmed`: If a task implicitly needs channel support, stop and treat it as out of current MVP scope.
