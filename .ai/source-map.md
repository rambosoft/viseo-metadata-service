# Source Map

- Purpose: Map each important historical source file to the new canonical `.ai/*` documents.
- Audience: Technical reviewers, maintainers, and coding agents.
- Authority: Canonical governance record.
- Owner: Project maintainers and implementation agents.
- In scope: Supersession mapping and traceability status.
- Out of scope: Repeating the source content.
- Read with: `.ai/README.md`, `.ai/audit-report.md`, `.ai/conflict-register.md`.

| Historical Source | Canonical Replacement | Status |
| --- | --- | --- |
| `.ai/initial/deep-research-report.md` | `.ai/03-tech-stack.md`, `.ai/04-architecture-overview.md`, `.ai/10-coding-standards.md`, `.ai/11-design-patterns.md`, `.ai/16-integration-rules.md`, `.ai/32-risk-register.md`, `.ai/34-non-functional-requirements.md` | Partially merged; historical traceability retained |
| `.ai/initial/Detailed Task Breakdown - Media Metadata API Service.md` | `.ai/13-implementation-strategy.md`, `.ai/15-feature-implementation-order.md`, `.ai/31-acceptance-criteria.md`, `.ai/35-production-readiness-checklist.md`, `.ai/40-agent-start-here.md`, `.ai/41-agent-task-execution-rules.md`, `.ai/42-agent-feature-delivery-template.md`, `.ai/43-agent-definition-of-done.md` | Fully replaced |
| `.ai/initial/Media Metadata API Service - Node js TypeScript.md` | `.ai/00-project-summary.md`, `.ai/01-product-goals.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/22-api-contracts.md`, `.ai/24-error-handling.md`, `.ai/25-validation-rules.md`, `.ai/31-acceptance-criteria.md` | Fully replaced |
| `.ai/initial/Project Scope - Media Metadata API Service.md` | `.ai/00-project-summary.md`, `.ai/01-product-goals.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/05-domain-boundaries.md`, `.ai/22-api-contracts.md`, `.ai/33-assumptions-and-defaults.md` | Fully replaced |
| `.ai/initial/Technical Specifications - Media Metadata API Service.md` | `.ai/03-tech-stack.md`, `.ai/04-architecture-overview.md`, `.ai/12-folder-structure.md`, `.ai/20-domain-model.md`, `.ai/21-schema-contracts.md`, `.ai/22-api-contracts.md`, `.ai/23-state-management.md`, `.ai/24-error-handling.md`, `.ai/25-validation-rules.md`, `.ai/30-testing-strategy.md`, `.ai/34-non-functional-requirements.md` | Fully replaced |
## Mapping Notes

- `Confirmed`: Xtream/M3U guidance was not preserved as active implementation scope.
- `Confirmed`: MongoDB-first metadata guidance was intentionally rejected for MVP despite appearing in multiple historical files.
- `Confirmed`: Only statements absorbed into `.ai/*` remain active.
