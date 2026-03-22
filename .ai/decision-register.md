# Decision Register

- Purpose: Record the authoritative decisions that shape the canonical documentation package.
- Audience: Technical leads, implementers, and coding agents.
- Authority: Canonical governance record.
- Owner: Project maintainers and implementation agents.
- In scope: Confirmed, inferred, proposed, and blocked decisions.
- Out of scope: Historical prose from the source documents.
- Read with: `.ai/conflict-register.md`, `.ai/33-assumptions-and-defaults.md`, `.ai/source-map.md`.

| ID | Title | Status | Source Files | Rationale | Impact | Downstream Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Canonical product is metadata API | Confirmed | `Media Metadata API Service - Node js TypeScript.md`, `Project Scope - Media Metadata API Service.md`, user clarification | Matches approved product direction and avoids mixing unrelated ingestion architectures into the project | High | All foundation and contract docs |
| DEC-002 | MVP is multi-tenant core | Confirmed | `deep-research-report.md`, user clarification | Tenant isolation is architecturally important even without tier enforcement | High | Auth, cache keys, jobs, logging |
| DEC-003 | MVP persistence is Redis-first | Confirmed | metadata-service source set, user clarification | Supports fast operational reads, snapshots, and local index without MongoDB-first coupling | High | Architecture, schema contracts, implementation order |
| DEC-004 | TMDB is the primary provider for lookup normalization and the only active search provider; official IMDb API is approved for lookup enrichment and `imdbId` fallback | Confirmed | Current implementation baseline, user clarification | Preserves a stable TMDB-first canonical model while enabling official IMDb-backed lookup completion without merged provider search complexity | High | Provider ports, normalization, API behavior |
| DEC-005 | Search model is hybrid | Confirmed | Mixed source set, user clarification | Allows provider-backed search plus local acceleration over fetched records | High | API contracts, Redis design, background refresh |
| DEC-006 | Local index covers fetched records only | Confirmed | user clarification | Keeps MVP ingestion realistic and bounded | High | Search contracts, refresh jobs, NFRs |
| DEC-007 | Ports-and-adapters architecture | Confirmed | `deep-research-report.md`, `Technical Specifications - Media Metadata API Service.md` | Best fit for provider churn and AI-agent maintainability | High | Folder structure, coding rules |
| DEC-008 | Node 24, strict TypeScript, SWC, BullMQ 5, Pino | Confirmed | `deep-research-report.md`, `Detailed Task Breakdown - Media Metadata API Service.md` | Newer baseline reduces immediate upgrade churn | Medium | Tech stack, bootstrap, ops docs |
| DEC-009 | Express stays behind an adapter boundary | Confirmed | `deep-research-report.md`, metadata-service technical docs | Keeps HTTP framework replaceable | Medium | Architecture, folder structure |
| DEC-010 | MongoDB is not part of canonical MVP | Confirmed | conflict between metadata-service source set and approved direction | Prevents mixed storage guidance | High | All storage and persistence docs |
| DEC-011 | `channel` is reserved but not implemented in MVP | Proposed | older metadata docs, provider mismatch | TMDB and IMDb do not provide a strong MVP channel path | Medium | Scope, API contracts, feature map |
| DEC-012 | Auth contract stays external behind a port | Proposed | metadata docs, deep research | Avoids inventing a concrete upstream auth schema | Medium | Domain boundaries, validation rules |
| DEC-013 | No broad field-level provider merge heuristics in MVP beyond IMDb `rating` override | Confirmed | approved plan | Prevents unstable canonical mapping while allowing the explicitly approved rating precedence rule | High | Domain model, normalization, acceptance criteria |
| DEC-014 | `.ai/*` is canonical; `.ai/initial/*` is historical only | Confirmed | project instructions | Prevents ambiguous source-of-truth behavior | High | README, agent rules, historical-doc handling |
