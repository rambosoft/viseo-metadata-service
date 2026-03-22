# Tech Stack

- Purpose: Lock the approved platform and dependency choices for MVP.
- Audience: Backend engineers, platform engineers, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Runtime, libraries, infrastructure, and rejected alternatives.
- Out of scope: File-level implementation detail.
- Read with: `.ai/04-architecture-overview.md`, `.ai/10-coding-standards.md`, `.ai/34-non-functional-requirements.md`.

## Approved Baseline

| Concern | Decision | Status |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Confirmed |
| Language | TypeScript strict mode | Confirmed |
| Build | SWC plus `tsc --noEmit` | Confirmed |
| HTTP | Express 5 behind an adapter boundary | Confirmed |
| HTTP client | built-in `fetch` / Undici | Confirmed |
| Cache and store | Redis 7 via ioredis | Confirmed |
| Jobs | BullMQ 5 | Confirmed |
| Validation | Zod | Confirmed |
| Logging | Pino JSON logs | Confirmed |
| API docs | OpenAPI 3.1 | Confirmed |
| Containers | Docker multi-stage image | Confirmed |

## Rejected For MVP

- `Confirmed`: MongoDB is not part of the canonical MVP stack.
- `Confirmed`: Axios is not the default HTTP client.
- `Confirmed`: Winston is not the canonical logger.
- `Confirmed`: BullMQ 3-era guidance is stale and not authoritative.
- `Deferred`: Docker Compose is not required by the current canonical runtime.

## Selection Rules

- `Confirmed`: Prefer libraries that support explicit contracts, bounded retries, and graceful shutdown.
- `Confirmed`: Anything likely to churn must sit behind a port or adapter.
