# Feature Map

- Purpose: Map user-visible and system-visible capabilities to their owning subsystems.
- Audience: Backend engineers, product reviewers, and coding agents.
- Authority: Canonical implementation document.
- Owner: Project maintainers and implementation agents.
- In scope: Capability list, scope status, and subsystem ownership.
- Out of scope: Task-by-task implementation ordering.
- Read with: `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/15-feature-implementation-order.md`.

| Capability | Status | Primary Owner | Dependencies |
| --- | --- | --- | --- |
| Bearer auth validation | Confirmed MVP | Auth adapter and request boundary | External auth service, Redis |
| Tenant-aware request context | Confirmed MVP | Auth and application layers | Auth validation, request middleware |
| Movie lookup by ID | Confirmed MVP | Lookup application flow | Providers, Redis snapshots |
| TV show lookup by ID | Confirmed MVP | Lookup application flow | Providers, Redis snapshots |
| Search by query | Confirmed MVP | Search application flow | Providers, Redis search snapshots, local index |
| Local fetched-record index | Confirmed MVP | Redis store and refresh flow | Canonical records, search contracts |
| Background stale refresh | Confirmed MVP | BullMQ worker flow | Providers, Redis, jobs |
| Hot-record warmup | Proposed MVP default | Refresh flow | Popularity counters, jobs |
| Channel metadata | Proposed post-MVP | Future provider boundary | Channel-capable provider |
| Commercial quota tiers | Confirmed post-MVP | Policy layer | Product decision |
