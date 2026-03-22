# Coding Standards

- Purpose: Define the coding rules that keep the implementation deterministic and maintainable.
- Audience: Backend engineers and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Language rules, layering rules, and implementation hygiene.
- Out of scope: Product scope decisions.
- Read with: `.ai/11-design-patterns.md`, `.ai/12-folder-structure.md`, `.ai/25-validation-rules.md`.

## Required Rules

- `Confirmed`: TypeScript runs in strict mode.
- `Confirmed`: Do not use `any`; use precise types or `unknown`.
- `Confirmed`: Export explicit public types at every port and adapter boundary.
- `Confirmed`: Do not read `process.env` outside the config/bootstrap layer.
- `Confirmed`: Do not return raw Redis, BullMQ, or provider payloads from domain or application code.
- `Confirmed`: Do not put business logic in Express handlers.
- `Confirmed`: Prefer small pure functions for normalization, hashing, and freshness decisions.

## Naming

- `Confirmed`: Domain types use business language, not provider language.
- `Confirmed`: Ports end with `Port`.
- `Confirmed`: Adapter implementations end with concrete technology or provider names.
- `Confirmed`: Redis keys and schema versions are explicit and versioned.

## Do / Do Not

- Do validate at boundaries.
- Do use composition-root wiring instead of hidden global containers.
- Do write tests for behavior, not framework wiring.
- Do not pull `.ai/initial/*` into new implementation work except for historical traceability.
