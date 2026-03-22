# Risk Register

- Purpose: Record the primary risks and the expected mitigations for MVP.
- Audience: Technical leads, reviewers, and coding agents.
- Authority: Canonical quality document.
- Owner: Project maintainers and implementation agents.
- In scope: Product, technical, and operational risks.
- Out of scope: Organization-wide enterprise risk policy.
- Read with: `.ai/24-error-handling.md`, `.ai/34-non-functional-requirements.md`.

| Risk | Status | Impact | Mitigation |
| --- | --- | --- | --- |
| Provider rate limits | Confirmed | High | Cache aggressively, deduplicate misses, use refresh jobs |
| Provider schema drift | Confirmed | High | Validate all payloads and isolate provider mappers |
| Cross-tenant leakage | Confirmed | High | Tenant-aware keys, auth-derived tenant context, log correlation |
| Redis memory pressure | Confirmed | High | Versioned keys, bounded TTLs, cleanup jobs, fetched-record-only local index |
| Stale historical guidance reuse | Confirmed | Medium | Canonical `.ai/*` package and deprecation banners on `.ai/initial/*` |
| Channel scope creep | Proposed | Medium | Keep channel as post-MVP until a suitable provider exists |
