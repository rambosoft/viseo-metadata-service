# AI Documentation Authority

- Purpose: Define the canonical AI-readable documentation set for this repository.
- Audience: Backend engineers, technical reviewers, and coding agents.
- Authority: Canonical.
- Owner: Project maintainers and implementation agents.
- In scope: Authority rules, reading order, canonical file map, and historical-doc handling.
- Out of scope: Feature-by-feature implementation detail.
- Read with: `.ai/40-agent-start-here.md`, `.ai/04-architecture-overview.md`, `.ai/15-feature-implementation-order.md`.

## Authority Rules

- `Confirmed`: Files under `.ai/` are the only authoritative implementation guidance.
- `Confirmed`: Files under `.ai/initial/` are historical source material only.
- `Confirmed`: Future implementation work must ignore `.ai/initial/*` except for traceability, audit, or conflict review.
- `Confirmed`: If `.ai/initial/*` conflicts with `.ai/*`, `.ai/*` wins.
- `Confirmed`: Governance decisions live in `.ai/decision-register.md` and `.ai/conflict-register.md`.

## Required Reading Order

1. `.ai/40-agent-start-here.md`
2. `.ai/00-project-summary.md`
3. `.ai/02-scope-mvp-vs-post-mvp.md`
4. `.ai/04-architecture-overview.md`
5. `.ai/05-domain-boundaries.md`
6. `.ai/20-domain-model.md`
7. `.ai/21-schema-contracts.md`
8. `.ai/22-api-contracts.md`
9. `.ai/15-feature-implementation-order.md`
10. `.ai/41-agent-task-execution-rules.md`

## Canonical File Map

- Foundation: `00` through `05`
- Implementation rules: `10` through `16`
- Contracts and behavior: `20` through `25`
- Quality and operations: `30` through `35`
- Agent enablement: `40` through `43`
- Governance: `audit-report.md`, `decision-register.md`, `conflict-register.md`, `open-questions.md`, `source-map.md`

## Do / Do Not

- Do use `.ai/*` first when planning or implementing.
- Do update the relevant canonical docs when behavior changes.
- Do consult `.ai/source-map.md` if you need to trace a legacy statement.
- Do not treat `.ai/initial/*` as active scope, architecture, or contract guidance.
- Do not revive superseded non-metadata architecture guidance unless a new decision explicitly replaces the current canon.
