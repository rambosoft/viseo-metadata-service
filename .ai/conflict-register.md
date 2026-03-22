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
| CON-001 | Persistence model | `Project Scope - Media Metadata API Service.md`, `Technical Specifications - Media Metadata API Service.md` | MongoDB-first canonical persistence conflicts with the approved Redis-first MVP direction | High | Use Redis-first MVP model and remove MongoDB from canonical implementation docs | No |
| CON-002 | Search strategy | metadata-service source set | Search is described both as provider-backed query flow and as local acceleration through cached and fetched-record state | High | Hybrid search with local index only over fetched records and cached search results | No |
| CON-003 | Runtime baseline | older metadata doc, `Detailed Task Breakdown - Media Metadata API Service.md` | Node 20 / BullMQ 3 / Express 4 guidance conflicts with Node 24 / BullMQ 5 / Express 5 baseline | Medium | Adopt the newer 2026 baseline | No |
| CON-004 | HTTP client choice | older metadata docs | Axios appears in older examples while newer guidance favors built-in fetch/Undici | Low | Standardize on fetch/Undici in canonical docs | No |
| CON-005 | Logging choice | older metadata docs, newer metadata docs | Winston-or-Pino ambiguity remains in older docs | Low | Standardize on Pino JSON logging | No |
| CON-006 | `channel` support | older metadata docs, approved provider scope | Source includes channel endpoints, but approved providers do not offer a strong channel metadata path | Medium | Reserve the kind in domain language but keep it out of MVP implementation | No |
