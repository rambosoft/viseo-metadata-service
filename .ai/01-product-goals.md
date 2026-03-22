# Product Goals

- Purpose: State the business, product, and engineering goals the implementation must satisfy.
- Audience: Product owners, technical leads, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Goals, non-goals, and success framing.
- Out of scope: Detailed route and storage contracts.
- Read with: `.ai/00-project-summary.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/31-acceptance-criteria.md`.

## Core Goals

- `Confirmed`: Reduce direct upstream metadata calls through caching and refresh.
- `Confirmed`: Provide a stable canonical API independent of provider quirks.
- `Confirmed`: Keep hot reads low-latency and predictable under concurrency.
- `Confirmed`: Preserve tenant isolation across auth, cache keys, jobs, and logs.
- `Confirmed`: Make provider expansion possible without rewriting core business logic.

## Engineering Goals

- `Confirmed`: Use strict TypeScript, runtime validation, and explicit contracts.
- `Confirmed`: Keep framework, provider, and storage details out of domain logic.
- `Confirmed`: Make failures diagnosable through logs, metrics, health, and clear error envelopes.
- `Confirmed`: Keep the system easy for another coding agent to build from scratch.

## Non-Goals

- `Confirmed`: No streaming, transcoding, or content delivery.
- `Confirmed`: No playlist ingestion from Xtream or M3U sources in this project version.
- `Confirmed`: No commercial quota-tier enforcement in MVP.
- `Confirmed`: No broad provider-catalog sync in MVP.
- `Confirmed`: No field-by-field blended canonical record assembled from both providers.
