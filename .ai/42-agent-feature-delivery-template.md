# Agent Feature Delivery Template

- Purpose: Provide the standard template for implementing one feature slice.
- Audience: Coding agents and maintainers.
- Authority: Canonical agent-enablement document.
- Owner: Project maintainers and implementation agents.
- In scope: Feature-delivery checklist and output structure.
- Out of scope: Project-wide planning.
- Read with: `.ai/15-feature-implementation-order.md`, `.ai/43-agent-definition-of-done.md`.

## Template

1. Feature name
2. Scope statement
3. Canonical docs consulted
4. Contracts touched
5. Files or modules to add or update
6. Risks and fallback behavior
7. Tests to add
8. Docs to update

## Minimum Checklist

- `Confirmed`: Contract is explicit before code is written.
- `Confirmed`: Validation and error behavior are included.
- `Confirmed`: Observability is included.
- `Confirmed`: Tenant isolation is preserved.
- `Confirmed`: Tests and doc updates ship with the feature.
