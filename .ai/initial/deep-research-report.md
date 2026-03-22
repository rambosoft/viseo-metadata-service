> # DEPRECATED / SUPERSEDED
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/README.md`, `.ai/03-tech-stack.md`, `.ai/04-architecture-overview.md`, `.ai/10-coding-standards.md`, `.ai/11-design-patterns.md`, `.ai/16-integration-rules.md`, `.ai/34-non-functional-requirements.md`
> NOTE: the canonical implementation guidance now lives under `.ai/*`. This preserved file remains only for historical traceability.
# Futureâ€‘Proof Highâ€‘Performance Node.js Caching and Indexing Server Conventions for 2026

Download: [future-proof-node-caching-indexing-2026.md](sandbox:/mnt/data/future-proof-node-caching-indexing-2026.md)

This report focuses on â€œupgrade-resilientâ€ conventions: choices that reduce forced rewrites when Node/TypeScript/runtime tooling evolves, when multiâ€‘tenant scale increases, and when performance/SLO targets (like subâ€‘20ms pagination and <50ms search) become harder to sustain.

The north star is to make the system **adaptable at the edges (HTTP, Redis client, upstream source clients, job queue, observability)** while keeping the **core indexing/caching rules stable and testable**.

## Compatibility baseline for 2026

The quickest way to â€œaccidentally rewrite laterâ€ is to lock onto components that are about to age out, then build assumptions into your architecture (timers, syntax, module system, queue behaviors, Redis script semantics, etc.). In 2026, the safest baseline is: **prefer the newest LTS lines (runtime and libraries), and isolate anything that tends to churn behind adapters**.

**Node.js runtime strategy**
- As of March 2026, **Node.js 20 reaches endâ€‘ofâ€‘life on 2026â€‘04â€‘30**. That makes â€œNode 20+â€ a risky base if youâ€™re starting now; youâ€™ll be forced to upgrade almost immediately. îˆ€citeîˆ‚turn12view0îˆ  
- **Node.js 24 is Active LTS** (and has a longer runway than Node 22), so itâ€™s the more futureâ€‘proof stepâ€‘zero for production deployments in 2026. îˆ€citeîˆ‚turn12view0îˆ  
- Nodeâ€™s own release cadence is still evolving (including a published schedule change in March 2026), which is exactly why *pinning to LTS* and keeping runtime assumptions shallow matters. îˆ€citeîˆ‚turn1search16îˆ  

**Express strategy**
- îˆ€entityîˆ‚["organization","Express","nodejs web framework"]îˆ major lines **v4.x** and **v5.x** are both â€œongoingâ€ in the official support table, but **v5.x requires Node >= 18** and is explicitly the modern line. îˆ€citeîˆ‚turn13view0îˆ‚turn0search9îˆ  
- If you keep Express 4, the â€œfutureâ€‘proofâ€ convention is: *stay on the latest 4.x patch*, and keep an internal HTTP adapter boundary so you can move to Express 5 (or another server framework) without rewriting business logic. îˆ€citeîˆ‚turn13view0îˆ  

**HTTP client strategy (undici vs Axios)**
- Nodeâ€™s builtâ€‘in `fetch()` is powered by **Undici**, making it the default choice for â€œno extra dependencyâ€ outbound HTTP in modern Node. îˆ€citeîˆ‚turn0search0îˆ  
- Use the standalone **Undici** module when you need more control (pooling/tuning APIs beyond what Nodeâ€™s internal fetch exposes). îˆ€citeîˆ‚turn0search4îˆ‚turn14search9îˆ  

**TypeScript and the â€œnear futureâ€**
- îˆ€entityîˆ‚["company","Microsoft","TypeScript publisher"]îˆâ€™s TypeScript blog indicates that **TypeScript 6.0 is in Release Candidate** territory in early 2026, with the ecosystem preparing for significant compiler evolution. îˆ€citeîˆ‚turn15search3îˆ  
- Thereâ€™s an active proposal to make `--strict` the default behavior in a future major (discussed on the TypeScript issue tracker). Treat this as a warning: strictness will become more â€œdefault,â€ not less, so building today in strict mode reduces migration pain later. îˆ€citeîˆ‚turn0search16îˆ‚turn0search5îˆ‚turn0search28îˆ  

**Queues and logging in 2026 (version reality check)**
- BullMQ v3â€™s changelog shows its releases concentrated in 2023. Meanwhile, npm shows BullMQ **v5.x is current** (published in March 2026). If you want futureâ€‘proofing, adopt the actively maintained major early. îˆ€citeîˆ‚turn15search1îˆ‚turn15search21îˆ  
- Pino has continued active releases (v10.x early 2026). If youâ€™re still on Pino 8, plan a controlled upgrade pathâ€”especially because modern Pino strongly leans on workerâ€‘thread transports for performance. îˆ€citeîˆ‚turn15search2îˆ‚turn14search4îˆ  

## Architecture that wonâ€™t require rewrites

Futureâ€‘proofing is less about microâ€‘optimizing today and more about **keeping the â€œthings that changeâ€ from infecting the â€œthings that should stay stable.â€** For this stack and your project goals (multiâ€‘tenant, heavy caching/indexing, proxying upstream sources), the most robust convention is a **portsâ€‘andâ€‘adapters** style.

A practical structure (you can keep it lightweightâ€”this is about boundaries, not ceremony):

```
src/
  core/                 # pure business rules; no Express/Redis/BullMQ imports
  ports/                # interfaces: CachePort, QueuePort, SourcePort, Clock, etc.
  adapters/
    http-express/
    cache-redis/
    queue-bullmq/
    source-xtream/
    source-m3u/
  config/
  telemetry/
  bootstrap/
```

### Multi-tenant invariants as a â€œhard ruleâ€
Multiâ€‘tenant systems fail in predictable ways: crossâ€‘tenant data leakage, noisyâ€‘neighbor incidents, and tenantâ€‘specific edge cases that accidentally become global behavior.

Two reference frames that help you avoid these failure modes:

- îˆ€entityîˆ‚["company","Amazon Web Services","cloud provider"]îˆâ€™ SaaS guidance frames tenant isolation in **silo / pool / bridge** models. A cache/index intermediary like yours typically wants **pool or bridge**: shared infrastructure efficiency with explicit enforcement points for isolation. îˆ€citeîˆ‚turn11search4îˆ‚turn11search0îˆ  
- îˆ€entityîˆ‚["organization","OWASP","security nonprofit"]îˆâ€™s multiâ€‘tenant cheat sheet is a practical reminder that tenant isolation must be enforced consistently across the applicationâ€”not just â€œin the database.â€ îˆ€citeîˆ‚turn11search13îˆ  

### Tenant context as a first-class value
Make â€œtenant contextâ€ something that cannot be skipped:
- Derived from auth token verification (and possibly upstreamâ€‘token state).
- Attached to every cache key decision.
- Attached to every BullMQ job payload and queue naming scheme.
- Attached to every log line and trace/span attribute.

In Node, **AsyncLocalStorage** (ALS) is a conventional way to carry request context without parameterâ€‘drilling; itâ€™s stable and explicitly described as requestâ€‘lifetime state propagation, similar to threadâ€‘local storage. îˆ€citeîˆ‚turn14search1îˆ  
If you adopt ALS for tenant context, treat it as **an implementation detail**, not the only guardrailâ€”your code should still validate tenant ownership at the boundary of each â€œdangerousâ€ operation (cache reads/writes, index reads, token refresh). îˆ€citeîˆ‚turn11search13îˆ  

## Runtime performance conventions for Node.js in 2026

Your target latencies imply a â€œthin request path.â€ In practice: **request handlers should mostly do I/O + small transforms**, not large parsing/indexing computations.

### Donâ€™t block the event loop
Nodeâ€™s own guidance is direct: blocking the event loop harms throughput/latency; differentiate CPUâ€‘intensive work from I/Oâ€‘intensive work and offload appropriately. îˆ€citeîˆ‚turn1search31îˆ  

For your project, common CPUâ€‘heavy tasks include:
- parsing and normalizing large M3U/M3U8 playlists,
- building/searching large inâ€‘memory fuzzy indexes,
- compression/decompression of large payloads (especially Brotli at high levels),
- string tokenization/stemming (if you use NLPâ€‘ish logic).

### Worker threads for CPU-intensive steps
Nodeâ€™s `worker_threads` docs explicitly position workers for CPUâ€‘intensive JavaScript operations (and note they donâ€™t help much for I/O). That aligns well with â€œparse/build index off the request path.â€ îˆ€citeîˆ‚turn1search3îˆ  

A futureâ€‘proof convention:
- Keep the API process â€œI/Oâ€‘first.â€
- Use a bounded workerâ€‘pool (inâ€‘process) or BullMQ workers (outâ€‘ofâ€‘process) for CPU steps.
- Make CPU work **cancellable** (time budget + abort signals), so backlog doesnâ€™t explode during upstream slowdowns.

### Clustering and process model
If you run on a single host and want vertical scaling, **PM2 cluster mode** is a practical choice for multiâ€‘core utilization. PM2â€™s docs highlight the need for **graceful shutdown** so reloads donâ€™t fail or create downtime. îˆ€citeîˆ‚turn7search2îˆ‚turn7search5îˆ  

Your futureâ€‘proof convention here is: all longâ€‘lived resources (HTTP server, Redis connections, BullMQ workers) must have explicit `close()` behavior, and must close on `SIGTERM`/`SIGINT`. BullMQâ€™s production guidance explicitly recommends listening for these signals to close workers gracefully. îˆ€citeîˆ‚turn4search5îˆ  

### Timeouts, keep-alive, and resource exhaustion
Nodeâ€™s security best practices explicitly recommend correctly configuring server timeouts (including `headersTimeout`, `requestTimeout`, `keepAliveTimeout`) and using a reverse proxy as part of DoS resilience. îˆ€citeîˆ‚turn7search30îˆ  

Also: Nodeâ€™s HTTP docs describe how connection pooling and keepâ€‘alive behavior works for clients (`http.Agent`)â€”useful when youâ€™re designing aggressive upstream polling/refresh behavior. îˆ€citeîˆ‚turn14search33îˆ  

A practical convention set:
- **Incoming:** configure HTTP server timeouts explicitly (donâ€™t rely on defaults). îˆ€citeîˆ‚turn7search30îˆ  
- **Outgoing:** always bound time spent per upstream request; prefer pooled clients for repetitive upstream hosts. îˆ€citeîˆ‚turn0search4îˆ‚turn14search9îˆ  
- **Budgets:** treat Redis calls as â€œbest effort fast path.â€ If Redis is degraded, your API should fail fast or serve stale (depending on endpoint tolerance), not hang.

## TypeScript, SWC, and contracts that donâ€™t drift

You want to avoid future rewrites. In TypeScript backends, the biggest rewrite triggers are:
- module system churn (CJS vs ESM),
- type safety drifting from runtime reality,
- build tooling evolving faster than the codebase,
- test runner friction (especially with ESM).

### Strictness as a long-term hedge
`strictNullChecks` prevents â€œnull/undefined ignoredâ€ behavior and forces explicit handlingâ€”this tends to reduce production surprises at scale. îˆ€citeîˆ‚turn0search16îˆ  
Keep strict mode on, and treat strictness failures as â€œarchitecture feedback,â€ not inconvenience.

### SWC for speed, TypeScript for correctness
SWC provides fast transforms and supports source maps (important for production debugging). îˆ€citeîˆ‚turn1search1îˆ‚turn1search21îˆ  

Futureâ€‘proof build convention:
- SWC compiles TS â†’ JS (`dist/`) for speed.
- `tsc --noEmit` runs in CI (and optionally preâ€‘commit) for type correctness.
- Always ship sourcemaps in staging, and optionally in prod behind access control.

Example `.swcrc` (illustrative):

```json
{
  "jsc": { "parser": { "syntax": "typescript" } },
  "sourceMaps": true
}
```

SWCâ€™s core API returns code and (optionally) a source map, reinforcing that source maps are a firstâ€‘class part of the pipeline. îˆ€citeîˆ‚turn1search1îˆ  

### Development runtime: ts-node is dev-only
ts-nodeâ€™s docs warn that Nodeâ€™s ESM loader hooks are experimental and that ts-nodeâ€™s ESM support relies on APIs that can break across Node versions; it is not recommended for production. îˆ€citeîˆ‚turn1search26îˆ  

Futureâ€‘proof convention:
- Use ts-node in dev only.
- Production runs compiled JS.

### ESM: decide deliberately, and align tests accordingly
Jestâ€™s docs still call ESM support experimental (both in general and specifically in configuration guidance). îˆ€citeîˆ‚turn10search11îˆ‚turn10search3îˆ  

That leads to a practical, futureâ€‘proof choice:
- If you want **lowest friction**, keep production output as CJS for now (especially if you need Jest + ts-jest + legacy libs).
- If you want **ESM everywhere**, accept that you need stricter tooling discipline and occasional test/config churn.

### Runtime validation: Zod or Joi at boundaries
TypeScript types are erased at runtime. For a multiâ€‘tenant ingestion system that consumes untrusted upstream data, runtime validation is a nonâ€‘negotiable performance and security feature (it prevents â€œpoisoned cacheâ€ and reduces weird downstream behavior).

- Zod explicitly documents that object schemas **strip unknown keys by default**, and you can disallow unknown keys with `.strict()`. Thatâ€™s exactly the kind of massâ€‘assignment defense you want at every boundary. îˆ€citeîˆ‚turn6search0îˆ  
- Joiâ€™s API docs note that validation of preferences is *not performed automatically for performance reasons* and should be validated once and reusedâ€”useful when youâ€™re designing high-throughput middleware validators. îˆ€citeîˆ‚turn6search1îˆ  

A futureâ€‘proof convention is to define â€œcontractsâ€ once and reuse them:
- Request validation (HTTP)  
- Job payload validation (BullMQ)  
- Redis payload validation (decode + validate before use)  

If you want to go further (optional), keep an upgrade path to contract generation: tools exist to generate Zod schemas from OpenAPI specifications (actively updated as of March 2026). îˆ€citeîˆ‚turn6search11îˆ  

## Redis caching and indexing conventions for massive multi-tenancy

Your scaling constraints (10k tenants, 50kâ€“1M items each) mean Redis use must be **disciplined**: key design, memory policy, stampede control, and atomicity rules must be treated as part of the product.

### Choose redis client and topology based on your atomicity needs
- ioredis advertises firstâ€‘class support for **Cluster, Sentinel, pipelining, Lua scripting**, plus transparent key prefixing and Lua custom commands. îˆ€citeîˆ‚turn2search0îˆ  
- Redisâ€™ official docs provide a nodeâ€‘redis guide for connecting and using nodeâ€‘redis as the Redis client for Node.js. îˆ€citeîˆ‚turn2search5îˆ  

Topology reminder:
- Redis Sentinel provides high availability when not using Redis Cluster. îˆ€citeîˆ‚turn2search21îˆ  

Futureâ€‘proof convention:
- If you rely heavily on multiâ€‘key atomic operations (Lua across multiple keys), cluster constraints will shape your key design (more on that below). Choose Cluster vs Sentinel *early*, because it changes how you think about keys and scripts.

### Tenant-aware key naming is mandatory
îˆ€entityîˆ‚["company","Redis","in-memory database company"]îˆ explicitly recommends tenantâ€‘aware key naming patterns (example format like `tenant:{tenant-id}:{resource-type}:{resource-id}`) to reduce collisions and help avoid crossâ€‘tenant exposure when combined with ACLs and tenant-aware application logic. îˆ€citeîˆ‚turn11search5îˆ  

That aligns with a practical convention for your system:
- every key begins with a canonical tenant prefix,
- every â€œschemaâ€ is versioned (so you can change formats without flushing everything),
- every â€œdataset snapshotâ€ has a revision id (so rebuilds donâ€™t corrupt live reads).

### Lua scripts: atomic, but blocking, and cluster-sensitive
Redisâ€™ Lua scripting docs provide three core facts you should encode as â€œrulesâ€:
- Redis guarantees scripts execute atomically. îˆ€citeîˆ‚turn3view0îˆ  
- While a script runs, server activities are blocked for the scriptâ€™s full runtimeâ€”so slow scripts are a system-wide latency amplifier. îˆ€citeîˆ‚turn3view0îˆ  
- For correct execution in both standalone and Cluster, scripts should only access keys passed explicitly as key arguments; do not generate key names dynamically inside scripts. îˆ€citeîˆ‚turn3view0îˆ  

Redis script cache behavior also matters operationally:
- script cache is volatile; apps should use `EVALSHA` and handle `NOSCRIPT` by loading the script again. îˆ€citeîˆ‚turn3view0îˆ  
- `NOSCRIPT` is hard to handle safely in pipelined contexts, so donâ€™t â€œpipeline through first-use scripts.â€ îˆ€citeîˆ‚turn3view0îˆ  

ioredis cluster behavior adds an additional constraint:
- in Cluster mode, all keys in a pipeline should belong to the same slot because ioredis sends the pipeline to one node. îˆ€citeîˆ‚turn2search12îˆ  

**Futureâ€‘proof key design implication:**  
Design atomic operations so they touch either:
- a single key, or
- a small set of keys that intentionally share a hash slot,  
rather than â€œall keys for a tenant,â€ which can create hot shards and limit distribution.

### Stampede control is a required feature, not an optimization
Cache stampedes are a standard failure mode (especially with token refresh and hot paginated endpoints).

Two strong references you can base production patterns on:
- A VLDB paper (â€œOptimal Probabilistic Cache Stampede Preventionâ€) formalizes probabilistic early regeneration to prevent concurrent misses from triggering a regen storm. îˆ€citeîˆ‚turn11search3îˆ  
- îˆ€entityîˆ‚["company","Cloudflare","web infrastructure company"]îˆ describes a probabilityâ€‘based revalidation approach (â€œSometimes I cacheâ€) that reduces origin load while maintaining freshness behavior. îˆ€citeîˆ‚turn11search38îˆ  

A futureâ€‘proof â€œstampede toolkitâ€ convention set:
- TTL jitter on anything â€œbulk refreshedâ€
- staleâ€‘whileâ€‘revalidate for endpoints tolerant of slight staleness
- per-key singleflight/mutex for expensive rebuilds
- probabilistic early refresh for extremely hot keys

### Redis performance practices matter at this scale
Redisâ€™ own performance tuning FAQ highlights common latency causes (hot keys, dangerous use of MONITOR, clientâ€‘side pooling considerations). Even if you donâ€™t use every technique, the metaâ€‘lesson is: treat Redis as a performance system with its own observability and incident playbooks. îˆ€citeîˆ‚turn2search15îˆ  

## BullMQ ingestion and job conventions that scale

Given your goals (rebuild indexes, refresh tokens, ingest large catalogs), background jobs are not optionalâ€”theyâ€™re the only sane way to keep the request path fast.

### Why you should treat BullMQ v5 as the 2026 baseline
- The v3 changelog is anchored in 2023 releases. îˆ€citeîˆ‚turn15search1îˆ  
- npm shows BullMQ v5.x as current (published March 2026), which implies the ecosystem (and future docs, patterns, fixes) will be v5â€‘first. îˆ€citeîˆ‚turn15search21îˆ  

### Core production patterns to bake in
BullMQ documentation supports several â€œmust-haveâ€ operational conventions:

- `QueueScheduler` moves delayed jobs back to waiting at the correct time and checks for stalled jobs. îˆ€citeîˆ‚turn4search0îˆ  
- Jobs should be idempotent so retries donâ€™t corrupt state. îˆ€citeîˆ‚turn4search4îˆ  
- BullMQ supports retries with backoff strategies (fixed/exponential). îˆ€citeîˆ‚turn4search1îˆ  
- â€œGoing to productionâ€ guidance emphasizes graceful shutdown of workers on restart signals to reduce stalled jobs; it explicitly recommends listening for `SIGINT` and `SIGTERM`. îˆ€citeîˆ‚turn4search5îˆ  

BullMQ also documents that it uses ioredis and that connection options flow through to ioredisâ€”important when you need consistent Redis connection behavior across cache + jobs. îˆ€citeîˆ‚turn4search34îˆ  

### Snapshotting as the core ingestion design
This is the single highest-leverage convention for your project:

**Never rebuild in-place.**  
Build a new â€œrevisionâ€ (snapshot) of a tenantâ€™s catalog/index in the background, then atomically switch an â€œactive revision pointer.â€ Why itâ€™s future-proof:
- readers always see a consistent dataset,
- bad ingestions donâ€™t corrupt live reads,
- rollbacks are possible by flipping pointers,
- you can change internal index schema by bumping revision formats.

Redis + Lua makes the pointer switch atomic (with the Lua caveats already covered). îˆ€citeîˆ‚turn3view0îˆ  

## Observability, security, delivery, and AI-agent guardrails

Your systemâ€™s success hinges on maintaining low tail latency under churn: new tenants, upstream slowness, periodic refresh storms, Redis resharding, queue bursts. That requires observability and security conventions that donâ€™t create new performance problems.

### Logging that doesnâ€™t tank p99
Pinoâ€™s own guidance is explicit: run log processors (â€œtransportsâ€) in a worker thread via `pino.transport` to avoid overloading the main thread with log processing. îˆ€citeîˆ‚turn14search4îˆ‚turn14search2îˆ  

Also, the `debug` module remains a pragmatic convention for moduleâ€‘scoped diagnostics toggled via environment variables (namespaces). îˆ€citeîˆ‚turn5search2îˆ  

Futureâ€‘proof logging conventions:
- JSON logs only in production
- strict redaction rules (tokens, credentials, tenant secrets)
- request/tenant correlation id on every log line using AsyncLocalStorage îˆ€citeîˆ‚turn14search1îˆ  
- log sampling knobs (so â€œdebug stormsâ€ donâ€™t become an incident)

### Tracing and correlation with OpenTelemetry
îˆ€entityîˆ‚["organization","OpenTelemetry","observability project"]îˆâ€™s logs spec states that OpenTelemetry extends correlation to logs by including `TraceId` and `SpanId` in log records where possible, enabling direct correlation of logs and traces. îˆ€citeîˆ‚turn9search8îˆ  
Its context propagation docs also describe automatic log/trace correlation via context injection. îˆ€citeîˆ‚turn9search20îˆ  

For Node specifically:
- The OpenTelemetry Node.js getting-started page notes JS logs support is still developing (â€œlogging library â€¦ still under developmentâ€), so plan tracing + metrics first, and use logger bridges (Pino/Winston instrumentations) for correlation where needed. îˆ€citeîˆ‚turn9search0îˆ  
- Instrumentation packages for Express and Pino exist and are actively updated (March 2026). îˆ€citeîˆ‚turn9search2îˆ‚turn8search18îˆ  

### Containerization and process lifecycle conventions
Dockerâ€™s official best practices recommend multiâ€‘stage builds to reduce final image size and keep only runtime necessities. îˆ€citeîˆ‚turn7search27îˆ  
Dockerâ€™s Node.js containerization guide explicitly calls out multi-stage builds and non-root runtime as part of a production-ready image. îˆ€citeîˆ‚turn7search23îˆ  

Nodeâ€™s own docker image best practices point out that using `CMD ["node", ...]` (instead of running via npm scripts) improves signal handling because `SIGTERM`/`SIGINT` reach the Node process directly instead of being swallowed by npm. îˆ€citeîˆ‚turn7search15îˆ  

### Multi-tenant security and isolation
Treat tenant isolation as a security control, not just a naming convention:
- enforce tenant context on every operation,
- prevent cross-tenant key access,
- validate that request-scoped tenant context canâ€™t be overridden by query/body inputs.

îˆ€entityîˆ‚["company","Microsoft","cloud provider"]îˆâ€™s Azure multi-tenant Redis guidance explicitly frames tenant isolation requirements and suggests key prefixes as a primary mechanism in shared cache scenarios. îˆ€citeîˆ‚turn11search9îˆ  
OWASPâ€™s multi-tenant guidance provides a broader checklist mindset for preventing crossâ€‘tenant attacks. îˆ€citeîˆ‚turn11search13îˆ  

### AI agent as developer: productivity with guardrails
If you incorporate an AI agent into your development workflow (or build internal â€œops assistantsâ€), treat it as a highâ€‘impact supply chain component.

Two authoritative guardrail sources:
- OWASPâ€™s Top 10 for LLM applications enumerates categories like prompt injection, insecure output handling, model DoS, and supply chain vulnerabilitiesâ€”these map directly to how dev agents can be attacked or misused. îˆ€citeîˆ‚turn8search0îˆ  
- îˆ€entityîˆ‚["organization","NIST","us standards institute"]îˆâ€™s AI Risk Management Framework (AI RMF 1.0) is designed to help organizations manage risks across the AI lifecycle, and NIST also publishes a Generative AI companion profile. Use these to structure governance, evaluation, and â€œwhat is acceptable agent autonomy.â€ îˆ€citeîˆ‚turn8search1îˆ‚turn8search9îˆ  

A futureâ€‘proof â€œAI agent usage policyâ€ convention set:
- **No direct secrets access** (agent never sees raw prod tokens/credentials).
- **Least privilege tools** (agent can propose diffs; CI applies them; prod access is separate).
- **Human review for behavior changes** (especially cache semantics, auth, tenant isolation).
- **Agent output treated as untrusted** (validated by tests, linters, security checks).
- **Prompt-injection resistance** for any agent that reads external content (playlists, upstream metadata, tickets). îˆ€citeîˆ‚turn8search0îˆ  

Finally: secure software supply chain practices apply even more when code is AI-assisted. Frameworks like SLSA define supply-chain integrity controls (provenance, tamper resistance) that reduce the chance a â€œhelpful automationâ€ becomes an incident vector. îˆ€citeîˆ‚turn8search3îˆ‚turn8search23îˆ
> # DEPRECATED
> SUPERSEDED BY: `.ai/README.md`, `.ai/03-tech-stack.md`, `.ai/04-architecture-overview.md`, `.ai/10-coding-standards.md`, `.ai/11-design-patterns.md`, `.ai/16-integration-rules.md`, `.ai/32-risk-register.md`, `.ai/34-non-functional-requirements.md`
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/*` canonical docs instead
> NOTE: this file is preserved only for historical traceability.

