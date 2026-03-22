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
- `Confirmed`: TMDB is the primary metadata provider for lookup normalization and the only active search provider in MVP.
- `Confirmed`: Official IMDb API is implemented as an optional capability for lookup enrichment and fallback by `imdbId`.
- `Confirmed`: Redis is the MVP operational store for canonical snapshots, cached search results, lookup caches, and local fetched-record index state.
- `Confirmed`: Authentication is external, but tenant context and auth caching are part of this service.
- `Confirmed`: Local MVP operation can run with Compose plus a service-owned auth fixture, while TMDB and IMDb stay real.

## Stable Terminology

- `Confirmed`: `tenant` means the isolated customer or access boundary derived from auth context.
- `Confirmed`: `canonical record` means the normalized internal metadata representation served by the API.
- `Confirmed`: `provider snapshot` means the validated provider-specific data retained for refresh comparison and traceability.
- `Confirmed`: `lookup cache` means the Redis entry for an identifier-based media response.
- `Confirmed`: `local index` means Redis-backed search acceleration over records the system has already fetched.
- `Confirmed`: `IMDb enrichment` means official IMDb lookup data may override the public `rating` field only.

## Scope Headline

- `Confirmed`: MVP is a read-heavy API with background refresh and deterministic contracts.
- `Confirmed`: MVP is not a streaming platform, media-delivery system, or broad catalog-ingestion platform.
- `Proposed`: `channel` remains a reserved media kind but is out of MVP implementation because the approved providers do not cover it well.
