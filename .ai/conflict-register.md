# Conflict Register

- Purpose: Record the material conflicts and ambiguities discovered in `.ai/initial/*`.
- Audience: Technical reviewers, maintainers, and coding agents.
- Authority: Canonical governance record.
- Owner: Project maintainers and implementation agents.
- In scope: Source conflicts, risk level, recommended resolution, and clarification status.
- Out of scope: Full source text.
- Read with: `.ai/audit-report.md`, `.ai/decision-register.md`, `.ai/source-map.md`.

| ID | Topic | Involved Files | Summary Of Conflict | Risk | Recommended Resolution | Clarification Needed |
| --- | --- | --- | --- | --- | --- | --- |
| CON-001 | Product definition | `deep-research-report.md`, metadata-service source set | Research guidance points toward a broad indexing server style while the metadata-service docs define a focused metadata API | High | Use metadata API as canonical product and keep research guidance only where it improves the approved design | No |
| CON-002 | Persistence model | `Project Scope - Media Metadata API Service.md`, `Technical Specifications - Media Metadata API Service.md`, `deep-research-report.md` | MongoDB-first canonical persistence conflicts with Redis-first snapshots and indexes | High | Use Redis-first MVP model and remove MongoDB from canonical implementation docs | No |
| CON-003 | Search strategy | metadata-service source set, `deep-research-report.md` | Search is described both as provider-backed query flow and as index-heavy local acceleration | High | Hybrid search with local index only over fetched records and cached search results | No |
| CON-004 | Runtime baseline | older metadata doc, `deep-research-report.md`, `Detailed Task Breakdown - Media Metadata API Service.md` | Node 20 / BullMQ 3 / Express 4 guidance conflicts with Node 24 / BullMQ 5 / Express 5 baseline | Medium | Adopt the newer 2026 baseline | No |
| CON-005 | HTTP client choice | older docs, deep research | Axios appears in older examples while newer guidance favors built-in fetch/Undici | Low | Standardize on fetch/Undici in canonical docs | No |
| CON-006 | Logging choice | older docs, newer docs, deep research | Winston-or-Pino ambiguity remains in older docs | Low | Standardize on Pino JSON logging | No |
| CON-007 | `channel` support | older metadata docs, approved provider scope | Source includes channel endpoints, but approved providers do not offer a strong channel metadata path | Medium | Reserve the kind in domain language but keep it out of MVP implementation | No |
| CON-008 | Canonical source status | `deep-research-report.md` | A historical file already claimed to be superseded by `.ai/*` files that did not exist | High | Create real canonical docs and repoint every historical file to them | No |
