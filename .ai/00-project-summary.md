# Project Summary

- Purpose: Give the shortest authoritative description of the project, its problem, and its approved system shape.
- Audience: New engineers, technical reviewers, and coding agents.
- Authority: Canonical foundation document.
- Owner: Project maintainers and implementation agents.
- In scope: Project identity, stable terminology, and core constraints.
- Out of scope: Low-level contracts and step-by-step implementation.
- Read with: `.ai/01-product-goals.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/04-architecture-overview.md`.

## Project Definition

- `Confirmed`: Viseo Metadata Service is a multi-tenant media metadata API.
- `Confirmed`: The service resolves, normalizes, caches, and serves metadata for movies and TV shows.
- `Confirmed`: TMDB and an IMDb-compatible provider are the MVP metadata sources.
- `Confirmed`: Redis is the MVP operational store for canonical snapshots, cached search results, lookup caches, and local fetched-record index state.
- `Confirmed`: Authentication is external, but tenant context and auth caching are part of this service.

## Stable Terminology

- `Confirmed`: `tenant` means the isolated customer or access boundary derived from auth context.
- `Confirmed`: `canonical record` means the normalized internal metadata representation served by the API.
- `Confirmed`: `provider snapshot` means the validated provider-specific data retained for refresh comparison and traceability.
- `Confirmed`: `lookup cache` means the Redis entry for an identifier-based media response.
- `Confirmed`: `local index` means Redis-backed search acceleration over records the system has already fetched.

## Scope Headline

- `Confirmed`: MVP is a read-heavy API with background refresh and deterministic contracts.
- `Confirmed`: MVP is not a playlist gateway, streaming platform, or generic catalog ingestion system.
- `Proposed`: `channel` remains a reserved media kind but is out of MVP implementation because the approved providers do not cover it well.
