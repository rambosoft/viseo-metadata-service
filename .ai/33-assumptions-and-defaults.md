# Assumptions And Defaults

- Purpose: Record the chosen defaults and remaining assumptions that shape implementation.
- Audience: Backend engineers, reviewers, and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Confirmed decisions, inferred assumptions, and proposed defaults.
- Out of scope: Historical alternatives.
- Read with: `.ai/decision-register.md`, `.ai/open-questions.md`.

## Confirmed

- Metadata API is the canonical product.
- Multi-tenant core is in MVP.
- Redis-first storage is canonical for MVP.
- TMDB is the primary provider for lookup normalization and the only active search provider in MVP.
- Official IMDb API is approved and implemented as an optional capability for lookup enrichment and `imdbId` fallback.
- Hybrid search is in MVP.
- Local index contains fetched records and cached search results only.

## Inferred

- The service is read-heavy and benefits from background refresh over synchronous refetching.
- Provider contracts will evolve, so adapter isolation must remain strict.
- Official IMDb access requires AWS-authenticated requests plus the subscribed dataset identifiers.

## Proposed Defaults

- Auth adapter returns `principalId`, `tenantId`, `scopes`, and `expiresAt`.
- TMDB acts as the primary source for movies and TV shows.
- Official IMDb overrides `rating` only when configured and does not participate in provider search for MVP.
- `channel` stays reserved but unimplemented in MVP.
