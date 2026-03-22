# Production Readiness Checklist

- Purpose: Provide the final pre-release checklist for implementation and operations.
- Audience: Backend engineers, reviewers, SREs, and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Runtime, security, observability, docs, and deployment readiness.
- Out of scope: Business launch approvals.
- Read with: `.ai/31-acceptance-criteria.md`, `.ai/34-non-functional-requirements.md`.

## Checklist

- `Confirmed`: Config validation fails fast on startup.
- `Confirmed`: API and worker have separate startup commands.
- `Confirmed`: Redis connection, BullMQ worker, and HTTP server shut down gracefully.
- `Confirmed`: OpenAPI spec matches implemented endpoints.
- `Confirmed`: Request, auth, provider, and refresh paths are covered by tests.
- `Confirmed`: Logs redact secrets and include request correlation.
- `Confirmed`: Metrics and readiness reflect dependency state.
- `Confirmed`: Docker build is multi-stage and runs as non-root.
- `Confirmed`: Local Compose workflow exists for Redis, auth fixture, API, and worker.
- `Confirmed`: `.env.example` documents required settings.
- `Confirmed`: `.ai/*` docs match implemented behavior and `.ai/initial/*` remains historical only.
- `Confirmed`: Queue jobs are validated on enqueue and execution, and cache corruption triggers eviction plus safe fallback.
- `Confirmed`: Real Redis and BullMQ validation exists beyond the mock-heavy baseline.
