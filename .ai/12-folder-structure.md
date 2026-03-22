# Folder Structure

- Purpose: Define the target repo layout so agents and humans build the same system shape.
- Audience: Backend engineers and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Top-level source layout and ownership.
- Out of scope: Test fixture organization details.
- Read with: `.ai/04-architecture-overview.md`, `.ai/05-domain-boundaries.md`.

## Target Structure

```text
src/
  core/
    media/
      entities/
      value-objects/
      services/
    auth/
    shared/
  ports/
    auth/
    providers/
    storage/
    jobs/
    observability/
  application/
    lookup/
    search/
    refresh/
  adapters/
    http-express/
    auth-http/
    provider-tmdb/
    provider-imdb/
    redis-store/
    jobs-bullmq/
    telemetry/
  config/
  bootstrap/
  tests/
```

## Rules

- `Confirmed`: `core/` contains no infrastructure imports.
- `Confirmed`: `ports/` define contracts only.
- `Confirmed`: `application/` orchestrates use cases and policies.
- `Confirmed`: `adapters/` implement ports and contain technology-specific code.
- `Confirmed`: `bootstrap/` owns lifecycle and dependency wiring.
